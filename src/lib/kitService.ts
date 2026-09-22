import crypto from "node:crypto";
import type { Kit, KitMeta, Question, Flashcard, EditOrigin } from "@/types/kit";

export function computeContentHash(jd: string, companyUrl: string, days: number): string {
  const normalized = `${jd.trim().toLowerCase()}::${companyUrl.trim().toLowerCase()}::${days}`;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export function emptyMeta(): KitMeta {
  return {
    question_meta: {},
    flashcard_meta: {},
    brief_meta: null,
    schedule_meta: null,
    skipped_sources: [],
    practice_attempts: [],
  };
}

/** Stamps every currently-generated item as "generated" origin — called once, right after a fresh pipeline run produces a kit. */
export function initialMetaFor(kit: Kit): KitMeta {
  const meta = emptyMeta();
  const now = new Date().toISOString();
  for (const q of kit.questions) meta.question_meta[q.id] = { origin: "generated", updated_at: now };
  for (const f of kit.flashcards) meta.flashcard_meta[f.id] = { origin: "generated", updated_at: now };
  meta.brief_meta = { origin: "generated", updated_at: now };
  meta.schedule_meta = { origin: "generated", updated_at: now };
  return meta;
}

function questionContentEqual(a: Question, b: Question): boolean {
  return (
    a.prompt === b.prompt &&
    a.answer_outline === b.answer_outline &&
    a.category === b.category &&
    a.difficulty === b.difficulty &&
    JSON.stringify([...a.requirement_ids].sort()) === JSON.stringify([...b.requirement_ids].sort())
  );
}

function flashcardContentEqual(a: Flashcard, b: Flashcard): boolean {
  return (
    a.front === b.front &&
    a.back === b.back &&
    JSON.stringify([...a.requirement_ids].sort()) === JSON.stringify([...b.requirement_ids].sort())
  );
}

/**
 * This is the state-tracking core of the Builder: given the previously
 * saved kit+meta and a client-edited kit, works out which questions,
 * flashcards, the brief, and the schedule actually changed, and stamps
 * "edited" on anything that did (new items included) — without ever
 * downgrading something the user already pinned. Anything untouched keeps
 * its prior origin. This diff-based approach means the client never has to
 * self-report what it touched; the server is the source of truth for
 * generated vs. edited vs. pinned.
 */
export function reconcileMeta(previousKit: Kit, previousMeta: KitMeta, nextKit: Kit): KitMeta {
  const now = new Date().toISOString();
  const prevQuestionsById = new Map(previousKit.questions.map((q) => [q.id, q]));
  const prevFlashcardsById = new Map(previousKit.flashcards.map((f) => [f.id, f]));

  const nextQuestionMeta: KitMeta["question_meta"] = {};
  for (const q of nextKit.questions) {
    const priorMeta = previousMeta.question_meta[q.id];
    const priorQuestion = prevQuestionsById.get(q.id);
    nextQuestionMeta[q.id] = resolveMeta(priorMeta, priorQuestion ? questionContentEqual(priorQuestion, q) : false, now);
  }

  const nextFlashcardMeta: KitMeta["flashcard_meta"] = {};
  for (const f of nextKit.flashcards) {
    const priorMeta = previousMeta.flashcard_meta[f.id];
    const priorFlashcard = prevFlashcardsById.get(f.id);
    nextFlashcardMeta[f.id] = resolveMeta(priorMeta, priorFlashcard ? flashcardContentEqual(priorFlashcard, f) : false, now);
  }

  const briefChanged = JSON.stringify(previousKit.company_brief) !== JSON.stringify(nextKit.company_brief);
  const scheduleChanged = JSON.stringify(previousKit.schedule) !== JSON.stringify(nextKit.schedule);

  return {
    question_meta: nextQuestionMeta,
    flashcard_meta: nextFlashcardMeta,
    brief_meta: resolveMeta(previousMeta.brief_meta, !briefChanged, now),
    schedule_meta: resolveMeta(previousMeta.schedule_meta, !scheduleChanged, now),
    skipped_sources: previousMeta.skipped_sources,
    practice_attempts: previousMeta.practice_attempts,
  };
}

function resolveMeta(prior: { origin: EditOrigin; updated_at: string } | null | undefined, unchanged: boolean, now: string) {
  if (prior?.origin === "pinned") return prior; // pins are never silently downgraded
  if (!prior) return { origin: "edited" as const, updated_at: now }; // brand new item, added by hand
  if (unchanged) return prior;
  return { origin: "edited" as const, updated_at: now };
}

export interface RegenerationGuard {
  blocked: boolean;
  reason?: string;
}

/** Items with origin "generated" are free to be replaced by a regeneration; edited/pinned ones are not. */
export function isReplaceable(meta: { origin: EditOrigin } | null | undefined): boolean {
  return !meta || meta.origin === "generated";
}
