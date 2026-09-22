"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/AuthLayout";
import { Button, TextInput, Label, ErrorBanner, Spinner } from "@/components/ui";
import { api, ApiClientError } from "@/lib/apiClient";

export default function RegisterPage() {
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
      await api.post("/api/auth/register", { email, password });
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell title="Create your account" subtitle="One posting in, one study plan out.">
      <form onSubmit={onSubmit} className="flex flex-col gap-6" noValidate>
        {error && <ErrorBanner message={error} />}
        <div>
          <Label htmlFor="email">Email</Label>
          <TextInput id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <TextInput
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            aria-describedby="password-hint"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p id="password-hint" className="mt-2 text-sm text-[var(--color-text-muted)]">
            Eight characters or more. Make it one you&rsquo;ll remember.
          </p>
        </div>
        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading && <Spinner className="h-4 w-4" />}
          {loading ? "Setting things up…" : "Start your prep kit"}
        </Button>
      </form>
      <p className="mt-10 text-[var(--color-text-muted)]">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[var(--color-accent)] underline underline-offset-4">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
