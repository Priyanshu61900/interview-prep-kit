import dns from "node:dns/promises";
import net from "node:net";

// The application fetches pages from URLs supplied by users and discovered
// during crawling. Both are untrusted input. This guard is the choke point
// every outbound fetch (crawler, single-page fetch, public-discussion search)
// must pass through before a request is made.

const PRIVATE_V4_RANGES: Array<[string, number]> = [
  ["10.0.0.0", 8],
  ["172.16.0.0", 12],
  ["192.168.0.0", 16],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // link-local / cloud metadata
  ["0.0.0.0", 8],
];

function ipToInt(ip: string): number {
  return ip.split(".").reduce((acc, octet) => (acc << 8) + Number(octet), 0) >>> 0;
}

function isPrivateV4(ip: string): boolean {
  const ipInt = ipToInt(ip);
  return PRIVATE_V4_RANGES.some(([base, bits]) => {
    const baseInt = ipToInt(base);
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ipInt & mask) === (baseInt & mask);
  });
}

function isPrivateV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return (
    lower === "::1" || // loopback
    lower.startsWith("fe80:") || // link-local
    lower.startsWith("fc") ||
    lower.startsWith("fd") // unique local
  );
}

export interface UrlGuardOptions {
  allowLoopback?: boolean; // used by the batch command against local test fixtures
}

export class UrlGuardError extends Error {
  code = "URL_REJECTED";
}

/**
 * Validates a URL is safe to fetch: http(s) only, resolvable, and (in
 * production, unless explicitly allowed) not pointing at a private or
 * loopback address. This is a defense against SSRF via attacker-controlled
 * hostnames that resolve to internal infrastructure.
 */
export async function assertSafeToFetch(rawUrl: string, options: UrlGuardOptions = {}): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UrlGuardError(`Not a valid URL: ${rawUrl}`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UrlGuardError(`Unsupported protocol: ${url.protocol}`);
  }

  const allowLoopback = options.allowLoopback ?? process.env.NODE_ENV !== "production";
  if (allowLoopback) return url;

  const hostname = url.hostname;
  if (hostname === "localhost") throw new UrlGuardError("Refusing to fetch localhost in production");

  if (net.isIP(hostname)) {
    if (net.isIPv4(hostname) && isPrivateV4(hostname)) throw new UrlGuardError(`Refusing private address: ${hostname}`);
    if (net.isIPv6(hostname) && isPrivateV6(hostname)) throw new UrlGuardError(`Refusing private address: ${hostname}`);
    return url;
  }

  let addresses: string[];
  try {
    const records = await dns.lookup(hostname, { all: true });
    addresses = records.map((r) => r.address);
  } catch {
    throw new UrlGuardError(`Could not resolve host: ${hostname}`);
  }

  for (const addr of addresses) {
    if (net.isIPv4(addr) && isPrivateV4(addr)) throw new UrlGuardError(`Host resolves to private address: ${hostname} -> ${addr}`);
    if (net.isIPv6(addr) && isPrivateV6(addr)) throw new UrlGuardError(`Host resolves to private address: ${hostname} -> ${addr}`);
  }

  return url;
}

export const MAX_RESPONSE_BYTES = 3 * 1024 * 1024; // 3MB — plenty for an HTML page, guards against huge downloads
export const ALLOWED_CONTENT_TYPES = ["text/html", "text/plain", "application/xhtml+xml"];

export function isAllowedContentType(contentType: string | null): boolean {
  if (!contentType) return false;
  const base = contentType.split(";")[0].trim().toLowerCase();
  return ALLOWED_CONTENT_TYPES.includes(base);
}
