"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";
import { WarningCircle } from "@phosphor-icons/react";

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" }) {
  // No scale or shadow: state reads through colour alone, per the design system.
  const base =
    "inline-flex items-center justify-center gap-2 rounded-[var(--radius-lg)] text-base font-semibold transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed";
  // 48px floor on every button keeps touch targets legal even for icon-only actions.
  const sizes = size === "sm" ? "min-h-[48px] min-w-[48px] px-4 py-2 text-sm" : "min-h-[48px] px-8 py-4";
  const variants: Record<string, string> = {
    primary:
      "bg-[var(--color-accent)] text-[var(--color-accent-foreground)] hover:bg-[var(--color-accent-hover)] active:bg-[var(--color-accent-hover)]",
    secondary:
      "border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-raised)]",
    ghost: "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-raised)] hover:text-[var(--color-text)]",
    danger: "bg-[var(--color-danger)] text-white hover:bg-[#9c3a30] active:bg-[#9c3a30]",
  };
  return (
    <button className={`${base} ${sizes} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}

// Focus shifts the border to the accent. The visible ring comes from the global
// :focus-visible outline, not a box-shadow glow.
const fieldBase =
  "w-full rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-base text-[var(--color-text)] transition-colors duration-150 placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:outline-none focus-visible:outline-2 focus-visible:outline-[var(--color-accent)] focus-visible:outline-offset-2";

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldBase} ${className}`} {...props} />;
}

export function TextArea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldBase} resize-y ${className}`} {...props} />;
}

export function Card({ className = "", hover = false, children }: { className?: string; hover?: boolean; children: ReactNode }) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] transition-colors duration-150 ${
        hover ? "hover:border-[var(--color-border-strong)]" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "must" | "nice" | "neutral" | "danger" | "warning" | "accent"; children: ReactNode }) {
  const tones: Record<string, string> = {
    must: "bg-[var(--color-must-soft)] text-[var(--color-must)]",
    nice: "bg-[var(--color-nice-soft)] text-[var(--color-nice)]",
    neutral: "bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]",
    danger: "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
    warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
    accent: "bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
  };
  return <span className={`inline-flex items-center rounded-[var(--radius-sm)] px-2 py-1 text-[13px] font-medium ${tones[tone]}`}>{children}</span>;
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border)] px-6 py-16 text-center">
      <p className="type-subtitle text-[var(--color-text)]">{title}</p>
      {description && <p className="max-w-sm text-[var(--color-text-muted)]">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="animate-fade-slide-up flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-danger)]/40 bg-[var(--color-danger-soft)] px-4 py-3 text-[var(--color-danger)]"
    >
      <WarningCircle size={20} weight="fill" className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="type-label mb-2 block text-[var(--color-text)]">
      {children}
    </label>
  );
}

export function FadeIn({ delay = 0, className = "", children }: { delay?: number; className?: string; children: ReactNode }) {
  // CSS-driven: no mount state, so nothing to hydrate and no cascading render.
  // The global prefers-reduced-motion rule collapses it.
  return (
    <div className={`animate-fade-slide-up ${className}`} style={{ animationDelay: `${delay}s` }}>
      {children}
    </div>
  );
}
