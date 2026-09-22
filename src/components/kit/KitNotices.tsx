import type { Kit } from "@/types/kit";
import { Badge } from "@/components/ui";

export function CoverageBanner({ kit }: { kit: Kit }) {
  if (kit.coverage.uncovered_requirement_ids.length === 0) return null;
  const uncovered = kit.role.requirements.filter((r) => kit.coverage.uncovered_requirement_ids.includes(r.id));
  return (
    <div className="rounded-[var(--radius-md)] border border-[var(--color-warning)]/30 bg-[var(--color-warning-soft)] px-4 py-3 text-sm text-[var(--color-warning)]">
      <p className="font-medium">{uncovered.length} requirement{uncovered.length === 1 ? "" : "s"} still has no question after {kit.coverage.passes} generation pass{kit.coverage.passes === 1 ? "" : "es"}.</p>
      <ul className="mt-1 list-disc pl-5">
        {uncovered.map((r) => (
          <li key={r.id}>
            {r.text} <Badge tone={r.priority === "must" ? "must" : "nice"}>{r.priority}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ResearchNotices({ kit, meta, warnings }: { kit: Kit; meta: { skipped_sources: { url: string; reason: string }[] }; warnings: { step: string; message: string }[] }) {
  if (meta.skipped_sources.length === 0 && warnings.length === 0) return null;
  return (
    <details className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-black/[0.02] px-4 py-3 text-sm">
      <summary className="cursor-pointer font-medium text-[var(--color-text-muted)]">Research notes ({meta.skipped_sources.length + warnings.length})</summary>
      <div className="mt-2 flex flex-col gap-2">
        {meta.skipped_sources.length > 0 && (
          <div>
            <p className="text-xs font-medium text-[var(--color-text-faint)]">Sources that could not be retrieved</p>
            <ul className="mt-1 list-disc pl-5 text-[var(--color-text-muted)]">
              {meta.skipped_sources.map((s, i) => (
                <li key={i} className="break-all">
                  {s.url} - {s.reason}
                </li>
              ))}
            </ul>
          </div>
        )}
        {warnings.length > 0 && (
          <div>
            <p className="text-xs font-medium text-[var(--color-text-faint)]">Generation notes</p>
            <ul className="mt-1 list-disc pl-5 text-[var(--color-text-muted)]">
              {warnings.map((w, i) => (
                <li key={i}>
                  <span className="font-medium">{w.step}:</span> {w.message}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {kit.source.pages_used.length > 0 && (
        <div className="mt-2">
          <p className="text-xs font-medium text-[var(--color-text-faint)]">Pages used</p>
          <ul className="mt-1 list-disc pl-5 text-[var(--color-text-muted)]">
            {kit.source.pages_used.map((url) => (
              <li key={url} className="break-all">
                {url}
              </li>
            ))}
          </ul>
        </div>
      )}
    </details>
  );
}
