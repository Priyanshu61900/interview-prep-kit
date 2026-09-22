"use client";

import { useState } from "react";
import type { Kit } from "@/types/kit";
import { Button, TextArea, Card } from "@/components/ui";

export function CompanyBriefSection({
  kit,
  onChange,
  onRegenerate,
}: {
  kit: Kit;
  onChange: (mutator: (kit: Kit) => Kit) => void;
  onRegenerate: (force: boolean) => Promise<void>;
}) {
  const [regenerating, setRegenerating] = useState(false);

  function update(patch: Partial<Kit["company_brief"]>) {
    onChange((k) => ({ ...k, company_brief: { ...k.company_brief, ...patch } }));
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      await onRegenerate(false);
    } catch (err) {
      if (err instanceof Error && err.message.includes("manually edited")) {
        if (confirm("This brief has been manually edited. Regenerate it anyway and lose those edits?")) {
          await onRegenerate(true).catch(() => {});
        }
      }
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold">Company brief</h3>
        <Button variant="secondary" size="sm" onClick={handleRegenerate} disabled={regenerating}>
          {regenerating ? "Regenerating…" : "Regenerate"}
        </Button>
      </div>
      <label className="text-xs text-[var(--color-text-muted)]" htmlFor="brief-summary">
        Summary
      </label>
      <TextArea id="brief-summary" rows={2} value={kit.company_brief.summary} onChange={(e) => update({ summary: e.target.value })} />
      <label className="mt-3 block text-xs text-[var(--color-text-muted)]" htmlFor="brief-what">
        What they do
      </label>
      <TextArea id="brief-what" rows={3} value={kit.company_brief.what_they_do} onChange={(e) => update({ what_they_do: e.target.value })} />
      {kit.company_brief.sources.length > 0 && (
        <div className="mt-3">
          <p className="text-xs text-[var(--color-text-faint)]">Sources</p>
          <ul className="mt-1 flex flex-col gap-0.5">
            {kit.company_brief.sources.map((src) => (
              <li key={src} className="truncate text-xs">
                <a href={src} target="_blank" rel="noreferrer" className="text-[var(--color-accent)] hover:underline">
                  {src}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
