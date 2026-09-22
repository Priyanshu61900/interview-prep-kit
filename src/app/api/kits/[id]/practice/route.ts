import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { KitModel } from "@/lib/models/Kit";
import { requireUserId, AuthError } from "@/lib/auth";
import { handleApiError, errorJson } from "@/lib/apiResponse";

export const runtime = "nodejs";

const bodySchema = z.object({
  flashcard_id: z.string().min(1),
  confidence: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
});

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
    if (!doc.kit.flashcards.some((f) => f.id === parsed.data.flashcard_id)) {
      return errorJson("NOT_FOUND", "That flashcard does not exist in this kit.", 404);
    }

    doc.meta.practice_attempts.push({ ...parsed.data, attempted_at: new Date().toISOString() });
    doc.markModified("meta");
    await doc.save();
    return NextResponse.json({ practice_attempts: doc.meta.practice_attempts });
  } catch (err) {
    return handleApiError(err);
  }
}
