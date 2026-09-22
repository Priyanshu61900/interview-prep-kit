import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { KitModel } from "@/lib/models/Kit";
import { requireUserId } from "@/lib/auth";
import { handleApiError } from "@/lib/apiResponse";
import { computeContentHash, initialMetaFor } from "@/lib/kitService";
import { runPipeline, PipelineError } from "@/lib/pipeline/pipeline";

export const runtime = "nodejs";
export const maxDuration = 60;

const createSchema = z.object({
  jd: z.string().trim().min(1, "Paste the job description first").max(20000),
  company_url: z.string().trim().url("Enter a valid company website URL"),
  days: z.coerce.number().int().min(1).max(120),
});

export async function GET(request: NextRequest) {
  try {
    const userId = requireUserId(request);
    await connectToDatabase();
    const kits = await KitModel.find({ ownerId: userId })
      .sort({ createdAt: -1 })
      .select("title status generationError jd companyUrl daysRequested kit.source.company kit.source.role kit.coverage createdAt updatedAt")
      .lean();

    return NextResponse.json({
      kits: kits.map((k) => ({
        id: String(k._id),
        title: k.title,
        status: k.status,
        error: k.generationError,
        company: k.kit?.source?.company ?? null,
        role: k.kit?.source?.role ?? null,
        uncoveredCount: k.kit?.coverage?.uncovered_requirement_ids?.length ?? null,
        createdAt: k.createdAt,
        updatedAt: k.updatedAt,
      })),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = requireUserId(request);
    const parsed = createSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Invalid input" } }, { status: 400 });
    }
    const { jd, company_url, days } = parsed.data;

    await connectToDatabase();

    const contentHash = computeContentHash(jd, company_url, days);
    const duplicate = await KitModel.findOne({ ownerId: userId, contentHash }).sort({ createdAt: -1 }).lean();
    if (duplicate) {
      return NextResponse.json(
        {
          duplicate: true,
          id: String(duplicate._id),
          status: duplicate.status,
          message: "You already created a kit for this exact job description, company, and timeframe. Reopening it instead of generating a new one.",
        },
        { status: 200 }
      );
    }

    const kitDoc = await KitModel.create({
      ownerId: userId,
      title: `${company_url} — generating…`,
      status: "generating",
      jd,
      companyUrl: company_url,
      daysRequested: days,
      contentHash,
      meta: { question_meta: {}, flashcard_meta: {}, brief_meta: null, schedule_meta: null, skipped_sources: [], practice_attempts: [] },
    });

    const kitId = String(kitDoc._id);

    after(async () => {
      try {
        const result = await runPipeline({ jd, companyUrl: company_url, days });
        await KitModel.findByIdAndUpdate(kitId, {
          status: result.kit.coverage.uncovered_requirement_ids.length > 0 ? "partial" : "ready",
          title: `${result.kit.role.title || "Untitled role"} @ ${result.kit.source.company || company_url}`,
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
    });

    return NextResponse.json({ id: kitId, status: "generating" }, { status: 202 });
  } catch (err) {
    return handleApiError(err);
  }
}
