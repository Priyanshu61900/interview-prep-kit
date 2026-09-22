import type { ReactNode } from "react";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">{title}</h1>
          <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">{subtitle}</p>
        </div>
        {children}
      </div>
    </main>
  );
}
