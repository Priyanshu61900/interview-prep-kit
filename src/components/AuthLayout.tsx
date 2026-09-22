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
    <div className="min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col">
      {/* Hero section with branding */}
      <div className="flex-1 flex flex-col justify-center px-6 py-20 sm:px-8 md:py-24 border-b border-[var(--color-border)]" style={{ animation: 'slide-in-right 600ms cubic-bezier(0.23, 1, 0.32, 1) forwards' }}>
        <div className="mx-auto w-full max-w-2xl">
          <div className="space-y-8">
            <div className="space-y-4" style={{ animation: 'slide-up 500ms cubic-bezier(0.23, 1, 0.32, 1) 100ms forwards' }}>
              <h1 className="text-5xl font-bold text-[var(--color-text)]">Interview Prep Kit</h1>
              <p className="text-lg text-[var(--color-text-muted)] max-w-lg">Build personalized study plans from job descriptions and company research. Everything you need to ace the interview.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
              {PILLARS.map(({ icon: Icon, label }, i) => (
                <div
                  key={label}
                  className="flex gap-3"
                  style={{ animation: `slide-up 500ms cubic-bezier(0.23, 1, 0.32, 1) ${200 + i * 80}ms forwards` }}
                >
                  <Icon size={20} weight="bold" className="mt-0 shrink-0 text-[var(--color-accent)]" aria-hidden="true" />
                  <p className="text-sm leading-relaxed text-[var(--color-text-muted)]">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Form section */}
      <div className="flex-1 flex flex-col justify-center px-6 py-20 sm:px-8 md:py-24" style={{ animation: 'slide-up 500ms cubic-bezier(0.23, 1, 0.32, 1) 200ms forwards' }}>
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 space-y-2">
            <h2 className="text-3xl font-bold text-[var(--color-text)]">{title}</h2>
            <p className="text-sm text-[var(--color-text-muted)]">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
