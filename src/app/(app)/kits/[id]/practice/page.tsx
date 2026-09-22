"use client";

import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useKitEditor } from "@/lib/useKitEditor";
import { Button, Card, Badge, Spinner, ErrorBanner, EmptyState } from "@/components/ui";
import { api } from "@/lib/apiClient";
import type { Flashcard, PracticeAttempt } from "@/types/kit";

const CONFIDENCE_LABELS: Record<number, string> = {
  1: "No idea",
  2: "Shaky",
  3: "Okay",
  4: "Confident",
  5: "Nailed it",
};

/**
 * Orders the queue by least-confident-first: average of the last three
 * attempts per card (recent attempts weighted by simply taking the most
 * recent few, so an old bad attempt doesn't haunt a since-improved card),
 * and a card never attempted goes to the very front - it needs coverage
 * before anything else does. A confidence-weighted sort was chosen over a
 * full spaced-repetition interval scheduler because a single practice
 * session (not a persistent daily review queue) is this feature's whole
 * scope, and "practice what you're worst at first" is both simpler to
 * reason about and matches how people actually cram before an interview.
 */
function orderByLeastConfident(flashcards: Flashcard[], attempts: PracticeAttempt[]): Flashcard[] {
  const byCard = new Map<string, PracticeAttempt[]>();
  for (const a of attempts) {
    const list = byCard.get(a.flashcard_id) ?? [];
    list.push(a);
    byCard.set(a.flashcard_id, list);
  }

  function score(card: Flashcard): number {
    const cardAttempts = byCard.get(card.id);
    if (!cardAttempts || cardAttempts.length === 0) return -1; // unattempted first
    const recent = cardAttempts.slice(-3);
    return recent.reduce((sum, a) => sum + a.confidence, 0) / recent.length;
  }

  return [...flashcards].sort((a, b) => score(a) - score(b));
}

export default function PracticePage() {
  const params = useParams<{ id: string }>();
  const { doc, loadError } = useKitEditor(params.id);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [localAttempts, setLocalAttempts] = useState<PracticeAttempt[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const firstRatingRef = useRef<HTMLButtonElement>(null);

  const attempts = useMemo(() => [...(doc?.meta.practice_attempts ?? []), ...localAttempts], [doc, localAttempts]);
  const queue = useMemo(() => (doc?.kit ? orderByLeastConfident(doc.kit.flashcards, attempts) : []), [doc, attempts]);

  const done = queue.length > 0 && index >= queue.length;
  const current = done ? undefined : queue[index];

  const rate = useCallback(
    async (confidence: 1 | 2 | 3 | 4 | 5) => {
      if (!current || submitting) return;
      setSubmitting(true);
      const attempt: PracticeAttempt = { flashcard_id: current.id, confidence, attempted_at: new Date().toISOString() };
      setLocalAttempts((prev) => [...prev, attempt]);
      try {
        await api.post(`/api/kits/${params.id}/practice`, { flashcard_id: current.id, confidence });
      } finally {
        setSubmitting(false);
        setRevealed(false);
        setIndex((i) => i + 1);
      }
    },
    [current, submitting, params.id]
  );

  // Drilling is a keyboard activity: space turns the card, 1-5 scores it.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!current) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest('input, textarea, select, [contenteditable="true"]')) return;

      if (revealed && e.key >= "1" && e.key <= "5") {
        e.preventDefault();
        rate(Number(e.key) as 1 | 2 | 3 | 4 | 5);
        return;
      }
      // Space and Enter belong to whatever control has focus; only claim them
      // when the user is drilling with nothing focused.
      if (!revealed && !el?.closest("a, button") && (e.key === " " || e.key === "Enter")) {
        e.preventDefault();
        setRevealed(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, current, rate]);

  // Land focus on the rating scale once the answer is showing, so the
  // keyboard path continues without a hunt for the next control.
  useEffect(() => {
    if (revealed) firstRatingRef.current?.focus();
  }, [revealed]);

  if (loadError) return <ErrorBanner message={loadError} />;
  if (!doc) {
    return (
      <main className="mx-auto flex max-w-2xl items-center gap-2 px-6 py-16 text-[var(--color-text-muted)]">
        <Spinner /> Loading…
      </main>
    );
  }
  if (!doc.kit || doc.kit.flashcards.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16">
        <EmptyState
          title="No flashcards to practise yet"
          description="Generate or add flashcards in the builder first."
          action={
            <Link href={`/kits/${params.id}`} className="font-medium text-[var(--color-accent)] underline underline-offset-4">
              Back to kit
            </Link>
          }
        />
      </main>
    );
  }

  const attemptedIds = new Set(attempts.map((a) => a.flashcard_id));
  const coveredCount = doc.kit.flashcards.filter((f) => attemptedIds.has(f.id)).length;
  const total = doc.kit.flashcards.length;

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Link href={`/kits/${params.id}`} className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          Back to kit
        </Link>
        <Badge tone={coveredCount === total ? "accent" : "neutral"}>
          <span className="tabular">
            {coveredCount}/{total}
          </span>
          <span className="ml-1">covered</span>
        </Badge>
      </div>

      <h1 className="type-heading">Practice session</h1>
      <p className="mt-2 mb-8 text-[var(--color-text-muted)]">Least confident cards come first.</p>

      {done || !current ? (
        <Card className="p-10 text-center">
          <p className="type-subtitle">Session complete</p>
          <p className="mt-2 text-[var(--color-text-muted)]">
            <span className="tabular">{queue.length}</span> cards reviewed.
          </p>
          <Button
            className="mt-8"
            onClick={() => {
              setIndex(0);
              setRevealed(false);
            }}
          >
            Practise again
          </Button>
        </Card>
      ) : (
        <>
          <p className="type-label mb-3 text-[var(--color-text-faint)]">
            Card <span className="tabular">{index + 1}</span> of <span className="tabular">{queue.length}</span>
          </p>

          <div key={current.id} className="card-deal flashcard-scene">
            <div className={`flashcard ${revealed ? "is-flipped" : ""}`}>
              {/* Front carries the prompt, and the whole face is the affordance. */}
              <div className="flashcard-face flashcard-face-front" inert={revealed}>
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="flex min-h-64 w-full flex-col justify-between rounded-[var(--radius-lg)] bg-[var(--color-stock)] p-8 text-left text-[var(--color-stock-ink)] shadow-[0_18px_40px_rgba(0,0,0,0.55)] transition-transform hover:-translate-y-0.5"
                >
                  <span className="type-subtitle">{current.front}</span>
                  <span className="type-label mt-8 text-[var(--color-stock-ink-muted)]">Press space or click to turn over</span>
                </button>
              </div>

              <div className="flashcard-face flashcard-face-back" inert={!revealed}>
                <div className="flex min-h-64 w-full flex-col justify-between rounded-[var(--radius-lg)] border border-[var(--color-stock-edge)] bg-[var(--color-stock-back)] p-8 text-[var(--color-stock-ink)] shadow-[0_18px_40px_rgba(0,0,0,0.55)]">
                  <p aria-live="polite">{current.back || "No answer written for this card."}</p>
                  <div className="mt-8">
                    <p className="type-label mb-3">How confident did you feel?</p>
                    {/* Styled against the stock, not the dark app chrome. */}
                    <div className="flex flex-wrap gap-2">
                      {([1, 2, 3, 4, 5] as const).map((c, i) => (
                        <button
                          key={c}
                          ref={i === 0 ? firstRatingRef : undefined}
                          type="button"
                          disabled={submitting}
                          onClick={() => rate(c)}
                          className="min-h-[44px] rounded-[var(--radius-lg)] border border-[var(--color-stock-edge)] px-4 py-2 text-sm font-semibold text-[var(--color-stock-ink)] transition-colors hover:bg-[var(--color-stock-ink)] hover:text-[var(--color-stock)] disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <span className="tabular">{c}</span> · {CONFIDENCE_LABELS[c]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
