"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Trash } from "@phosphor-icons/react";
import { api, ApiClientError } from "@/lib/apiClient";
import { Button, TextInput, TextArea, Label, Card, Badge, ErrorBanner, Spinner, Skeleton, FadeIn } from "@/components/ui";

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

function listErrorMessage(err: unknown): string {
  return err instanceof ApiClientError ? err.message : "Could not load your kits.";
}

/** Sends the empty state somewhere real: the job description field below it. */
function focusJobDescription() {
  const el = document.getElementById("jd");
  if (!el) return;
  const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: smooth ? "smooth" : "auto", block: "center" });
  el.focus({ preventScroll: true });
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
      setListError(listErrorMessage(err));
    }
  }, []);

  // Fetched from a promise callback rather than the effect body, and discarded
  // if the page unmounts while the request is still in flight.
  useEffect(() => {
    let cancelled = false;
    api
      .get<{ kits: KitSummary[] }>("/api/kits")
      .then((data) => {
        if (cancelled) return;
        setKits(data.kits);
        setListError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setListError(listErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
    <main className="mx-auto w-full max-w-3xl px-6 py-10 md:py-14">
      <FadeIn>
        <header className="mb-10">
          <h1 className="type-heading">Your prep kits</h1>
          <p className="mt-2 text-[var(--color-text-muted)]">
            Each kit turns one job posting into a study plan you can work through.
          </p>
        </header>
      </FadeIn>

      <div className="space-y-12">
          {/* Kits List Section */}
          <section className="border-t border-[var(--color-border)] pt-10">
            {listError && <ErrorBanner message={listError} />}
            {kits === null && !listError && (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            )}
            {kits?.length === 0 && (
              // Solid border, no folder icon: a dashed box with a file glyph
              // reads as a drop target, and nothing here accepts a drop.
              <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-12 text-center">
                <p className="type-subtitle">No kits yet</p>
                <p className="mx-auto mt-2 max-w-sm text-[var(--color-text-muted)]">
                  Paste a job posting and the kit builds itself: ranked requirements, a question bank, flashcards and a dated plan.
                </p>
                <Button className="mt-6" onClick={focusJobDescription}>
                  Paste a job posting
                </Button>
              </div>
            )}
            {kits && kits.length > 0 && (
              <ul className="space-y-3">
                <AnimatePresence initial={false}>
                  {kits.map((kit, i) => (
                    <KitRow key={kit.id} kit={kit} index={i} onDeleted={load} />
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </section>

          {/* Create Kit Section */}
          <section className="border-t border-[var(--color-border)] pt-10">
            <CreateKitForm onCreated={load} />
          </section>

          {/* Batch Import Section */}
          <section className="border-t border-[var(--color-border)] pt-10">
            <BatchImportForm onImported={load} />
          </section>
      </div>
    </main>
  );
}

function statusTone(status: KitSummary["status"]): "accent" | "neutral" | "warning" | "danger" {
  // The spinner already signals work in progress, so generating stays neutral
  // and the accent is reserved for the finished state.
  if (status === "generating") return "neutral";
  if (status === "ready") return "accent";
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
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const reduce = useReducedMotion();

  // Confirmed inline rather than with window.confirm: browsers suppress native
  // dialogs in several contexts, which made deleting silently do nothing.
  async function onDelete() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await api.del(`/api/kits/${kit.id}`);
      onDeleted();
    } catch (err) {
      setDeleteError(err instanceof ApiClientError ? err.message : "Could not delete this kit.");
      setDeleting(false);
      setConfirming(false);
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
        <div className="flex shrink-0 items-center gap-2">
          {confirming ? (
            <>
              <span className="text-sm text-[var(--color-text-muted)]">Delete this kit?</span>
              <Button variant="danger" size="sm" onClick={onDelete} disabled={deleting}>
                {deleting ? <Spinner className="h-3.5 w-3.5" /> : "Delete"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} disabled={deleting}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Badge tone={statusTone(kit.status)}>{statusLabel(kit)}</Badge>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(true)} aria-label={`Delete ${kit.title}`}>
                <Trash size={16} />
              </Button>
            </>
          )}
        </div>
      </Card>
      {deleteError && (
        <p role="alert" className="mt-2 text-sm text-[var(--color-danger)]">
          {deleteError}
        </p>
      )}
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
      <h2 className="type-subtitle mb-6">Create a kit</h2>
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
      <h2 className="type-subtitle">Batch create</h2>
      <p className="mt-2 mb-6 text-[var(--color-text-muted)]">
        Upload a JSON file to build several kits at once.
      </p>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        {error && <ErrorBanner message={error} />}
        {message && (
          <p role="status" className="font-medium text-[var(--color-accent)]">
            {message}
          </p>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/json"
          aria-label="Upload job description and company pairs JSON file"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="min-h-[44px] w-full text-sm text-[var(--color-text-muted)] file:mr-3 file:min-h-[44px] file:cursor-pointer file:rounded-[var(--radius-lg)] file:border-0 file:bg-[var(--color-accent-soft)] file:px-4 file:py-3 file:text-sm file:font-semibold file:text-[var(--color-accent)]"
        />
        <Button type="submit" variant="secondary" disabled={!file || loading}>
          {loading && <Spinner className="h-4 w-4" />}
          {loading ? "Uploading…" : "Import & generate"}
        </Button>
      </form>
    </Card>
  );
}
