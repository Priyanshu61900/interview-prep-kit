"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/apiClient";
import { Button } from "@/components/ui";

export function AppNav({ email }: { email: string }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await api.post("/api/auth/logout");
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6" aria-label="Primary">
        <Link href="/dashboard" className="font-semibold tracking-tight text-[var(--color-text)]">
          Interview Prep Kit
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-[var(--color-text-muted)] sm:inline">{email}</span>
          <Button variant="ghost" size="sm" onClick={logout} disabled={loggingOut}>
            {loggingOut ? "Logging out…" : "Log out"}
          </Button>
        </div>
      </nav>
    </header>
  );
}
