"use client";

import { useState } from "react";
import { Plus, PushPin, Trash } from "@phosphor-icons/react";
import type { Kit, Flashcard, EditOrigin } from "@/types/kit";
import { Button, TextArea, Card, Badge, FadeIn } from "@/components/ui";

function nextId(items: { id: string }[]): string {
  const max = items.reduce((m, i) => {
    const n = Number(i.id.replace(/^f/, ""));
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `f${max + 1}`;
}

export function FlashcardsSection({
  kit,
  flashcardMeta,
  onChange,
  onPin,
}: {
  kit: Kit;
  flashcardMeta: Record<string, { origin: EditOrigin; updated_at: string }>;
  onChange: (mutator: (kit: Kit) => Kit) => void;
  onPin: (itemId: string, pinned: boolean) => void;
}) {
  const [showAdd, setShowAdd] = useState(false);

  function update(id: string, patch: Partial<Flashcard>) {
    onChange((k) => ({ ...k, flashcards: k.flashcards.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));
  }
  function remove(id: string) {
    onChange((k) => ({ ...k, flashcards: k.flashcards.filter((f) => f.id !== id) }));
  }
  function add() {
    onChange((k) => ({ ...k, flashcards: [...k.flashcards, { id: nextId(k.flashcards), front: "New card - edit me", back: "", requirement_ids: [] }] }));
    setShowAdd(false);
  }

  return (
    <section aria-labelledby="flashcards-heading">
      <div className="mb-3 flex items-center justify-between">
        <h3 id="flashcards-heading" className="font-semibold">
          Flashcards <span className="font-normal text-[var(--color-text-faint)]">({kit.flashcards.length})</span>
        </h3>
        <Button variant="secondary" size="sm" onClick={add}>
          <Plus size={14} /> Add flashcard
        </Button>
      </div>

      {kit.flashcards.length === 0 && <p className="text-sm text-[var(--color-text-faint)]">No flashcards yet.</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {kit.flashcards.map((f, i) => {
          const meta = flashcardMeta[f.id];
          const pinned = meta?.origin === "pinned";
          const edited = meta?.origin === "edited";
          return (
            <FadeIn key={f.id} delay={Math.min(i * 0.04, 0.3)}>
              <Card className="p-4">
                <div className="mb-2 flex items-center gap-1.5">
                  {edited && <Badge tone="accent">Edited</Badge>}
                  {pinned && <Badge tone="warning">Pinned</Badge>}
                </div>
                <label className="text-xs text-[var(--color-text-muted)]" htmlFor={`front-${f.id}`}>
                  Front
                </label>
                <TextArea id={`front-${f.id}`} rows={2} value={f.front} onChange={(e) => update(f.id, { front: e.target.value })} />
                <label className="mt-2 block text-xs text-[var(--color-text-muted)]" htmlFor={`back-${f.id}`}>
                  Back
                </label>
                <TextArea id={`back-${f.id}`} rows={2} value={f.back} onChange={(e) => update(f.id, { back: e.target.value })} />
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant={pinned ? "primary" : "ghost"} size="sm" onClick={() => onPin(f.id, !pinned)} aria-pressed={pinned}>
                    <PushPin size={14} weight={pinned ? "fill" : "regular"} /> {pinned ? "Pinned" : "Pin"}
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => remove(f.id)} aria-label="Delete flashcard">
                    <Trash size={14} />
                  </Button>
                </div>
              </Card>
            </FadeIn>
          );
        })}
      </div>
    </section>
  );
}
