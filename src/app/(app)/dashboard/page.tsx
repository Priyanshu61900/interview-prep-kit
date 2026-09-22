"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Trash, FileArrowUp, Sparkle, FolderOpen } from "@phosphor-icons/react";
import { api, ApiClientError } from "@/lib/apiClient";
import { Button, TextInput, TextArea, Label, Card, Badge, ErrorBanner, EmptyState, Spinner, Skeleton, FadeIn } from "@/components/ui";

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
      <FadeIn>
        <h1 className="text-2xl font-semibold tracking-tight">Your interview prep kits</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">Paste a job description and a company site to generate one.</p>
      </FadeIn>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--color-text-faint)]">Kits</h2>
          {listError && <ErrorBanner message={listError} />}
          {kits === null && !listError && (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          )}
          {kits?.length === 0 && (
            <EmptyState
              title="No kits yet"
              description="Create your first one using the form on the right."
              action={<FolderOpen size={28} className="text-[var(--color-text-faint)]" />}
            />
          )}
          <ul className="flex flex-col gap-3">
            <AnimatePresence initial={false}>
              {kits?.map((kit, i) => (
                <KitRow key={kit.id} kit={kit} index={i} onDeleted={load} />
              ))}
            </AnimatePresence>
          </ul>
        </div>

        <div className="flex flex-col gap-6">
          <FadeIn delay={0.05}>
            <CreateKitForm onCreated={load} />
          </FadeIn>
          <FadeIn delay={0.1}>
            <BatchImportForm onImported={load} />
          </FadeIn>
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
  if (kit.status === "partial") return `Ready · ${kit.uncoveredCount} gap${kit.uncoveredCount === 1 ? "" : "s"}`;
  return "Ready";
}

function KitRow({ kit, index, onDeleted }: { kit: KitSummary; index: number; onDeleted: () => void }) {
  const [deleting, setDeleting] = useState(false);
  const reduce = useReducedMotion();

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
    <motion.li
      layout
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35, delay: reduce ? 0 : index * 0.04, ease: [0.16, 1, 0.3, 1] }}
    >
      <Card hover className="flex items-center justify-between gap-4 p-4">
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
            {deleting ? <Spinner className="h-3.5 w-3.5" /> : <Trash size={16} />}
          </Button>
        </div>
      </Card>
    </motion.li>
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
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <Sparkle size={18} weight="fill" className="text-[var(--color-accent)]" />
        Create a kit
      </h2>
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
          {loading && <Spinner className="h-4 w-4" />}
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
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <FileArrowUp size={18} weight="fill" className="text-[var(--color-accent)]" />
        Prepare for multiple roles
      </h2>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        Upload a JSON file: an array of <code className="rounded bg-[var(--color-border)] px-1 py-0.5 text-xs">{"{ jd, company_url, days }"}</code> objects.
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
          {loading && <Spinner className="h-4 w-4" />}
          {loading ? "Uploading…" : "Import & generate"}
        </Button>
      </form>
    </Card>
  );
}
