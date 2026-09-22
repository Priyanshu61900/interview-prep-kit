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
    "inline-flex items-center justify-center gap-2 font-medium transition-[transform,box-shadow] duration-160 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.96] disabled:opacity-50 disabled:cursor-not-allowed relative";
  const isPrimary = variant === "primary";
  const shape = isPrimary ? "rounded-full" : "rounded-xl";
  const sizes = size === "sm" ? "px-3.5 py-1.5 text-sm" : isPrimary ? "px-6 py-3 text-sm" : "px-4 py-2.5 text-sm";
  const variants: Record<string, string> = {
    primary: "bg-[var(--color-accent)] text-[var(--color-accent-foreground)] hover:bg-[var(--color-accent-hover)] shadow-lg hover:shadow-xl",
    secondary: "border border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-raised)]",
    ghost: "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]/50",
    danger: "bg-[var(--color-danger)] text-white hover:brightness-110 shadow-lg",
  };
  return (
    <motion.button
      className={`${base} ${shape} ${sizes} ${variants[variant]} ${className}`}
      whileTap={reduce || props.disabled ? undefined : { scale: 0.96 }}
      whileHover={reduce || props.disabled ? undefined : { y: -1 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      {...props}
    >
      {children}
    </motion.button>
  );
}

const fieldBase =
  "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-raised)] px-4 py-3 text-sm text-[var(--color-text)] transition-[border-color,box-shadow,background-color] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] placeholder:text-[var(--color-text-faint)] focus:border-[var(--color-accent)] focus:bg-[var(--color-surface)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20";

export function TextInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldBase} ${className}`} {...props} />;
}

export function TextArea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${fieldBase} resize-none ${className}`} {...props} />;
}

export function Card({ className = "", hover = false, children }: { className?: string; hover?: boolean; children: ReactNode }) {
  return (
    <div className={`rounded-2xl overflow-hidden ${className}`}>
      <div className="rounded-2xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-raised)] p-1 shadow-lg">
        <div className={`rounded-[1.5rem] bg-[var(--color-surface)] p-6 ${
          hover ? "transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:shadow-xl" : ""
        }`}>
          {children}
        </div>
      </div>
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
