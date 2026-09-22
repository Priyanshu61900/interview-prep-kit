import { describe, it, expect } from "vitest";
import { resetDelayMs } from "@/lib/llm/provider";

const h = (init: Record<string, string>) => new Headers(init);

describe("resetDelayMs", () => {
  it("prefers retry-after, in seconds", () => {
    expect(resetDelayMs(h({ "retry-after": "12" }))).toBe(12_000);
  });

  it("reads Groq's token reset header when retry-after is absent", () => {
    // This is the case that previously fell back to a flat 5s and made the
    // run give up while the tokens-per-minute window was still closed.
    expect(resetDelayMs(h({ "x-ratelimit-reset-tokens": "7.66s" }))).toBe(7_660 + 500);
  });

  it("parses compound Go-style durations", () => {
    expect(resetDelayMs(h({ "x-ratelimit-reset-tokens": "2m59.56s" }))).toBe(179_560 + 500);
  });

  it("parses millisecond durations", () => {
    expect(resetDelayMs(h({ "x-ratelimit-reset-requests": "500ms" }))).toBe(1_000);
  });

  it("takes the longer of the two reset windows", () => {
    const delay = resetDelayMs(h({ "x-ratelimit-reset-requests": "2s", "x-ratelimit-reset-tokens": "30s" }));
    expect(delay).toBe(30_000 + 500);
  });

  it("waits long enough to outlast a full minute window", () => {
    expect(resetDelayMs(h({ "x-ratelimit-reset-tokens": "1m" }))).toBeGreaterThan(59_000);
  });

  it("falls back to a usable delay when no headers are present", () => {
    expect(resetDelayMs(h({}))).toBe(15_000);
  });
});
