// Minimal backoff + concurrency control shared by the crawler and the LLM
// client. Free-tier providers throttle on tokens-per-minute, not just
// request count, so a pipeline that fires calls as fast as it can build them
// will get rate-limited on the very first run — this is what stands between
// that and a working pipeline.

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  isRetryable?: (err: unknown) => boolean;
}

export class RateLimitedError extends Error {
  retryAfterMs?: number;
  constructor(message: string, retryAfterMs?: number) {
    super(message);
    this.retryAfterMs = retryAfterMs;
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const { retries = 4, baseDelayMs = 1000, maxDelayMs = 20000, isRetryable = () => true } = options;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries || !isRetryable(err)) throw err;

      let delay = Math.min(maxDelayMs, baseDelayMs * 2 ** attempt);
      if (err instanceof RateLimitedError && err.retryAfterMs) {
        delay = Math.max(delay, err.retryAfterMs);
      }
      delay += Math.random() * 250; // jitter, avoid thundering herd on retries
      await sleep(delay);
    }
  }
  throw lastErr;
}

/**
 * Simple sliding-window limiter: at most `maxCalls` calls started within any
 * `windowMs` window. Calls beyond that wait. Cheap, in-process, adequate for
 * a single-instance batch run or a single serverless invocation's pipeline.
 */
export class RateLimiter {
  private timestamps: number[] = [];
  constructor(private maxCalls: number, private windowMs: number) {}

  async acquire(): Promise<void> {
    for (;;) {
      const now = Date.now();
      this.timestamps = this.timestamps.filter((t) => now - t < this.windowMs);
      if (this.timestamps.length < this.maxCalls) {
        this.timestamps.push(now);
        return;
      }
      const oldest = this.timestamps[0];
      const waitMs = this.windowMs - (now - oldest) + 25;
      await sleep(Math.max(waitMs, 25));
    }
  }
}
