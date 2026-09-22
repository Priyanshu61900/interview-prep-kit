"use client";

import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { Target, MapTrifold, Cards } from "@phosphor-icons/react";

const PILLARS = [
  { icon: Target, label: "Requirements extracted and prioritised from the posting itself" },
  { icon: MapTrifold, label: "Company research crawled and cited, not invented" },
  { icon: Cards, label: "Questions, flashcards and a day-by-day schedule, all editable" },
];

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-br from-[var(--color-bg)] via-[var(--color-surface)] to-[var(--color-bg)] text-[var(--color-text)] flex flex-col lg:flex-row">
      {/* Left: Dark brand showcase with grid backdrop */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 py-16 relative overflow-hidden"
        style={{ animation: 'slide-in-left 600ms cubic-bezier(0.23, 1, 0.32, 1) forwards' }}
      >
        {/* Subtle animated gradient backdrop */}
        <div className="absolute inset-0 opacity-[0.02]" style={{backgroundImage: 'radial-gradient(circle at 20% 50%, var(--color-accent) 0%, transparent 50%), radial-gradient(circle at 80% 80%, var(--color-accent) 0%, transparent 50%)'}}></div>

        {/* Content */}
        <div className="relative space-y-16 max-w-md">
          <div className="space-y-6" style={{ animation: 'slide-up 500ms cubic-bezier(0.23, 1, 0.32, 1) 150ms forwards' }}>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">Interview Prep Kit</p>
              <h1 className="text-5xl font-bold leading-tight tracking-tight text-[var(--color-text)]">
                Prepare with intelligence.
              </h1>
            </div>
            <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">
              Extract requirements from job postings. Research companies accurately. Practice with precision. Everything sourced from public information.
            </p>
          </div>

          <div className="space-y-3 border-t border-[var(--color-border)] pt-8">
            {PILLARS.map(({ icon: Icon, label }, i) => (
              <div
                key={label}
                className="flex gap-3"
                style={{ animation: `slide-up 500ms cubic-bezier(0.23, 1, 0.32, 1) ${300 + i * 60}ms forwards` }}
              >
                <Icon size={18} weight="bold" className="mt-0.5 shrink-0 text-[var(--color-text)]" aria-hidden="true" />
                <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Clean, aligned login form */}
      <div
        className="w-full lg:w-1/2 flex flex-col justify-center px-6 py-16 sm:px-8 lg:px-12 lg:border-l lg:border-[var(--color-border)]"
        style={{ animation: 'slide-in-right 600ms cubic-bezier(0.23, 1, 0.32, 1) forwards' }}
      >
        <div className="w-full max-w-sm" style={{ animation: 'slide-up 500ms cubic-bezier(0.23, 1, 0.32, 1) 200ms forwards' }}>
          <div className="mb-12 space-y-3">
            <h2 className="text-xl font-semibold tracking-tight text-[var(--color-text)]">{title}</h2>
            <p className="text-xs text-[var(--color-text-muted)]">{subtitle}</p>
          </div>

          {children}

          <div className="mt-12 space-y-3 border-t border-[var(--color-border)] pt-12 lg:hidden" style={{ animation: 'slide-up 500ms cubic-bezier(0.23, 1, 0.32, 1) 400ms forwards' }}>
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--color-text-faint)]">Why use this</p>
            <div className="space-y-3">
              {PILLARS.map(({ icon: Icon, label }, i) => (
                <div
                  key={label}
                  className="flex gap-3"
                  style={{ animation: `slide-up 500ms cubic-bezier(0.23, 1, 0.32, 1) ${450 + i * 50}ms forwards` }}
                >
                  <Icon size={16} weight="bold" className="mt-0.5 shrink-0 text-[var(--color-text)]" aria-hidden="true" />
                  <p className="text-xs leading-relaxed text-[var(--color-text-muted)]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
