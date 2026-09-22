import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { connectToDatabase } from "@/lib/db";
import { UserModel } from "@/lib/models/User";
import { verifyPassword, signSessionToken, sessionCookieOptions, SESSION_COOKIE_NAME } from "@/lib/auth";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

const GENERIC_INVALID = { error: { code: "INVALID_CREDENTIALS", message: "Incorrect email or password." } };

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "INVALID_INPUT", message: "Email and password are required." } }, { status: 400 });
  }

  await connectToDatabase();

  const user = await UserModel.findOne({ email: parsed.data.email });
  if (!user) return NextResponse.json(GENERIC_INVALID, { status: 401 });

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);
  if (!valid) return NextResponse.json(GENERIC_INVALID, { status: 401 });

  const token = signSessionToken(user.id);
  const res = NextResponse.json({ user: { id: user.id, email: user.email } });
  res.cookies.set(SESSION_COOKIE_NAME, token, sessionCookieOptions);
  return res;
}
