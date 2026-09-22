"use client";

import type { ButtonHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from "react";
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
    "inline-flex items-center justify-center gap-2 font-medium transition-[background-color,border-color,box-shadow] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] disabled:opacity-50 disabled:cursor-not-allowed";
  const isPrimary = variant === "primary";
  const shape = isPrimary ? "rounded-full" : "rounded-[var(--radius-md)]";
  const sizes = size === "sm" ? "px-3.5 py-1.5 text-sm" : isPrimary ? "px-5 py-2.5 text-sm" : "px-4 py-2.5 text-sm";
  const variants: Record<string, string> = {
    primary: "bg-[var(--color-accent)] text-[var(--color-accent-foreground)] hover:bg-[var(--color-accent-hover)] shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_8px_20px_-6px_var(--color-accent)]",
    secondary: "bg-[var(--color-surface)] text-[var(--color-text)] border border-[var(--color-border-strong)] hover:border-[var(--color-accent)]",
    ghost: "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)]/60",
    danger: "bg-[var(--color-danger-soft)] text-[var(--color-danger)] hover:brightness-95",
  };
  return (
    <motion.button
      className={`${base} ${shape} ${sizes} ${variants[variant]} ${className}`}
      whileTap={reduce || props.disabled ? undefined : { scale: 0.97 }}
      whileHover={reduce || props.disabled || !isPrimary ? undefined : { y: -1 }}
      transition={{ duration: 0.18, ease: [0.32, 0.72, 0, 1] }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

const fieldBase =
  "w-full rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm text-[var(--color-text)] transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.32,0.72,0,1)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_var(--color-accent-soft)] focus:outline-none";

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldBase} ${className}`} {...props} />;
}

export function TextArea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldBase} ${className}`} {...props} />;
}

export function Card({ className = "", hover = false, children }: { className?: string; hover?: boolean; children: ReactNode }) {
  return (
    <div
      className={`rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card)] [box-shadow:var(--shadow-card),var(--inset-highlight)] transition-[transform,box-shadow,border-color] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
        hover ? "hover:-translate-y-1 hover:border-[var(--color-border-strong)] hover:[box-shadow:var(--shadow-card-hover),var(--inset-highlight)]" : ""
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
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
