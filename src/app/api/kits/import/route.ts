import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { KitModel } from "@/lib/models/Kit";
import { requireUserId } from "@/lib/auth";
import { handleApiError, errorJson } from "@/lib/apiResponse";
import { computeContentHash, initialMetaFor } from "@/lib/kitService";
import { runPipeline, PipelineError } from "@/lib/pipeline/pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PAIRS = 20;

const caseSchema = z.object({
  jd: z.string().trim().min(1).max(20000),
  company_url: z.string().trim().url(),
  days: z.coerce.number().int().min(1).max(120),
});

/**
 * Bulk kit creation: the interface's equivalent of preparing for more than
 * one role at once. Accepts an uploaded JSON file — an array of
 * {jd, company_url, days} pairs, the same shape the batch CLI (Section 9)
 * consumes — and creates one kit per entry. Generation is kicked off
 * sequentially, not in parallel, so a batch of five doesn't blow through the
 * LLM provider's per-minute rate limit in the first few seconds.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = requireUserId(request);
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!file || typeof file === "string") {
      return errorJson("INVALID_INPUT", "Upload a JSON file containing an array of job description / company URL pairs.", 400);
    }

    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      return errorJson("INVALID_INPUT", "That file is not valid JSON.", 400);
    }

    const arraySchema = z.array(caseSchema).min(1).max(MAX_PAIRS);
    const parsed = arraySchema.safeParse(raw);
    if (!parsed.success) {
      return errorJson("INVALID_INPUT", `File does not match the expected shape: ${parsed.error.issues[0]?.message ?? "invalid"}`, 400);
    }

    await connectToDatabase();

    const created: { id: string; company_url: string }[] = [];
    for (const entry of parsed.data) {
      const contentHash = computeContentHash(entry.jd, entry.company_url, entry.days);
      const existing = await KitModel.findOne({ ownerId: userId, contentHash, status: { $ne: "failed" } });
      if (existing) {
        created.push({ id: String(existing._id), company_url: entry.company_url });
        continue;
      }
      const doc = await KitModel.create({
        ownerId: userId,
        title: `${entry.company_url} — generating…`,
        status: "generating",
        jd: entry.jd,
        companyUrl: entry.company_url,
        daysRequested: entry.days,
        contentHash,
        meta: { question_meta: {}, flashcard_meta: {}, brief_meta: null, schedule_meta: null, skipped_sources: [], practice_attempts: [] },
      });
      created.push({ id: String(doc._id), company_url: entry.company_url });
    }

    const pending = created.filter((c, i) => parsed.data[i] && c);

    after(async () => {
      for (let i = 0; i < parsed.data.length; i++) {
        const entry = parsed.data[i];
        const kitId = pending[i]?.id;
        if (!kitId) continue;
        try {
          const result = await runPipeline({ jd: entry.jd, companyUrl: entry.company_url, days: entry.days });
          await KitModel.findByIdAndUpdate(kitId, {
            status: result.kit.coverage.uncovered_requirement_ids.length > 0 ? "partial" : "ready",
            title: `${result.kit.role.title || "Untitled role"} @ ${result.kit.source.company || entry.company_url}`,
            kit: result.kit,
            meta: initialMetaFor(result.kit),
            research: result.research,
            warnings: result.warnings,
            generationError: null,
          });
        } catch (err) {
          const message = err instanceof PipelineError ? err.message : err instanceof Error ? err.message : String(err);
          await KitModel.findByIdAndUpdate(kitId, { status: "failed", generationError: message });
        }
      }
    });

    return NextResponse.json({ created }, { status: 202 });
  } catch (err) {
    return handleApiError(err);
  }
}
