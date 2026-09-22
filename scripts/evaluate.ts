#!/usr/bin/env tsx
/**
 * Batch entry point (Section 9 of the brief):
 *
 *   npm run evaluate -- --input <cases.json> --output <kits.json>
 *
 * Reads an array of {id, jd, company_url, days} cases and runs each one
 * through the exact same runPipeline() the interactive app calls from
 * app/api/kits/route.ts — no parallel implementation. Continues past a
 * single case failing, recording it rather than aborting the run, and
 * writes one JSON file in the Appendix B shape.
 *
 * allowLoopback is on unconditionally here: the brief states the company
 * sites used with this command may be served from a local address, and this
 * is a developer-run CLI, not something exposed to end users — the
 * SSRF-guard's loopback rejection exists to protect the deployed web app
 * from being pointed at its own internal network by an untrusted request,
 * which does not apply to a locally invoked batch script.
 */
import { config as loadEnv } from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });

import { runPipeline, PipelineError } from "../src/lib/pipeline/pipeline";
import type { BatchCase, BatchOutput, BatchKitResult } from "../src/types/kit";

const CONCURRENCY = 3;

function parseArgs(argv: string[]): { input: string; output: string } {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--input") args.input = argv[++i];
    else if (argv[i] === "--output") args.output = argv[++i];
  }
  if (!args.input || !args.output) {
    throw new Error("Usage: npm run evaluate -- --input <cases.json> --output <kits.json>");
  }
  return { input: args.input, output: args.output };
}

async function runCase(c: BatchCase): Promise<BatchKitResult> {
  if (!c.id || typeof c.jd !== "string" || typeof c.company_url !== "string" || typeof c.days !== "number") {
    return { id: c.id ?? "unknown", status: "failed", kit: null, error: { code: "INVALID_CASE", message: "Case is missing id, jd, company_url, or days." } };
  }
  try {
    const result = await runPipeline({ jd: c.jd, companyUrl: c.company_url, days: c.days, allowLoopback: true });
    return { id: c.id, status: "ok", kit: result.kit, error: null };
  } catch (err) {
    const code = err instanceof PipelineError ? err.code : "UNEXPECTED_ERROR";
    const message = err instanceof Error ? err.message : String(err);
    return { id: c.id, status: "failed", kit: null, error: { code, message } };
  }
}

/** Simple bounded-concurrency map: at most `limit` cases run at once, each case still going through the shared LLM rate limiter internally. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    for (;;) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function main() {
  const { input, output } = parseArgs(process.argv.slice(2));

  const raw = await fs.readFile(path.resolve(process.cwd(), input), "utf-8");
  const cases: BatchCase[] = JSON.parse(raw);
  if (!Array.isArray(cases)) throw new Error("Input file must contain a JSON array of cases.");

  console.log(`Running ${cases.length} case(s) with concurrency ${CONCURRENCY}...`);
  const startedAt = Date.now();

  const kits = await mapWithConcurrency(cases, CONCURRENCY, async (c) => {
    const t0 = Date.now();
    const result = await runCase(c);
    console.log(`  [${result.status.toUpperCase()}] ${c.id} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    return result;
  });

  const output_data: BatchOutput = {
    version: "1.0",
    generated_at: new Date().toISOString(),
    kits,
  };

  await fs.writeFile(path.resolve(process.cwd(), output), JSON.stringify(output_data, null, 2), "utf-8");

  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
  const okCount = kits.filter((k) => k.status === "ok").length;
  console.log(`Done in ${elapsed}s — ${okCount}/${kits.length} ok. Wrote ${output}.`);
}

main().catch((err) => {
  console.error("Fatal error running batch evaluation:", err);
  process.exit(1);
});
