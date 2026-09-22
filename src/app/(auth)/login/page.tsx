"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/AuthLayout";
import { Button, TextInput, Label, ErrorBanner, Spinner } from "@/components/ui";
import { api, ApiClientError } from "@/lib/apiClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/login", { email, password });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Your kits are where you left them.">
      <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
        {error && <ErrorBanner message={error} />}
        <div>
          <Label htmlFor="email">Email</Label>
          <TextInput id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <TextInput id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading && <Spinner className="h-4 w-4" />}
          {loading ? "Logging in…" : "Log in"}
        </Button>
      </form>
      <p className="mt-10 text-[var(--color-text-muted)]">
        First time here?{" "}
        <Link href="/register" className="font-semibold text-[var(--color-accent)] underline underline-offset-4">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
