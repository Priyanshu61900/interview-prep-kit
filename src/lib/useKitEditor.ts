"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiClientError } from "@/lib/apiClient";
import type { Kit, KitMeta } from "@/types/kit";

export interface KitDocDto {
  id: string;
  title: string;
  status: "generating" | "ready" | "partial" | "failed";
  generationError: string | null;
  jd: string;
  companyUrl: string;
  daysRequested: number;
  kit: Kit | null;
  meta: KitMeta;
  warnings: { step: string; message: string }[];
  createdAt: string;
  updatedAt: string;
}

export type SaveState = "idle" | "saving" | "saved" | "error";

/**
 * Owns the full lifecycle of one kit in the Builder: loading it, polling
 * while it's still generating, local optimistic edits, a debounced autosave
 * to the server (so typing feels immediate instead of round-tripping per
 * keystroke), and the regenerate/pin actions. This is the single source of
 * truth the whole kit page renders from.
 */
export function useKitEditor(id: string) {
  const [doc, setDoc] = useState<KitDocDto | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const dirtyRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ kit: KitDocDto }>(`/api/kits/${id}`);
      setDoc(res.kit);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof ApiClientError ? err.message : "Could not load this kit.");
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (doc?.status === "generating") {
      pollTimer.current = setInterval(load, 3000);
    }
    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
    };
  }, [doc?.status, load]);

  const persist = useCallback(
    async (kit: Kit) => {
      setSaveState("saving");
      try {
        const res = await api.patch<{ kit: KitDocDto }>(`/api/kits/${id}`, { kit });
        setDoc((prev) => (prev ? { ...prev, meta: res.kit.meta, updatedAt: res.kit.updatedAt } : prev));
        setSaveState("saved");
        dirtyRef.current = false;
      } catch {
        setSaveState("error");
      }
    },
    [id]
  );

  /** Applies a local, optimistic mutation to the kit and schedules an autosave ~700ms after the last edit. */
  const update = useCallback(
    (mutator: (kit: Kit) => Kit) => {
      setDoc((prev) => {
        if (!prev?.kit) return prev;
        const nextKit = mutator(prev.kit);
        dirtyRef.current = true;
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => persist(nextKit), 700);
        return { ...prev, kit: nextKit };
      });
    },
    [persist]
  );

  const setTitle = useCallback(
    async (title: string) => {
      setDoc((prev) => (prev ? { ...prev, title } : prev));
      await api.patch(`/api/kits/${id}`, { title }).catch(() => {});
    },
    [id]
  );

  const regenerate = useCallback(
    async (section: string, force = false, days?: number) => {
      const res = await api.post<{ kit: { kit: Kit; meta: KitMeta; status: KitDocDto["status"] } }>(`/api/kits/${id}/regenerate`, { section, force, days });
      setDoc((prev) => (prev ? { ...prev, kit: res.kit.kit, meta: res.kit.meta, status: res.kit.status } : prev));
    },
    [id]
  );

  const pin = useCallback(
    async (type: "question" | "flashcard", itemId: string, pinned: boolean) => {
      const res = await api.patch<{ meta: KitMeta }>(`/api/kits/${id}/pin`, { type, itemId, pinned });
      setDoc((prev) => (prev ? { ...prev, meta: res.meta } : prev));
    },
    [id]
  );

  return { doc, loadError, saveState, update, setTitle, regenerate, pin, reload: load };
}
