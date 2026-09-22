import * as cheerio from "cheerio";
import { isAllowedByRobots } from "@/lib/pipeline/robots";
import { withRetry, RateLimitedError } from "@/lib/rateLimit";

// Looks for public discussion of how a company interviews — Glassdoor,
// Blind, Reddit threads, engineering blog posts about the process, etc.
// There is no free structured search API worth the setup here, so this uses
// DuckDuckGo's HTML search endpoint (no key required, robots.txt-checked
// like every other outbound fetch) and works from the result snippets
// directly, since many of the destination sites (Glassdoor, Blind) block
// scraping outright — the snippet is often the only part we can honestly get.

const SEARCH_URL = "https://html.duckduckgo.com/html/";
const USER_AGENT = "InterviewPrepKitBot/1.0 (+interview prep research tool)";

export interface DiscussionSnippet {
  title: string;
  url: string;
  snippet: string;
}

export interface PublicDiscussionResult {
  snippets: DiscussionSnippet[];
  skipped: { url: string; reason: string }[];
}

export async function searchPublicDiscussion(companyName: string): Promise<PublicDiscussionResult> {
  const query = `${companyName} interview process questions`;
  const searchUrl = new URL(SEARCH_URL);
  searchUrl.searchParams.set("q", query);

  const allowed = await isAllowedByRobots(searchUrl).catch(() => true);
  if (!allowed) {
    return { snippets: [], skipped: [{ url: searchUrl.toString(), reason: "ROBOTS_DISALLOWED" }] };
  }

  try {
    const html = await withRetry(
      async () => {
        const res = await fetch(searchUrl.toString(), {
          method: "POST",
          headers: {
            "User-Agent": USER_AGENT,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ q: query }).toString(),
          signal: AbortSignal.timeout(8000),
        });
        if (res.status === 429 || res.status >= 500) throw new RateLimitedError(`Search transient ${res.status}`);
        if (!res.ok) throw new Error(`Search failed: HTTP ${res.status}`);
        return res.text();
      },
      { retries: 2, baseDelayMs: 1000, isRetryable: (err) => err instanceof RateLimitedError }
    );

    const $ = cheerio.load(html);
    const snippets: DiscussionSnippet[] = [];
    $(".result").each((_, el) => {
      if (snippets.length >= 6) return;
      const titleEl = $(el).find(".result__a").first();
      const title = titleEl.text().trim();
      let href = titleEl.attr("href") || "";
      const snippet = $(el).find(".result__snippet").text().trim();
      if (!title || !href) return;

      // DDG's HTML endpoint wraps result links in a redirect; unwrap it.
      try {
        if (href.startsWith("//")) href = `https:${href}`;
        const parsed = new URL(href, "https://duckduckgo.com");
        const redirectTarget = parsed.searchParams.get("uddg");
        if (redirectTarget) href = decodeURIComponent(redirectTarget);
      } catch {
        return;
      }

      snippets.push({ title, url: href, snippet });
    });

    return { snippets, skipped: [] };
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return { snippets: [], skipped: [{ url: searchUrl.toString(), reason }] };
  }
}
