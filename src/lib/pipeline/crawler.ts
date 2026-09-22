import { fetchAndCleanPage, FetchPageError, type CleanedPage } from "@/lib/pipeline/fetchPage";

// Finding the hiring page is the interesting half of this problem, per the
// brief: companies bury it at /careers, /jobs, a handbook, an engineering
// blog, wherever. So instead of a fixed path list, we crawl outward from the
// homepage, score every discovered link against keyword heuristics for
// "about" and "hiring" content, and fetch whichever score highest — genuine
// ranking, not a guess at one URL.

const HIRING_KEYWORDS = [
  "career",
  "careers",
  "jobs",
  "job",
  "hiring",
  "hire",
  "join-us",
  "join us",
  "work-with-us",
  "work with us",
  "interview",
  "interviewing",
  "recruit",
  "openings",
  "positions",
  "handbook",
  "life-at",
  "culture",
  "engineering-blog",
  "eng-blog",
];

const ABOUT_KEYWORDS = ["about", "about-us", "company", "mission", "who-we-are", "story", "team"];

const EXCLUDED_EXTENSIONS = /\.(png|jpe?g|gif|svg|css|js|pdf|zip|mp4|webp|ico|woff2?|ttf)(\?|$)/i;

export interface RankedLink {
  url: string;
  score: number;
  reason: "hiring" | "about" | "unranked";
}

function scoreLink(href: string, text: string, baseOrigin: string): RankedLink | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (url.origin !== baseOrigin) return null;
  if (EXCLUDED_EXTENSIONS.test(url.pathname)) return null;
  if (url.hash && url.pathname === "/") return null;

  const haystack = `${url.pathname} ${text}`.toLowerCase();

  let score = 0;
  let reason: RankedLink["reason"] = "unranked";
  for (const kw of HIRING_KEYWORDS) {
    if (haystack.includes(kw)) {
      score += kw.length >= 6 ? 3 : 2; // longer, more specific keywords score higher
      reason = "hiring";
    }
  }
  if (reason === "unranked") {
    for (const kw of ABOUT_KEYWORDS) {
      if (haystack.includes(kw)) {
        score += 2;
        reason = "about";
      }
    }
  }
  // Shallow paths are more likely to be primary nav destinations than deep
  // content pages; a small depth penalty favours e.g. /careers over
  // /blog/2019/03/some-post that happens to mention "hiring" once.
  const depth = url.pathname.split("/").filter(Boolean).length;
  score -= Math.max(0, depth - 1) * 0.5;

  return score > 0 ? { url: url.toString(), score, reason } : null;
}

export interface CrawlResult {
  pagesUsed: CleanedPage[];
  hiringPages: CleanedPage[];
  aboutPages: CleanedPage[];
  skipped: { url: string; reason: string }[];
}

export interface CrawlOptions {
  allowLoopback?: boolean;
  maxPages?: number; // total page budget across the whole crawl
  perHostDelayMs?: number;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Crawls a company site starting from its homepage: fetches the homepage,
 * ranks every discovered same-origin link by hiring/about relevance, and
 * fetches the top-ranked candidates (one hop deep from the homepage, plus a
 * second hop from whatever the top hiring candidate itself links to, since
 * hiring pages often link out to a handbook or process page). Unreachable
 * pages are recorded as skipped rather than aborting the crawl.
 */
export async function crawlCompanySite(companyUrl: string, options: CrawlOptions = {}): Promise<CrawlResult> {
  const { allowLoopback, maxPages = 6, perHostDelayMs = 400 } = options;
  const skipped: { url: string; reason: string }[] = [];
  const pagesUsed: CleanedPage[] = [];
  const hiringPages: CleanedPage[] = [];
  const aboutPages: CleanedPage[] = [];
  const visited = new Set<string>();

  let homepage: CleanedPage;
  try {
    homepage = await fetchAndCleanPage(companyUrl, { allowLoopback });
  } catch (err) {
    const reason = err instanceof FetchPageError ? `${err.code}: ${err.message}` : String(err);
    skipped.push({ url: companyUrl, reason });
    return { pagesUsed, hiringPages, aboutPages, skipped };
  }
  visited.add(normalize(homepage.url));
  pagesUsed.push(homepage);
  aboutPages.push(homepage); // homepage itself usually carries "what they do"

  const baseOrigin = new URL(homepage.url).origin;
  const ranked = homepage.links
    .map((l) => scoreLink(l.href, l.text, baseOrigin))
    .filter((r): r is RankedLink => r !== null)
    .sort((a, b) => b.score - a.score);

  const seenUrls = new Set(ranked.map((r) => normalize(r.url)));
  const dedupedRanked = ranked.filter((r, i) => ranked.findIndex((o) => normalize(o.url) === normalize(r.url)) === i);
  void seenUrls;

  const candidates = dedupedRanked.slice(0, maxPages - 1);
  let bestHiringUrl: string | null = null;

  for (const candidate of candidates) {
    if (visited.has(normalize(candidate.url))) continue;
    visited.add(normalize(candidate.url));
    await sleep(perHostDelayMs);
    try {
      const page = await fetchAndCleanPage(candidate.url, { allowLoopback });
      pagesUsed.push(page);
      if (candidate.reason === "hiring") {
        hiringPages.push(page);
        if (!bestHiringUrl) bestHiringUrl = page.url;
      } else {
        aboutPages.push(page);
      }
    } catch (err) {
      const reason = err instanceof FetchPageError ? `${err.code}: ${err.message}` : String(err);
      skipped.push({ url: candidate.url, reason });
    }
  }

  // Second hop: the best hiring page found often links to a handbook or a
  // detailed "our interview process" page one level deeper.
  if (bestHiringUrl && pagesUsed.length < maxPages) {
    const hiringPage = hiringPages.find((p) => p.url === bestHiringUrl);
    if (hiringPage) {
      const deeper = hiringPage.links
        .map((l) => scoreLink(l.href, l.text, baseOrigin))
        .filter((r): r is RankedLink => r !== null && r.reason === "hiring")
        .sort((a, b) => b.score - a.score);

      for (const candidate of deeper) {
        if (pagesUsed.length >= maxPages) break;
        if (visited.has(normalize(candidate.url))) continue;
        visited.add(normalize(candidate.url));
        await sleep(perHostDelayMs);
        try {
          const page = await fetchAndCleanPage(candidate.url, { allowLoopback });
          pagesUsed.push(page);
          hiringPages.push(page);
        } catch (err) {
          const reason = err instanceof FetchPageError ? `${err.code}: ${err.message}` : String(err);
          skipped.push({ url: candidate.url, reason });
        }
      }
    }
  }

  return { pagesUsed, hiringPages, aboutPages, skipped };
}

function normalize(url: string): string {
  const u = new URL(url);
  return `${u.origin}${u.pathname}`.replace(/\/$/, "");
}
