import * as cheerio from "cheerio";
import { assertSafeToFetch, isAllowedContentType, MAX_RESPONSE_BYTES } from "@/lib/security/urlGuard";
import { isAllowedByRobots } from "@/lib/pipeline/robots";
import { RateLimitedError, withRetry } from "@/lib/rateLimit";

const USER_AGENT = "InterviewPrepKitBot/1.0 (+interview prep research tool)";
const FETCH_TIMEOUT_MS = 8000;

export interface CleanedPage {
  url: string;
  title: string;
  text: string;
  links: { href: string; text: string }[];
}

export type FetchFailureCode =
  | "URL_REJECTED"
  | "ROBOTS_DISALLOWED"
  | "TIMEOUT"
  | "NOT_FOUND"
  | "UNREACHABLE"
  | "BAD_CONTENT_TYPE"
  | "TOO_LARGE"
  | "EMPTY";

export class FetchPageError extends Error {
  code: FetchFailureCode;
  constructor(code: FetchFailureCode, message: string) {
    super(message);
    this.code = code;
  }
}

/**
 * Retrieves a single page and reduces it to clean, model-ready text: strips
 * scripts, styles, nav chrome, and collapses whitespace. Also returns the
 * outbound links so the crawler can rank and follow them. Every fetch here
 * goes through the SSRF guard and robots.txt check first — this is the only
 * place in the codebase that makes outbound HTTP requests to arbitrary
 * hosts, by design.
 */
export async function fetchAndCleanPage(rawUrl: string, options: { allowLoopback?: boolean } = {}): Promise<CleanedPage> {
  const url = await assertSafeToFetch(rawUrl, options).catch((err) => {
    throw new FetchPageError("URL_REJECTED", err.message);
  });

  const allowed = await isAllowedByRobots(url);
  if (!allowed) throw new FetchPageError("ROBOTS_DISALLOWED", `robots.txt disallows ${url.pathname}`);

  const res = await withRetry(
    async () => {
      let response: Response;
      try {
        response = await fetch(url.toString(), {
          headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
          redirect: "follow",
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("abort") || msg.includes("timeout")) {
          throw new FetchPageError("TIMEOUT", `Timed out fetching ${url}`);
        }
        throw new FetchPageError("UNREACHABLE", `Could not reach ${url}: ${msg}`);
      }

      if (response.status === 404) throw new FetchPageError("NOT_FOUND", `404 at ${url}`);
      if (response.status === 429 || response.status >= 500) {
        throw new RateLimitedError(`Transient ${response.status} at ${url}`);
      }
      if (!response.ok) throw new FetchPageError("UNREACHABLE", `HTTP ${response.status} at ${url}`);

      const contentType = response.headers.get("content-type");
      if (!isAllowedContentType(contentType)) {
        throw new FetchPageError("BAD_CONTENT_TYPE", `Unexpected content-type "${contentType}" at ${url}`);
      }

      const contentLength = response.headers.get("content-length");
      if (contentLength && Number(contentLength) > MAX_RESPONSE_BYTES) {
        throw new FetchPageError("TOO_LARGE", `Response too large (${contentLength} bytes) at ${url}`);
      }

      return response;
    },
    { retries: 2, baseDelayMs: 800, isRetryable: (err) => err instanceof RateLimitedError }
  ).catch((err) => {
    if (err instanceof FetchPageError) throw err;
    throw new FetchPageError("UNREACHABLE", err instanceof Error ? err.message : String(err));
  });

  const buffer = await res.arrayBuffer();
  if (buffer.byteLength > MAX_RESPONSE_BYTES) {
    throw new FetchPageError("TOO_LARGE", `Response exceeded ${MAX_RESPONSE_BYTES} bytes`);
  }

  const html = Buffer.from(buffer).toString("utf-8");
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe, nav, footer").remove();

  const title = $("title").first().text().trim() || $("h1").first().text().trim() || url.toString();
  const text = $("body").text().replace(/\s+/g, " ").trim();

  if (!text) throw new FetchPageError("EMPTY", `No extractable text at ${url}`);

  const links: { href: string; text: string }[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    const linkText = $(el).text().replace(/\s+/g, " ").trim();
    if (!href) return;
    try {
      const resolved = new URL(href, url).toString();
      links.push({ href: resolved, text: linkText });
    } catch {
      // ignore unparsable hrefs (mailto:, javascript:, etc. resolved oddly)
    }
  });

  return { url: url.toString(), title, text: text.slice(0, 20000), links };
}
