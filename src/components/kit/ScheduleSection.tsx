"use client";

import { useState } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";
import type { Kit } from "@/types/kit";
import { Button, TextInput, TextArea, Card, Badge, Spinner, FadeIn } from "@/components/ui";

export function ScheduleSection({
  kit,
  onChange,
  onRegenerate,
}: {
  kit: Kit;
  onChange: (mutator: (kit: Kit) => Kit) => void;
  onRegenerate: (days?: number) => Promise<void>;
}) {
  const [regenerating, setRegenerating] = useState(false);
  const [days, setDays] = useState(kit.schedule.days_available);
  const questionById = new Map(kit.questions.map((q) => [q.id, q]));

  function updateDay(dayNumber: number, patch: Partial<Kit["schedule"]["days"][number]>) {
    onChange((k) => ({
      ...k,
      schedule: { ...k.schedule, days: k.schedule.days.map((d) => (d.day === dayNumber ? { ...d, ...patch } : d)) },
    }));
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      await onRegenerate(days);
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <section aria-labelledby="schedule-heading">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 id="schedule-heading" className="font-semibold">
          Schedule <span className="font-normal text-[var(--color-text-faint)]">({kit.schedule.days.length} days)</span>
        </h3>
        <div className="flex items-center gap-2">
          <label htmlFor="days-input" className="text-sm text-[var(--color-text-muted)]">
            Days until interview
          </label>
          <TextInput id="days-input" type="number" min={1} max={120} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-20" />
          <Button variant="secondary" size="sm" onClick={handleRegenerate} disabled={regenerating}>
            {regenerating ? <Spinner className="h-3.5 w-3.5" /> : <ArrowsClockwise size={14} />}
            {regenerating ? "Regenerating…" : "Regenerate schedule"}
          </Button>
        </div>
      </div>

      <ol className="flex flex-col gap-3">
        {kit.schedule.days.map((day, i) => (
          <FadeIn key={day.day} delay={Math.min(i * 0.03, 0.3)}>
          <Card className="p-4">
            <div className="flex items-center justify-between gap-3">
              <Badge tone="accent">Day {day.day}</Badge>
              <div className="flex items-center gap-1.5">
                <TextInput
                  type="number"
                  min={0}
                  value={day.minutes}
                  onChange={(e) => updateDay(day.day, { minutes: Number(e.target.value) })}
                  className="w-20"
                  aria-label={`Minutes for day ${day.day}`}
                />
                <span className="text-xs text-[var(--color-text-faint)]">min</span>
              </div>
            </div>
            <TextArea
              rows={1}
              className="mt-2"
              value={day.focus}
              onChange={(e) => updateDay(day.day, { focus: e.target.value })}
              aria-label={`Focus for day ${day.day}`}
            />
            {day.question_ids.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {day.question_ids.map((qid) => (
                  <li key={qid}>
                    <Badge tone="neutral">{questionById.get(qid)?.prompt.slice(0, 40) ?? qid}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          </FadeIn>
        ))}
      </ol>
    </section>
  );
}
