"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SignOut } from "@phosphor-icons/react";
import { api } from "@/lib/apiClient";
import { Button, Spinner } from "@/components/ui";

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
    <header className="sticky top-0 z-10 overflow-x-hidden border-b border-[var(--color-border)] bg-[var(--color-surface)]/85 backdrop-blur">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8" aria-label="Primary">
        <Link href="/dashboard" className="font-semibold tracking-tight text-[var(--color-text)]">
          Interview Prep Kit
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-[var(--color-text-muted)] sm:inline">{email}</span>
          <Button variant="ghost" size="sm" onClick={logout} disabled={loggingOut}>
            {loggingOut ? <Spinner className="h-3.5 w-3.5" /> : <SignOut size={16} />}
            {loggingOut ? "Logging out…" : "Log out"}
          </Button>
        </div>
      </nav>
    </header>
  );
}
