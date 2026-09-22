import type { ReactNode } from "react";

const CAPABILITIES = [
  ["Ranked requirements", "The skills a posting actually tests, ordered by how much they count."],
  ["Company research", "Drawn from what the company has published, not invented."],
  ["A dated plan", "Flashcards and mock questions, sized to the days you have left."],
];

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    // Asymmetric on desktop: the argument gets more room than the form. Both
    // columns stay transparent so the drifting word field reads as one surface.
    <div className="grid min-h-[100dvh] grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
      <section className="flex flex-col justify-between gap-16 px-6 py-16 sm:px-10 lg:px-16 lg:py-24">
        <p className="type-label text-[var(--color-text-faint)]">Interview Prep Kit</p>

        <div className="max-w-xl">
          <h1 className="type-hero text-balance">Walk in knowing what they&rsquo;ll ask.</h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-[var(--color-text-muted)]">
            Paste a job posting. Get the skills it tests, what the company is building, and a day-by-day plan to close the gap.
          </p>
        </div>

        <ul className="max-w-md">
          {CAPABILITIES.map(([name, detail]) => (
            <li key={name} className="border-t border-[var(--color-border)] py-6 last:pb-0">
              <h2 className="type-label">{name}</h2>
              <p className="mt-2 text-[var(--color-text-muted)]">{detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col justify-center px-6 py-16 sm:px-10 lg:px-16">
        {/* The form is a lit panel so it separates from the moving background. */}
        <div className="mx-auto w-full max-w-[26rem] rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 lg:mx-0">
          <h2 className="type-heading">{title}</h2>
          <p className="mt-3 text-[var(--color-text-muted)]">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </section>
    </div>
  );
}
