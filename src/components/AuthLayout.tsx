import type { ReactNode } from "react";
import { Target, MapTrifold, Cards } from "@phosphor-icons/react/dist/ssr";
import { FadeIn } from "@/components/ui";

const PILLARS = [
  { icon: Target, label: "Requirements extracted and prioritised from the posting itself" },
  { icon: MapTrifold, label: "Company research crawled and cited, not invented" },
  { icon: Cards, label: "Questions, flashcards and a day-by-day schedule, all editable" },
];

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <aside className="relative hidden min-h-svh flex-col justify-between overflow-hidden bg-[var(--color-text)] px-12 py-12 text-[var(--color-bg)] lg:flex">
        <div className="relative z-10 font-semibold tracking-tight">Interview Prep Kit</div>

        <div className="relative z-10 max-w-md">
          <p className="text-3xl font-semibold leading-[1.15] tracking-tight">
            Turn a job posting into a kit you can actually study from.
          </p>
          <ul className="mt-10 flex flex-col gap-5">
            {PILLARS.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-start gap-3 text-sm text-[var(--color-bg)]/75">
                <Icon size={18} weight="bold" className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
                {label}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative z-10 text-xs text-[var(--color-bg)]/45">Researched from the open web. Nothing invented.</p>
      </aside>

      <main className="flex min-h-svh items-center justify-center px-4 py-12 sm:px-6">
        <FadeIn className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <span className="font-semibold tracking-tight text-[var(--color-text)]">Interview Prep Kit</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">{title}</h1>
          <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </FadeIn>
      </main>
    </div>
  );
}
