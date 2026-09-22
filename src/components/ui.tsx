"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";
import { useState, useEffect } from "react";
import { motion, useReducedMotion, type HTMLMotionProps } from "motion/react";
import { WarningCircle } from "@phosphor-icons/react";

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: Omit<HTMLMotionProps<"button">, "ref"> & { variant?: "primary" | "secondary" | "ghost" | "danger"; size?: "sm" | "md" }) {
  const reduce = useReducedMotion();
  const base =
    "inline-flex items-center justify-center gap-2 font-medium transition-[color,background-color,border-color,box-shadow] duration-150 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed";
  const isPrimary = variant === "primary";
  const shape = "rounded-lg";
  const sizes = size === "sm" ? "px-3 py-1.5 text-xs font-semibold" : isPrimary ? "px-5 py-2.5 text-sm font-semibold" : "px-4 py-2 text-sm font-medium";
  const variants: Record<string, string> = {
    primary: "bg-[var(--color-accent)] text-[var(--color-accent-foreground)] hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:ring-offset-2 focus:ring-offset-[var(--color-bg)]",
    secondary: "border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-raised)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-strong)]/30",
    ghost: "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-text-muted)]/20",
    danger: "bg-[var(--color-danger)] text-white hover:bg-[#dc2626] focus:outline-none focus:ring-2 focus:ring-[var(--color-danger)]/30 focus:ring-offset-2 focus:ring-offset-[var(--color-bg)]",
  };
  return (
    <motion.button
      className={`${base} ${shape} ${sizes} ${variants[variant]} ${className}`}
      whileTap={reduce || props.disabled ? undefined : { scale: 0.98 }}
      transition={{ duration: 0.15 }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

const fieldBase =
  "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 text-sm text-[var(--color-text)] transition-[border-color,box-shadow] duration-150 placeholder:text-[var(--color-text-faint)] focus:outline-none focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20";

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldBase} ${className}`} {...props} />;
}

export function TextArea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldBase} resize-none ${className}`} {...props} />;
}

export function Card({ className = "", hover = false, children }: { className?: string; hover?: boolean; children: ReactNode }) {
  return (
    <div
      className={`rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-200 ${
        hover ? "hover:border-[var(--color-border-strong)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]" : ""
      } ${className}`}
    >
      <div className="p-6">{children}</div>
    </div>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "must" | "nice" | "neutral" | "danger" | "warning" | "accent"; children: ReactNode }) {
  const tones: Record<string, string> = {
    must: "bg-[var(--color-must-soft)] text-[var(--color-must)]",
    nice: "bg-[var(--color-nice-soft)] text-[var(--color-nice)]",
    neutral: "bg-[var(--color-border)] text-[var(--color-text-muted)]",
    danger: "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
    warning: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
    accent: "bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function Spinner({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="animate-fade-in flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-strong)] px-6 py-12 text-center">
      <p className="font-medium text-[var(--color-text)]">{title}</p>
      {description && <p className="max-w-sm text-sm text-[var(--color-text-muted)]">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="animate-fade-slide-up flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-danger)]/30 bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]"
    >
      <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

export function Label({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
      {children}
    </label>
  );
}

export function FadeIn({ delay = 0, className = "", children }: { delay?: number; className?: string; children: ReactNode }) {
  const reduce = useReducedMotion();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return (
    <motion.div
      className={className}
      initial={isClient && !reduce ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: isClient ? delay / 1000 : 0, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
