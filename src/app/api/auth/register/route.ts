import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { UserModel } from "@/lib/models/User";
import { hashPassword, signSessionToken, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Invalid input" } }, { status: 400 });
  }

  await connectToDatabase();

  const existing = await UserModel.findOne({ email: parsed.data.email });
  if (existing) {
    return NextResponse.json({ error: { code: "EMAIL_TAKEN", message: "An account with this email already exists." } }, { status: 409 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  const user = await UserModel.create({ email: parsed.data.email, passwordHash });

  const token = signSessionToken(user.id);
  const res = NextResponse.json({ user: { id: user.id, email: user.email } }, { status: 201 });
  res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);
  return res;
}
