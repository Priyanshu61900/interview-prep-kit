import { RateLimitedError, RateLimiter, withRetry } from "@/lib/rateLimit";

// Thin abstraction over the LLM provider so the pipeline steps never talk to
// a specific vendor's SDK directly — swapping providers means changing this
// file only. Provider: Groq (genuine free tier, OpenAI-compatible Chat
// Completions API, fast inference — well suited to a pipeline that makes
// many sequential calls). Model configurable via GROQ_MODEL.

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// Groq's free tier for llama-3.3-70b-versatile is 30 requests/minute. Stay under it.
const rateLimiter = new RateLimiter(25, 60_000);

export class LlmError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export interface GenerateJsonOptions {
  system: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}

function getConfig() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new LlmError("LLM_NOT_CONFIGURED", "GROQ_API_KEY is not set");
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  return { apiKey, model };
}

/**
 * Calls Groq asking for strict JSON output, retrying on rate limits and
 * transient failures, and throwing a typed LlmError the pipeline can catch
 * and record as a skipped/failed step rather than crash the whole run.
 */
/**
 * How long to wait after a 429. Groq reports request throttling via
 * `retry-after` but token-per-minute throttling only via its
 * `x-ratelimit-reset-*` headers, which carry Go-style durations such as
 * "7.66s" or "2m59.56s". Reading only `retry-after` meant a TPM limit fell
 * back to a flat 5s and the run gave up while the window was still closed.
 */
export function resetDelayMs(headers: Headers): number {
  const retryAfter = Number(headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1000;

  const candidates = [headers.get("x-ratelimit-reset-tokens"), headers.get("x-ratelimit-reset-requests")]
    .map((v) => (v ? parseDuration(v) : null))
    .filter((v): v is number => v !== null && v > 0);

  if (candidates.length) return Math.max(...candidates) + 500;
  return 15_000;
}

function parseDuration(value: string): number | null {
  const parts = value.trim().matchAll(/([\d.]+)(ms|h|m|s)/g);
  let total = 0;
  let matched = false;
  for (const [, amount, unit] of parts) {
    const n = Number(amount);
    if (!Number.isFinite(n)) continue;
    matched = true;
    total += unit === "ms" ? n : unit === "s" ? n * 1000 : unit === "m" ? n * 60_000 : n * 3_600_000;
  }
  if (matched) return total;
  const plain = Number(value);
  return Number.isFinite(plain) ? plain * 1000 : null;
}

export async function generateJson<T = unknown>(options: GenerateJsonOptions): Promise<T> {
  const { apiKey, model } = getConfig();
  const { system, prompt, temperature = 0.4, maxOutputTokens = 4096 } = options;

  const text = await withRetry(
    async () => {
      await rateLimiter.acquire();

      const res = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature,
          max_tokens: maxOutputTokens,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (res.status === 429) {
        throw new RateLimitedError("Groq rate limit hit", resetDelayMs(res.headers));
      }
      if (res.status >= 500) {
        throw new RateLimitedError(`Groq transient error ${res.status}`);
      }
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new LlmError("LLM_REQUEST_FAILED", `Groq request failed: ${res.status} ${body.slice(0, 500)}`);
      }

      const data = await res.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content !== "string") {
        throw new LlmError("LLM_EMPTY_RESPONSE", "Groq returned no usable content");
      }
      return content as string;
    },
    {
      // A tokens-per-minute window can take a full minute to clear, so the
      // budget has to outlast one, not just a few seconds of request throttling.
      retries: 6,
      baseDelayMs: 1500,
      maxDelayMs: 65_000,
      isRetryable: (err) => err instanceof RateLimitedError,
    }
  );

  try {
    return JSON.parse(text) as T;
  } catch {
    // One repair attempt: models occasionally wrap JSON in prose or fences
    // despite response_format. Try to salvage the first {...} or [...] block.
    const match = text.match(/[[{][\s\S]*[\]}]/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        // fall through
      }
    }
    throw new LlmError("LLM_INVALID_JSON", `Groq returned invalid JSON: ${text.slice(0, 300)}`);
  }
}
