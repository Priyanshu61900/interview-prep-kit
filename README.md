# Interview Prep Kit

Turns a job description + a company website into a structured, editable interview preparation kit: a company brief, role breakdown, categorised question bank, flashcards, and a day-by-day study schedule — researched from the open web, generated in stages, and checked for coverage before it ships.

Built for the Trao "AI Interview Prep Kit" full-stack assessment.

**Live:** https://interview-prep-kit-one.vercel.app
**Source:** https://github.com/Priyanshu61900/interview-prep-kit

Frontend and backend are the same Vercel deployment, so both are reachable at that one URL.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 16 (App Router) + Tailwind CSS v4 | matches the brief's preferred stack |
| Backend | Next.js Route Handlers (Node.js runtime) | **equivalent to Express**, not Express itself — see below |
| Database | MongoDB (Atlas free tier) via Mongoose | matches the brief |
| Language | TypeScript throughout | matches the brief |
| Scraping | `cheerio` for HTML parsing, native `fetch` for retrieval | lightweight, no headless browser needed for static company sites |
| LLM | Groq — `openai/gpt-oss-120b` (OpenAI-compatible Chat Completions API) | genuine free tier, fast inference, JSON mode; well suited to a pipeline that makes many sequential calls under a tokens-per-minute budget |
| Tests | Vitest | fast, zero-config with the existing TS setup |

**Why Route Handlers instead of a separate Express server:** the brief allows equivalent technologies if justified. Route Handlers run on the same Node.js runtime Express would, but deploy as one Vercel project instead of two — no CORS configuration, no separate hosting/env-var story for a second service, and the brief's own requirement ("frontend and backend must both be reachable") is satisfied trivially since they're the same deployment. Concerns are still kept separate in code (see Architecture) — this is a deployment-topology choice, not an architecture one.

## Setup

### Local development

```bash
npm install
cp .env.example .env.local   # fill in MONGODB_URI, AUTH_SECRET, GROQ_API_KEY
npm run dev
```

Open http://localhost:3000.

### Environment variables

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string (Atlas free tier, or local `mongod`). `MONGODB_URL`, `ATLAS_URL` and `DATABASE_URL` are also read, and a managed-database integration that injects a prefixed name (for example `ATLAS_MONGODB_URI`) is detected automatically, so the connection string never has to be copied by hand. Unset locally starts an in-memory MongoDB; required in production |
| `AUTH_SECRET` | Secret used to sign session JWTs — generate with `openssl rand -hex 32` |
| `GROQ_API_KEY` | Free-tier API key from [console.groq.com](https://console.groq.com/keys) |
| `GROQ_MODEL` | Defaults to `openai/gpt-oss-120b` |
| `NODE_ENV` | `production` enables SSRF hardening (rejects private/loopback company URLs); left unset locally so the batch command can target `http://localhost` fixtures |

### Deployment (Vercel)

1. **Push to GitHub** (required by Vercel):
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/interview-prep-kit.git
   git branch -M main
   git push -u origin main
   ```

2. **Deploy to Vercel**:
   - Visit [vercel.com](https://vercel.com) and sign in
   - Click "Add New Project" → "Import Git Repository"
   - Select `interview-prep-kit` from your GitHub repos
   - Set environment variables in the Vercel dashboard:
     - `AUTH_SECRET`: generate with `openssl rand -hex 32`
     - `GROQ_API_KEY`: from [console.groq.com](https://console.groq.com/keys)
     - `GROQ_MODEL`: `openai/gpt-oss-120b`
   - Click "Deploy"

3. **Attach the database** (Project → Storage → Create Database → MongoDB Atlas):
   Vercel provisions the cluster and injects the connection string itself under
   a prefixed name such as `ATLAS_MONGODB_URI`. The app detects it, so the
   string never has to be copied by hand or pasted into a form. Redeploy once
   after attaching — existing deployments do not pick up new variables.

   Setting `MONGODB_URI` manually to an Atlas string works just as well.

4. **Or deploy from CLI**:
   ```bash
   npm run build           # Verify build succeeds locally
   vercel --prod          # Deploy to production
   ```

Environment variables live in the Vercel project's settings, never in the repository. The deployed instance runs at https://interview-prep-kit-one.vercel.app.

### Batch entry point (Section 9)

```bash
npm run evaluate -- --input cases.json --output kits.json
```

- Reads a JSON array of `{ id, jd, company_url, days }` (Appendix B shape).
- Runs each case through **the exact same `runPipeline()`** function the interactive app's `POST /api/kits` route calls (`src/lib/pipeline/pipeline.ts`) — not a parallel implementation.
- Processes cases with bounded concurrency (3 at a time); a shared in-process rate limiter throttles actual LLM calls regardless of concurrency, so this doesn't blow through Groq's per-minute limit.
- A case that throws is recorded as `status: "failed"` with a structured error and the run continues — one bad case never aborts the batch.
- Writes a single JSON file in the exact Appendix B shape.
- Needs only `GROQ_API_KEY`/`GROQ_MODEL` (no database) — it doesn't persist anything, matching "runs the full retrieval, generation and validation path" without requiring the web app's infrastructure.
- `allowLoopback` is on unconditionally in the batch runner: the brief states company sites for this command may be served from a local address, and this is a developer-invoked CLI, not a path reachable by an untrusted end user — the SSRF guard's production loopback rejection exists to protect the *deployed web app* from being pointed at internal infrastructure by an untrusted request, which doesn't apply here.

## High-level architecture

```
src/
  app/
    (auth)/login, register        — public auth pages
    (app)/dashboard, kits/[id]    — protected pages (server-side session check in layout.tsx)
    api/                          — Route Handlers (the "backend")
  lib/
    pipeline/                     — retrieval + generation + scheduling, framework-agnostic
    llm/                          — provider abstraction (Groq) + all prompts
    validation/                   — zod schema for Appendix A + referential-integrity checks
    security/                     — SSRF guard, content-type/size limits
    models/                       — Mongoose schemas
    kitService.ts                 — generated/edited/pinned state reconciliation
    useKitEditor.ts               — client-side hook: load, poll, optimistic edit, autosave
  components/kit/                 — Builder UI, one component per kit section
scripts/evaluate.ts               — batch entry point, imports the same pipeline
```

`src/lib/pipeline/pipeline.ts` (`runPipeline`) is the single implementation shared by the interactive API route and the batch CLI — retrieval, extraction, generation, coverage-checking, and scheduling never live in two places.

## Retrieval approach and sources

- **Company site**: no fixed path list. The homepage is fetched and cleaned, then every same-origin link is scored against hiring-related keywords (`careers`, `jobs`, `handbook`, `interview`, `engineering-blog`, …) and about-related keywords, with a small depth penalty so a shallow `/careers` outranks a deep blog post that happens to mention "hiring" once. The top-ranked candidates are fetched; the best-ranked hiring page's own outbound links are scanned one hop deeper for a linked handbook/process page (`src/lib/pipeline/crawler.ts`).
- **Public discussion of the interview process**: DuckDuckGo's HTML search endpoint (no API key required) for `"<company> interview process questions"`. Destination sites like Glassdoor and Blind actively block scraping, so this deliberately works from the search result snippets themselves rather than trying to fetch those pages — the snippet is often the only part honestly retrievable (`src/lib/pipeline/publicDiscussion.ts`).
- **robots.txt**: fetched and parsed per-origin before any crawl or search request; disallowed paths are skipped, not fetched (`src/lib/pipeline/robots.ts`).
- Every fetch goes through a shared retrieval path (`fetchAndCleanPage`) that enforces the SSRF guard, robots.txt, content-type allowlist, and a 3MB size cap before touching the network.
- A source that can't be retrieved (404, timeout, robots-disallowed, wrong content type) is recorded in `skipped_sources` and surfaced in the UI under "Research notes" — the run continues rather than failing.

## Sequencing (Section 3 & 4)

1. **Crawl the company site** and **search public discussion** — run in parallel, no LLM involved, each independently allowed to fail without aborting the run.
2. **Extract requirements** from the pasted JD alone (no retrieval needed for pasted text) — a dedicated LLM call instructed to under-report rather than invent, so a thin JD produces a short requirement list.
3. **Generate the company brief** from whatever was actually retrieved — if nothing was retrievable, this step skips the LLM call entirely and writes an honest "limited information found" brief instead of guessing.
4. **Generate questions per category** — technical, behavioural, system-design, company-fit are each a *separate* model call with category-specific instructions, because a "5 years of React" requirement and a "mentors junior engineers" requirement genuinely need different question-writing instructions, not the same prompt reused. `system-design` is only planned when the role looks senior or the hiring-process research actually mentions a design round — it's not generated by default. This step is informed by whatever the hiring-process research found.
5. **Coverage check + second pass (deterministic)** — `findUncoveredRequirements` (`src/lib/pipeline/coverage.ts`) is plain code: it flags any requirement no question references. Up to two further gap-filling generation passes target only the still-uncovered requirements; the loop stops early once nothing is uncovered, or once a pass makes no further progress (an LLM call that fails twice in a row for the same gap isn't retried forever).
6. **Flashcards** are derived from the finished question bank (not generated independently), so every flashcard traces back to a real question and therefore a real requirement.
7. **Schedule allocation (deterministic)** — `buildSchedule` (`src/lib/pipeline/schedule.ts`) is plain arithmetic: no LLM call anywhere in this file.
8. **Structural validation** — the assembled kit is checked against the Appendix A zod schema plus referential-integrity rules (every `requirement_ids`/`question_ids` reference must resolve) before it's ever saved or returned.

### Why two gap-filling passes (three total)

Diminishing returns: if a targeted, single-requirement generation call doesn't produce a covering question on the first retry, it's unlikely a third attempt with the same instructions will either — more likely the requirement is oddly phrased or off-topic for the JD. Capping at 3 total passes keeps worst-case latency bounded (relevant given the batch command's 15-minute budget for 5 cases) while still giving genuine transient failures (a rate limit, a malformed JSON response) a real second chance.

## Generated / edited / pinned state (the hardest problem in the brief)

Every question, flashcard, the brief, and the schedule carries an `origin` of `"generated" | "edited" | "pinned"` in a separate `meta` object alongside the kit (`src/types/kit.ts`, `src/lib/kitService.ts`) — **not** inside the Appendix A structure itself, so the contractual kit shape stays exactly as specified.

- **generated**: produced by the pipeline, free to be replaced by a category/brief/schedule regeneration.
- **edited**: the server detects this by diffing the incoming kit against the previously saved one on every autosave `PATCH` — if a question/flashcard/brief/schedule's content differs from what was last saved (or it's a brand-new id the user added by hand), it's stamped `edited`. The client never self-reports what it touched; the server's diff is the source of truth, so there's no way for a stale client or a missed event to mis-stamp something.
- **pinned**: an explicit user toggle, stronger than an edit — protects an item even if its content is untouched. Unpinning drops back to `generated` (there's no prior snapshot to fall back to once a pin is deliberately lifted).

**Regenerating a question category** replaces only that category's `generated`-origin questions; every `edited` or `pinned` question in that category is left untouched, and the model is asked to (re)cover the same requirement set. **Regenerating the brief or the schedule** is guarded: if either has been manually edited, the API returns `409 EDITS_WOULD_BE_LOST` and the UI asks for explicit confirmation before overwriting.

## Schedule allocation

Deterministic, in `buildSchedule` — no LLM call:

1. Each question gets a weight (must-have-requirement coverage dominates, then difficulty, then breadth) and an estimated duration (15/25/40 minutes by difficulty, +15 for system-design).
2. Questions are sorted by weight descending, so harder/higher-priority material sorts first.
3. **More questions than days**: the sorted list is chunked into exactly `days` contiguous pieces, slightly larger chunks first — the important stuff, which sorts first, lands on the earliest days.
4. **Fewer questions than days** (e.g. a 60-day schedule): each question gets its own day in priority order; the remaining days become spaced-repetition review days that cycle back through already-covered material rather than being left empty or inventing new content.
5. **1-day schedule**: everything lands on day 1.
6. **Zero questions** (a JD too thin to extract anything from): still produces exactly the requested number of days, honestly labelled, with zero minutes.

## Edge cases (Section 10)

| Case | Handling |
|---|---|
| Invalid/404/timeout company URL | Crawl fails gracefully, recorded in `skipped_sources`; kit still generates with an honest thin brief |
| No discoverable hiring/about page | Same as above — `company_brief` explicitly says information was limited rather than fabricating one |
| Two-line JD | Extraction is instructed to under-report; a short requirement list is treated as correct, not a bug |
| No public discussion found | Search returns empty, recorded, no fabricated "known for X interview style" claims |
| Invalid/incomplete LLM JSON | One repair attempt (salvage the first `{...}`/`[...]` block), then a typed `LlmError` the pipeline step catches and records as a warning rather than crashing the run |
| Rate limit / transient provider failure | `withRetry` + a shared per-process rate limiter (`src/lib/rateLimit.ts`) — exponential backoff with jitter, retry budget per call |
| Same JD + company submitted twice | Content-hashed (`sha256(jd+company_url+days)`) per user; a repeat submission reopens the existing kit instead of re-generating |
| 1-day / 60-day schedule | See "Schedule allocation" above — both produce exactly that many days |

## Security

- **SSRF guard** (`src/lib/security/urlGuard.ts`): every outbound fetch resolves the hostname and rejects private/loopback/link-local ranges when `NODE_ENV=production`; `http(s)` only.
- **Content restrictions**: allowlisted content types (`text/html`, `text/plain`, `application/xhtml+xml`) and a 3MB response cap, enforced before the body is read.
- **Prompt-injection posture**: every prompt that includes fetched-page or JD text wraps it in `<untrusted_content>` tags with an explicit system-level instruction to treat that text as data, never as instructions — this applies uniformly to the JD, crawled pages, and search snippets, since all three are text the app didn't write.
- **Auth**: bcrypt-hashed passwords, httpOnly signed JWT session cookies (7-day expiry), every kit-scoped API route re-checks ownership server-side (`ownerId` match) regardless of what the client sends.
- Kit structure is validated (zod + referential integrity) before every save, not just at generation time — an edit that would leave a dangling `requirement_ids`/`question_ids` reference is rejected with a 400, not silently persisted.

## Regeneration under concurrency / slow generation

Generation runs in the background via Next's `after()` (Vercel `waitUntil` under the hood) after the API immediately returns `202` with `status: "generating"` — the UI polls rather than holding a request open for up to a minute. A kit's `contentHash` also prevents a duplicate double-submit from starting a second generation for the same input.

**Known limitation**: if `after()` gets cut off by the platform's function-duration limit mid-run (worst case on a heavily rate-limited request), the kit can be left stuck in `"generating"`. There's no automatic timeout-to-failed transition in this submission — a stuck kit needs to be deleted and re-created. Given more time, the fix is a `updatedAt`-based staleness check that flips a kit to `"failed"` after N minutes without a status change.

## Practice mode ordering

Confidence-weighted, not a full spaced-repetition interval scheduler (`src/app/(app)/kits/[id]/practice/page.tsx`): unattempted cards sort first (they need coverage before anything else), then cards are ordered by the average of their last 3 confidence ratings, ascending. Chosen over an SM-2-style interval algorithm because this is a single-session practice queue, not a persistent daily review system — "drill what you're worst at right now" is both simpler to reason about and closer to how someone actually crams in the days before an interview.

## Key design decisions and trade-offs

Each of these was a real fork, and each cost something.

**Route Handlers instead of a separate Express service.** One deployment, no CORS, one env-var story. Cost: the app is a Next.js monolith, so the backend cannot be hosted independently of the frontend. Justified above under Tech stack.

**Groq over a larger, slower provider.** The pipeline makes many sequential calls, so latency per call compounds; Groq's free tier is genuinely free and fast. Cost: a tight tokens-per-minute budget. A real company site can exhaust a TPM window mid-run, so the client reads Groq's `x-ratelimit-reset-*` headers and waits out a full window rather than failing. That is why a heavy site takes minutes rather than seconds.

**Schedule allocation and coverage checking are plain code, never a prompt.** The brief requires this, and it also makes both testable and deterministic — the same kit always produces the same schedule. Cost: the schedule cannot use judgement a model might have about which topics pair well; it allocates by priority and difficulty only.

**Coverage stops after three passes.** First draft plus at most two gap-filling rounds, with an early exit when a pass fills nothing. Cost: a pathological posting could still ship with an uncovered `nice` requirement. Uncovered `must` requirements are the thing that matters, and those are what the loop targets.

**Confidence-weighted ordering instead of spaced repetition.** Practice is a single cram session before a dated interview, not a long-lived review queue, so "worst first" matches how the tool is actually used. Cost: no retention modelling across days. A proper interval scheduler would be better for a habit; it is wrong for a deadline.

**Origin tracking (`generated` / `edited` / `pinned`) rather than diffing.** Every item carries how it came to exist, so regeneration replaces only `generated` items. Cost: a user who edits an item and later wants the fresh version must delete it — an edit is treated as intent to keep.

**In-memory MongoDB when no connection string is configured.** A clean clone runs, and the batch entry point needs no database at all. Cost: data does not survive a restart locally, and production fails loudly rather than silently falling back.

**Known constraint: serverless function duration.** Generation runs inside the request's `after()` callback with `maxDuration = 60`. Light company sites finish in seconds; a large site with many crawlable pages can exceed 60s on Vercel's Hobby tier and is recorded as `failed` rather than hanging. Raising the plan limit or moving generation to a queue would remove this; both were out of scope for the timebox.

## Known limitations

- No email verification / password reset (explicitly out of scope per the brief).
- The stuck-in-`"generating"` edge case above.
- Public-discussion search depends on DuckDuckGo's HTML endpoint staying scrapeable and unblocked; there's no fallback provider.
- Schedule day reordering isn't supported (days are fixed by day number) — only question reordering within a category and category reassignment.
- No drag-and-drop; reordering uses up/down buttons, which is more keyboard-accessible but less immediate for mouse users.
