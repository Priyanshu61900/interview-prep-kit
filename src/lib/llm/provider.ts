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
        const retryAfterHeader = res.headers.get("retry-after");
        const retryAfterMs = retryAfterHeader ? Number(retryAfterHeader) * 1000 : 5000;
        throw new RateLimitedError("Groq rate limit hit", retryAfterMs);
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
      retries: 4,
      baseDelayMs: 1500,
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
