import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { KitModel } from "@/lib/models/Kit";
import { requireUserId, AuthError } from "@/lib/auth";
import { handleApiError, errorJson } from "@/lib/apiResponse";

export const runtime = "nodejs";

const bodySchema = z.object({
  type: z.enum(["question", "flashcard"]),
  itemId: z.string().min(1),
  pinned: z.boolean(),
});

/**
 * Explicit pin/unpin toggle. Pinning is a stronger, deliberate signal than
 * an edit — it survives a category regeneration even if the user never
 * changed the item's text. Unpinning drops back to "generated" (free to be
 * replaced next time), since there is no prior "edited" snapshot to fall
 * back to once a pin is explicitly lifted.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { type, itemId, pinned } = parsed.data;
    const exists = type === "question" ? doc.kit.questions.some((q) => q.id === itemId) : doc.kit.flashcards.some((f) => f.id === itemId);
    if (!exists) return errorJson("NOT_FOUND", `${type} "${itemId}" does not exist in this kit.`, 404);

    const bucket = type === "question" ? doc.meta.question_meta : doc.meta.flashcard_meta;
    bucket[itemId] = { origin: pinned ? "pinned" : "generated", updated_at: new Date().toISOString() };

    doc.markModified("meta");
    await doc.save();
    return NextResponse.json({ meta: doc.meta });
  } catch (err) {
    return handleApiError(err);
  }
}
