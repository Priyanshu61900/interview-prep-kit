// Minimal robots.txt compliance: fetch it once per host, parse Disallow
// rules for our user-agent (falling back to "*"), and check paths against
// them before the crawler fetches anything from that host.

const USER_AGENT = "InterviewPrepKitBot";

interface RobotsRules {
  disallow: string[];
  crawlDelayMs: number;
}

const cache = new Map<string, RobotsRules>();

function parseRobotsTxt(text: string): RobotsRules {
  const lines = text.split(/\r?\n/);
  let currentGroupMatches = false;
  let inSpecificGroup = false;
  const disallowSpecific: string[] = [];
  const disallowWildcard: string[] = [];
  let crawlDelayMs = 0;

  for (const rawLine of lines) {
    const line = rawLine.split("#")[0].trim();
    if (!line) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "user-agent") {
      const agent = value.toLowerCase();
      inSpecificGroup = agent === USER_AGENT.toLowerCase();
      currentGroupMatches = inSpecificGroup || agent === "*";
    } else if (key === "disallow" && currentGroupMatches) {
      if (value) (inSpecificGroup ? disallowSpecific : disallowWildcard).push(value);
    } else if (key === "crawl-delay" && currentGroupMatches) {
      const seconds = Number(value);
      if (!Number.isNaN(seconds)) crawlDelayMs = seconds * 1000;
    }
  }

  return { disallow: disallowSpecific.length ? disallowSpecific : disallowWildcard, crawlDelayMs };
}

export async function getRobotsRules(origin: string): Promise<RobotsRules> {
  if (cache.has(origin)) return cache.get(origin)!;
  let rules: RobotsRules = { disallow: [], crawlDelayMs: 0 };
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const text = await res.text();
      rules = parseRobotsTxt(text);
    }
  } catch {
    // No robots.txt, or unreachable: proceed as if everything is allowed.
  }
  cache.set(origin, rules);
  return rules;
}

export async function isAllowedByRobots(url: URL): Promise<boolean> {
  const rules = await getRobotsRules(url.origin);
  return !rules.disallow.some((rule) => url.pathname.startsWith(rule));
}

export async function getCrawlDelayMs(origin: string): Promise<number> {
  const rules = await getRobotsRules(origin);
  return rules.crawlDelayMs;
}
