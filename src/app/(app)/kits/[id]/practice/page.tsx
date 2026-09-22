"use client";

import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
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
 * and a card never attempted goes to the very front — it needs coverage
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

  const attempts = useMemo(() => [...(doc?.meta.practice_attempts ?? []), ...localAttempts], [doc, localAttempts]);
  const queue = useMemo(() => (doc?.kit ? orderByLeastConfident(doc.kit.flashcards, attempts) : []), [doc, attempts]);

  if (loadError) return <ErrorBanner message={loadError} />;
  if (!doc) {
    return (
      <main className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-16 text-[var(--color-text-muted)]">
        <Spinner /> Loading…
      </main>
    );
  }
  if (!doc.kit || doc.kit.flashcards.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <EmptyState title="No flashcards to practise yet" description="Generate or add flashcards in the builder first." action={<Link href={`/kits/${params.id}`} className="text-sm text-[var(--color-accent)] hover:underline">← Back to kit</Link>} />
      </main>
    );
  }

  const attemptedIds = new Set(attempts.map((a) => a.flashcard_id));
  const coveredCount = doc.kit.flashcards.filter((f) => attemptedIds.has(f.id)).length;
  const current = queue[index % queue.length];
  const done = index >= queue.length;

  async function rate(confidence: 1 | 2 | 3 | 4 | 5) {
    if (!current) return;
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
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/kits/${params.id}`} className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          ← Back to kit
        </Link>
        <Badge tone="accent">
          {coveredCount}/{doc.kit.flashcards.length} covered
        </Badge>
      </div>

      <h1 className="mb-1 text-xl font-semibold">Practice session</h1>
      <p className="mb-6 text-sm text-[var(--color-text-muted)]">Ordered by what you were least confident about.</p>

      {done ? (
        <Card className="p-8 text-center">
          <p className="mb-4 font-medium">Session complete - {queue.length} cards reviewed.</p>
          <Button
            onClick={() => {
              setIndex(0);
              setRevealed(false);
            }}
          >
            Practise again
          </Button>
        </Card>
      ) : (
        <Card className="p-8">
          <p className="mb-1 text-xs text-[var(--color-text-faint)]">
            Card {(index % queue.length) + 1} of {queue.length}
          </p>
          <p className="min-h-16 text-lg font-medium">{current.front}</p>

          {revealed ? (
            <>
              <hr className="my-4 border-[var(--color-border)]" />
              <p className="text-[var(--color-text-muted)]">{current.back || "No answer written for this card."}</p>
              <div className="mt-6">
                <p className="mb-2 text-sm font-medium">How confident did you feel?</p>
                <div className="flex flex-wrap gap-2">
                  {([1, 2, 3, 4, 5] as const).map((c) => (
                    <Button key={c} size="sm" variant="secondary" disabled={submitting} onClick={() => rate(c)}>
                      {c} · {CONFIDENCE_LABELS[c]}
                    </Button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <Button className="mt-6" onClick={() => setRevealed(true)}>
              Reveal answer
            </Button>
          )}
        </Card>
      )}
    </main>
  );
}
