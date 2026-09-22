import type { SaveState } from "@/lib/useKitEditor";
import { Spinner } from "@/components/ui";

export function SaveStatus({ state }: { state: SaveState }) {
  if (state === "idle") return null;
  return (
    <span className="flex items-center gap-1.5 text-xs text-[var(--color-text-faint)]" role="status" aria-live="polite">
      {state === "saving" && (
        <>
          <Spinner className="h-3 w-3" /> Saving…
        </>
      )}
      {state === "saved" && <>Saved</>}
      {state === "error" && <span className="text-[var(--color-danger)]">Could not save — check your connection</span>}
    </span>
  );
}
