import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { UserModel } from "@/lib/models/User";
import { requireUserId, AuthError } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const userId = requireUserId(request);
    await connectToDatabase();
    const user = await UserModel.findById(userId).lean();
    if (!user) return NextResponse.json({ error: { code: "SESSION_INVALID", message: "Your session is no longer valid." } }, { status: 401 });
    return NextResponse.json({ user: { id: String(user._id), email: user.email } });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: { code: "UNAUTHENTICATED", message: err.message } }, { status: 401 });
    throw err;
  }
}
