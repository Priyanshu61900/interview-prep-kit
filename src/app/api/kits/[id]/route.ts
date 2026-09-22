import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { KitModel } from "@/lib/models/Kit";
import { requireUserId, AuthError } from "@/lib/auth";
import { handleApiError, errorJson } from "@/lib/apiResponse";
import { reconcileMeta } from "@/lib/kitService";
import { kitSchema, checkReferentialIntegrity } from "@/lib/validation/kitSchema";

export const runtime = "nodejs";

async function loadOwnedKit(id: string, userId: string) {
  const doc = await KitModel.findById(id);
  if (!doc) return null;
  if (String(doc.ownerId) !== userId) throw new AuthError("You do not have access to this kit.");
  return doc;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = requireUserId(request);
    const { id } = await params;
    await connectToDatabase();
    const doc = await loadOwnedKit(id, userId);
    if (!doc) return errorJson("NOT_FOUND", "Kit not found.", 404);
    return NextResponse.json({ kit: serialize(doc) });
  } catch (err) {
    return handleApiError(err);
  }
}

const patchSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  kit: kitSchema.optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = requireUserId(request);
    const { id } = await params;
    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return errorJson("INVALID_INPUT", parsed.error.issues[0]?.message ?? "Invalid input", 400);

    await connectToDatabase();
    const doc = await loadOwnedKit(id, userId);
    if (!doc) return errorJson("NOT_FOUND", "Kit not found.", 404);

    if (parsed.data.kit) {
      const issues = checkReferentialIntegrity(parsed.data.kit);
      if (issues.length) {
        return errorJson("INVALID_KIT_STRUCTURE", `Edit rejected: ${issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`, 400);
      }
      if (!doc.kit) return errorJson("NOT_READY", "This kit has not finished generating yet.", 409);
      doc.meta = reconcileMeta(doc.kit, doc.meta, parsed.data.kit);
      doc.kit = parsed.data.kit;
      doc.markModified("kit");
      doc.markModified("meta");
    }
    if (parsed.data.title) doc.title = parsed.data.title;

    await doc.save();
    return NextResponse.json({ kit: serialize(doc) });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const userId = requireUserId(request);
    const { id } = await params;
    await connectToDatabase();
    const doc = await loadOwnedKit(id, userId);
    if (!doc) return errorJson("NOT_FOUND", "Kit not found.", 404);
    await doc.deleteOne();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function serialize(doc: any) {
  return {
    id: String(doc._id),
    title: doc.title,
    status: doc.status,
    generationError: doc.generationError,
    jd: doc.jd,
    companyUrl: doc.companyUrl,
    daysRequested: doc.daysRequested,
    kit: doc.kit,
    meta: doc.meta,
    warnings: doc.warnings,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
