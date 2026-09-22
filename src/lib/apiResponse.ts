import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth";
import { PipelineError } from "@/lib/pipeline/pipeline";
import { LlmError } from "@/lib/llm/provider";

export function errorJson(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

/** Maps a caught error to a structured API response, so every route returns the same {error:{code,message}} shape instead of an opaque 500. */
export function handleApiError(err: unknown) {
  if (err instanceof AuthError) return errorJson("UNAUTHENTICATED", err.message, 401);
  if (err instanceof PipelineError) return errorJson(err.code, err.message, 422);
  if (err instanceof LlmError) return errorJson(err.code, err.message, 502);
  if (err instanceof Error && err.name === "ZodError") return errorJson("INVALID_INPUT", err.message, 400);
   
  console.error(err);
  return errorJson("INTERNAL_ERROR", "Something went wrong. Please try again.", 500);
}
