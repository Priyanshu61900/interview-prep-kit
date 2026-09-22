import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { KitModel } from "@/lib/models/Kit";
import { requireUserId, AuthError } from "@/lib/auth";
import { handleApiError, errorJson } from "@/lib/apiResponse";
import { generateJson, LlmError } from "@/lib/llm/provider";
import { buildCompanyBriefPrompt, COMPANY_BRIEF_SYSTEM } from "@/lib/llm/prompts";
import { generateQuestionsForCategory, planCategories } from "@/lib/pipeline/generateQuestions";
import { buildSchedule } from "@/lib/pipeline/schedule";
import { buildCoverage } from "@/lib/pipeline/coverage";
import { isReplaceable } from "@/lib/kitService";
import type { Question, QuestionCategory } from "@/types/kit";

export const runtime = "nodejs";
export const maxDuration = 45;

const SECTIONS = ["company_brief", "schedule", "technical", "behavioural", "system-design", "company-fit"] as const;

const bodySchema = z.object({
  section: z.enum(SECTIONS),
  force: z.boolean().optional(),
  days: z.coerce.number().int().min(1).max(120).optional(),
});

function nextQuestionIndex(questions: Question[]): number {
  const max = questions.reduce((m, q) => {
    const n = Number(q.id.replace(/^q/, ""));
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return max + 1;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = requireUserId(request);
    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return errorJson("INVALID_INPUT", parsed.error.issues[0]?.message ?? "Invalid input", 400);

    await connectToDatabase();
    const doc = await KitModel.findById(id);
    if (!doc) return errorJson("NOT_FOUND", "Kit not found.", 404);
    if (String(doc.ownerId) !== userId) throw new AuthError("You do not have access to this kit.");
    if (!doc.kit) return errorJson("NOT_READY", "This kit has not finished generating yet.", 409);
    if (doc.status === "generating") return errorJson("ALREADY_GENERATING", "This kit is still generating. Try again once it finishes.", 409);

    const { section, force, days } = parsed.data;
    const research = doc.research ?? { companyName: doc.kit.source.company, aboutText: "", hiringText: "", hiringProcessNotes: "", pagesUsed: [] };

    if (section === "company_brief") {
      if (!isProtectedOverride(doc.meta.brief_meta, force)) {
        return errorJson("EDITS_WOULD_BE_LOST", "The company brief has been manually edited. Pass force:true to overwrite it.", 409);
      }
      try {
        const hasSource = Boolean(research.aboutText || research.hiringText);
        const brief = hasSource
          ? await generateJson<{ summary: string; what_they_do: string }>({
              system: COMPANY_BRIEF_SYSTEM,
              prompt: buildCompanyBriefPrompt(research.companyName, research.aboutText, research.hiringText),
              temperature: 0.3,
            })
          : { summary: "Limited public information was found about this company from the site provided.", what_they_do: "" };
        doc.kit.company_brief = { summary: brief.summary?.trim() || "", what_they_do: brief.what_they_do?.trim() || "", sources: research.pagesUsed };
        doc.meta.brief_meta = { origin: "generated", updated_at: new Date().toISOString() };
      } catch (err) {
        return errorJson(err instanceof LlmError ? err.code : "REGENERATION_FAILED", `Could not regenerate the company brief: ${describeError(err)}`, 502);
      }
    } else if (section === "schedule") {
      if (!isProtectedOverride(doc.meta.schedule_meta, force)) {
        return errorJson("EDITS_WOULD_BE_LOST", "The schedule has been manually edited. Pass force:true to overwrite it.", 409);
      }
      const daysAvailable = days ?? doc.daysRequested;
      doc.kit.schedule = buildSchedule(doc.kit.role.requirements, doc.kit.questions, daysAvailable);
      doc.daysRequested = daysAvailable;
      doc.meta.schedule_meta = { origin: "generated", updated_at: new Date().toISOString() };
    } else {
      const category = section as QuestionCategory;
      const plan = planCategories(doc.kit.role.requirements, doc.kit.role.seniority, research.hiringProcessNotes);
      const requirements = plan[category];
      if (!requirements || !requirements.length) {
        return errorJson("NO_REQUIREMENTS_FOR_CATEGORY", `No requirements map to the "${category}" category for this role.`, 400);
      }

      try {
        const raw = await generateQuestionsForCategory(category, requirements, {
          companyContext: `${doc.kit.company_brief.summary}\n${doc.kit.company_brief.what_they_do}`,
          hiringProcessNotes: research.hiringProcessNotes,
        });

        const keep = doc.kit.questions.filter((q) => q.category !== category || !isReplaceable(doc.meta.question_meta[q.id]));
        const removedIds = new Set(doc.kit.questions.filter((q) => q.category === category && isReplaceable(doc.meta.question_meta[q.id])).map((q) => q.id));

        let idx = nextQuestionIndex(doc.kit.questions);
        const fresh: Question[] = raw.map((q) => ({ ...q, id: `q${idx++}` }));
        const now = new Date().toISOString();
        for (const q of fresh) doc.meta.question_meta[q.id] = { origin: "generated", updated_at: now };
        for (const removedId of removedIds) delete doc.meta.question_meta[removedId];

        doc.kit.questions = [...keep, ...fresh];
        doc.kit.coverage = buildCoverage(doc.kit.role.requirements, doc.kit.questions, doc.kit.coverage.passes + 1);

        // Keep the schedule referentially valid: rebuild it if untouched by
        // the user, otherwise strip now-missing ids but leave their layout alone.
        if (isReplaceable(doc.meta.schedule_meta)) {
          doc.kit.schedule = buildSchedule(doc.kit.role.requirements, doc.kit.questions, doc.daysRequested);
        } else {
          doc.kit.schedule.days = doc.kit.schedule.days.map((d) => ({
            ...d,
            question_ids: d.question_ids.filter((qid) => !removedIds.has(qid)),
          }));
        }
      } catch (err) {
        return errorJson(err instanceof LlmError ? err.code : "REGENERATION_FAILED", `Could not regenerate ${category} questions: ${describeError(err)}`, 502);
      }
    }

    doc.markModified("kit");
    doc.markModified("meta");
    await doc.save();
    return NextResponse.json({ kit: { id: String(doc._id), kit: doc.kit, meta: doc.meta, status: doc.status } });
  } catch (err) {
    return handleApiError(err);
  }
}

function isProtectedOverride(meta: { origin: string } | null | undefined, force?: boolean): boolean {
  if (!meta || meta.origin === "generated") return true;
  return Boolean(force);
}

function describeError(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
