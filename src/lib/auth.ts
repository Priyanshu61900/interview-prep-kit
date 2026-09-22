import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { NextRequest } from "next/server";

export const SESSION_COOKIE_NAME = "ipk_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

interface SessionPayload {
  sub: string; // user id
}

export function signSessionToken(userId: string): string {
  return jwt.sign({ sub: userId } satisfies SessionPayload, getSecret(), { expiresIn: SESSION_TTL_SECONDS });
}

/** Returns the user id for a valid, unexpired session token, or null. Never throws. */
export function verifySessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, getSecret()) as SessionPayload;
    return payload.sub;
  } catch {
    // Covers expired, malformed, and tampered tokens alike — all are
    // treated as "not signed in", never as a server error.
    return null;
  }
}

export class AuthError extends Error {
  status = 401;
}

/** Reads and verifies the session cookie on an API route request. Throws AuthError if absent/invalid/expired. */
export function requireUserId(request: NextRequest): string {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const userId = verifySessionToken(token);
  if (!userId) throw new AuthError("Not signed in, or your session has expired. Please log in again.");
  return userId;
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: SESSION_TTL_SECONDS,
};
