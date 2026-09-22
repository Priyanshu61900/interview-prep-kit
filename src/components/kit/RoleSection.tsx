import type { Kit } from "@/types/kit";
import { Card, Badge } from "@/components/ui";

export function RoleSection({ kit }: { kit: Kit }) {
  return (
    <Card className="p-5">
      <h3 className="font-semibold">Role breakdown</h3>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-[var(--color-text-faint)]">Title</dt>
          <dd>{kit.role.title || "—"}</dd>
        </div>
        <div>
          <dt className="text-[var(--color-text-faint)]">Seniority</dt>
          <dd>{kit.role.seniority || "—"}</dd>
        </div>
      </dl>

      {kit.role.responsibilities.length > 0 && (
        <>
          <h4 className="mt-4 text-sm font-medium">Responsibilities</h4>
          <ul className="mt-1 list-disc pl-5 text-sm text-[var(--color-text-muted)]">
            {kit.role.responsibilities.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </>
      )}

      <h4 className="mt-4 text-sm font-medium">Requirements</h4>
      {kit.role.requirements.length === 0 ? (
        <p className="mt-1 text-sm text-[var(--color-text-faint)]">
          No specific requirements could be extracted from this job description — it may be too thin to work from.
        </p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {kit.role.requirements.map((r) => (
            <li key={r.id} className="flex items-center gap-2 text-sm">
              <Badge tone={r.priority === "must" ? "must" : "nice"}>{r.priority}</Badge>
              <Badge tone="neutral">{r.kind}</Badge>
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
