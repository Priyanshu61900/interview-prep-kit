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
    <div className="min-h-[100dvh] bg-[var(--color-bg)] text-[var(--color-text)] flex flex-col justify-center">
      {/* Single column centered form */}
      <div className="w-full flex flex-col px-6 py-16 sm:px-8" style={{ animation: 'slide-in-right 600ms cubic-bezier(0.23, 1, 0.32, 1) forwards' }}>
        <div className="mx-auto w-full max-w-md" style={{ animation: 'slide-up 500ms cubic-bezier(0.23, 1, 0.32, 1) 200ms forwards' }}>
          <div className="mb-8 space-y-2">
            <h2 className="text-2xl font-bold text-[var(--color-text)]">{title}</h2>
            <p className="text-sm text-[var(--color-text-muted)]">{subtitle}</p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
