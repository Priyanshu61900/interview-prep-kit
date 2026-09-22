"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiClientError } from "@/lib/apiClient";
import { Button, TextInput, TextArea, Label, Card, Badge, ErrorBanner, EmptyState, Spinner } from "@/components/ui";

interface KitSummary {
  id: string;
  title: string;
  status: "generating" | "ready" | "partial" | "failed";
  error: string | null;
  company: string | null;
  role: string | null;
  uncoveredCount: number | null;
  createdAt: string;
  updatedAt: string;
}

export default function DashboardPage() {
  const [kits, setKits] = useState<KitSummary[] | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get<{ kits: KitSummary[] }>("/api/kits");
      setKits(data.kits);
      setListError(null);
    } catch (err) {
      setListError(err instanceof ApiClientError ? err.message : "Could not load your kits.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const hasGenerating = kits?.some((k) => k.status === "generating") ?? false;
    if (hasGenerating) {
      pollRef.current = setInterval(load, 4000);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [kits, load]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Your interview prep kits</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)]">Paste a job description and a company site to generate one.</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">Kits</h2>
          {listError && <ErrorBanner message={listError} />}
          {kits === null && !listError && (
            <div className="flex items-center gap-2 py-12 text-[var(--color-text-muted)]">
              <Spinner /> Loading your kits…
            </div>
          )}
          {kits?.length === 0 && (
            <EmptyState title="No kits yet" description="Create your first one using the form on the right." />
          )}
          <ul className="flex flex-col gap-3">
            {kits?.map((kit) => (
              <KitRow key={kit.id} kit={kit} onDeleted={load} />
            ))}
          </ul>
        </div>

        <div className="flex flex-col gap-6">
          <CreateKitForm onCreated={load} />
          <BatchImportForm onImported={load} />
        </div>
      </div>
    </main>
  );
}

function statusTone(status: KitSummary["status"]): "accent" | "nice" | "warning" | "danger" {
  if (status === "generating") return "accent";
  if (status === "ready") return "nice";
  if (status === "partial") return "warning";
  return "danger";
}

function statusLabel(kit: KitSummary): string {
  if (kit.status === "generating") return "Generating…";
  if (kit.status === "failed") return "Failed";
  if (kit.status === "partial") return `Ready — ${kit.uncoveredCount} gap${kit.uncoveredCount === 1 ? "" : "s"}`;
  return "Ready";
}

function KitRow({ kit, onDeleted }: { kit: KitSummary; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);

  async function onDelete() {
    if (!confirm(`Delete "${kit.title}"? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      await api.del(`/api/kits/${kit.id}`);
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card className="flex items-center justify-between gap-4 p-4">
      <Link href={`/kits/${kit.id}`} className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium text-[var(--color-text)]">{kit.role ?? kit.title}</p>
          {kit.status === "generating" && <Spinner className="h-3.5 w-3.5 text-[var(--color-accent)]" />}
        </div>
        <p className="truncate text-sm text-[var(--color-text-muted)]">{kit.company ?? "—"}</p>
      </Link>
      <div className="flex shrink-0 items-center gap-3">
        <Badge tone={statusTone(kit.status)}>{statusLabel(kit)}</Badge>
        <Button variant="ghost" size="sm" onClick={onDelete} disabled={deleting} aria-label={`Delete ${kit.title}`}>
          {deleting ? "…" : "Delete"}
        </Button>
      </div>
    </Card>
  );
}

function CreateKitForm({ onCreated }: { onCreated: () => void }) {
  const router = useRouter();
  const [jd, setJd] = useState("");
  const [companyUrl, setCompanyUrl] = useState("");
  const [days, setDays] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await api.post<{ id: string; duplicate?: boolean }>("/api/kits", { jd, company_url: companyUrl, days });
      onCreated();
      router.push(`/kits/${res.id}`);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not create this kit.");
      setLoading(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-4 font-semibold">Create a kit</h2>
      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
        {error && <ErrorBanner message={error} />}
        <div>
          <Label htmlFor="jd">Job description</Label>
          <TextArea id="jd" required rows={8} placeholder="Paste the full job description here…" value={jd} onChange={(e) => setJd(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="company_url">Company website</Label>
          <TextInput id="company_url" type="url" required placeholder="https://example.com" value={companyUrl} onChange={(e) => setCompanyUrl(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="days">Days until interview</Label>
          <TextInput id="days" type="number" min={1} max={120} required value={days} onChange={(e) => setDays(Number(e.target.value))} />
        </div>
        <Button type="submit" disabled={loading}>
          {loading ? "Starting…" : "Generate kit"}
        </Button>
      </form>
    </Card>
  );
}

function BatchImportForm({ onImported }: { onImported: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await api.postForm<{ created: { id: string }[] }>("/api/kits/import", form);
      setMessage(`Started generating ${res.created.length} kit${res.created.length === 1 ? "" : "s"}.`);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
      onImported();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not import that file.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5">
      <h2 className="mb-1 font-semibold">Prepare for multiple roles</h2>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        Upload a JSON file: an array of <code className="rounded bg-black/5 px-1 py-0.5 text-xs">{"{ jd, company_url, days }"}</code> objects.
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {error && <ErrorBanner message={error} />}
        {message && <p className="text-sm text-[var(--color-nice)]">{message}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="application/json"
          aria-label="Upload job description and company pairs JSON file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm text-[var(--color-text-muted)] file:mr-3 file:rounded-[var(--radius-md)] file:border-0 file:bg-[var(--color-accent-soft)] file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-[var(--color-accent)]"
        />
        <Button type="submit" variant="secondary" disabled={!file || loading}>
          {loading ? "Uploading…" : "Import & generate"}
        </Button>
      </form>
    </Card>
  );
}
