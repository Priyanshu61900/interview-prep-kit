"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, CardsThree, Sparkle } from "@phosphor-icons/react";
import { useKitEditor } from "@/lib/useKitEditor";
import { ErrorBanner, Spinner, Button, Badge, FadeIn } from "@/components/ui";
import { SaveStatus } from "@/components/kit/SaveStatus";
import { CompanyBriefSection } from "@/components/kit/CompanyBriefSection";
import { RoleSection } from "@/components/kit/RoleSection";
import { QuestionBank } from "@/components/kit/QuestionBank";
import { FlashcardsSection } from "@/components/kit/FlashcardsSection";
import { ScheduleSection } from "@/components/kit/ScheduleSection";
import { CoverageBanner, ResearchNotices } from "@/components/kit/KitNotices";
import { ApiClientError } from "@/lib/apiClient";
import type { QuestionCategory } from "@/types/kit";

export default function KitPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { doc, loadError, saveState, update, regenerate, pin } = useKitEditor(params.id);
  const [regenError, setRegenError] = useState<string | null>(null);

  if (loadError) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <ErrorBanner message={loadError} />
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-[var(--color-accent)] hover:underline">
          ← Back to dashboard
        </Link>
      </main>
    );
  }

  if (!doc) {
    return (
      <main className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-16 text-[var(--color-text-muted)]">
        <Spinner /> Loading kit…
      </main>
    );
  }

  if (doc.status === "generating") {
    return (
      <main className="mx-auto flex max-w-lg flex-col items-center gap-5 px-4 py-24 text-center">
        <motion.span
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <Sparkle size={26} weight="fill" />
        </motion.span>
        <h1 className="text-xl font-semibold">Generating your kit…</h1>
        <p className="text-sm text-[var(--color-text-muted)]">
          Crawling the company site, extracting requirements, and writing questions in stages. This usually takes 20–60 seconds.
        </p>
        <Spinner className="h-4 w-4 text-[var(--color-text-faint)]" />
      </main>
    );
  }

  if (doc.status === "failed" || !doc.kit) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="mb-3 text-xl font-semibold">Generation failed</h1>
        <ErrorBanner message={doc.generationError ?? "Something went wrong generating this kit."} />
        <Link href="/dashboard" className="mt-4 inline-block text-sm text-[var(--color-accent)] hover:underline">
          ← Back to dashboard
        </Link>
      </main>
    );
  }

  const kit = doc.kit;

  async function handleRegenerateCategory(category: QuestionCategory) {
    setRegenError(null);
    try {
      await regenerate(category);
    } catch (err) {
      setRegenError(err instanceof ApiClientError ? err.message : "Could not regenerate that category.");
    }
  }

  async function handleRegenerateBrief(force: boolean) {
    await regenerate("company_brief", force);
  }

  async function handleRegenerateSchedule(days?: number) {
    await regenerate("schedule", false, days);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <Link href="/dashboard" className="flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
          <ArrowLeft size={14} /> Dashboard
        </Link>
        <SaveStatus state={saveState} />
      </div>

      <FadeIn>
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">{kit.role.title || "Untitled role"}</h1>
          {doc.status === "partial" && <Badge tone="warning">Coverage gaps</Badge>}
        </div>
        <p className="mb-6 text-[var(--color-text-muted)]">
          {kit.source.company} {kit.source.location && `· ${kit.source.location}`}
        </p>
      </FadeIn>

      {regenError && (
        <div className="mb-4">
          <ErrorBanner message={regenError} />
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3">
        <CoverageBanner kit={kit} />
        <ResearchNotices kit={kit} meta={{ skipped_sources: doc.meta.skipped_sources }} warnings={doc.warnings} />
      </div>

      <div className="flex flex-col gap-8">
        <FadeIn delay={0.05}>
          <CompanyBriefSection kit={kit} onChange={update} onRegenerate={handleRegenerateBrief} />
        </FadeIn>
        <FadeIn delay={0.1}>
          <RoleSection kit={kit} />
        </FadeIn>
        <FadeIn delay={0.15}>
          <QuestionBank
            kit={kit}
            meta={{ question_meta: doc.meta.question_meta }}
            onChange={update}
            onRegenerate={handleRegenerateCategory}
            onPin={(id, pinned) => pin("question", id, pinned)}
          />
        </FadeIn>
        <FadeIn delay={0.2}>
          <FlashcardsSection kit={kit} flashcardMeta={doc.meta.flashcard_meta} onChange={update} onPin={(id, pinned) => pin("flashcard", id, pinned)} />
        </FadeIn>
        <FadeIn delay={0.25}>
          <ScheduleSection kit={kit} onChange={update} onRegenerate={handleRegenerateSchedule} />
        </FadeIn>
      </div>

      <div className="mt-10 flex justify-center border-t border-[var(--color-border)] pt-6">
        <Button onClick={() => router.push(`/kits/${params.id}/practice`)}>
          <CardsThree size={18} weight="fill" /> Start practice session
        </Button>
      </div>
    </main>
  );
}
