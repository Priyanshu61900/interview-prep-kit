"use client";

import { useState } from "react";
import { ArrowUp, ArrowDown, PushPin, Trash, Plus, ArrowsClockwise } from "@phosphor-icons/react";
import type { Kit, Question, QuestionCategory, Requirement, EditOrigin } from "@/types/kit";
import { Button, TextArea, TextInput, Badge, Card, Spinner } from "@/components/ui";

const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  technical: "Technical",
  behavioural: "Behavioural",
  "system-design": "System Design",
  "company-fit": "Company Fit",
};

const CATEGORIES: QuestionCategory[] = ["technical", "behavioural", "system-design", "company-fit"];

function nextId(prefix: string, items: { id: string }[]): string {
  const max = items.reduce((m, i) => {
    const n = Number(i.id.replace(new RegExp(`^${prefix}`), ""));
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `${prefix}${max + 1}`;
}

export function QuestionBank({
  kit,
  meta,
  onChange,
  onRegenerate,
  onPin,
}: {
  kit: Kit;
  meta: Kit extends never ? never : { question_meta: Record<string, { origin: EditOrigin; updated_at: string }> };
  onChange: (mutator: (kit: Kit) => Kit) => void;
  onRegenerate: (category: QuestionCategory) => Promise<void>;
  onPin: (itemId: string, pinned: boolean) => void;
}) {
  const requirementsById = new Map(kit.role.requirements.map((r) => [r.id, r]));

  function updateQuestion(id: string, patch: Partial<Question>) {
    onChange((k) => ({ ...k, questions: k.questions.map((q) => (q.id === id ? { ...q, ...patch } : q)) }));
  }

  function deleteQuestion(id: string) {
    onChange((k) => ({ ...k, questions: k.questions.filter((q) => q.id !== id) }));
  }

  function addQuestion(category: QuestionCategory, requirementId: string | null) {
    onChange((k) => {
      const id = nextId("q", k.questions);
      const newQuestion: Question = {
        id,
        requirement_ids: requirementId ? [requirementId] : [],
        category,
        prompt: "New question - edit me",
        answer_outline: "",
        difficulty: 2,
      };
      return { ...k, questions: [...k.questions, newQuestion] };
    });
  }

  function moveQuestion(category: QuestionCategory, id: string, direction: -1 | 1) {
    onChange((k) => {
      const categoryIndices = k.questions.map((q, i) => (q.category === category ? i : -1)).filter((i) => i >= 0);
      const posInCategory = categoryIndices.findIndex((i) => k.questions[i].id === id);
      const swapPos = posInCategory + direction;
      if (posInCategory < 0 || swapPos < 0 || swapPos >= categoryIndices.length) return k;
      const a = categoryIndices[posInCategory];
      const b = categoryIndices[swapPos];
      const next = [...k.questions];
      [next[a], next[b]] = [next[b], next[a]];
      return { ...k, questions: next };
    });
  }

  return (
    <div className="flex flex-col gap-8">
      {CATEGORIES.map((category) => {
        const items = kit.questions.filter((q) => q.category === category);
        return (
          <CategorySection
            key={category}
            category={category}
            items={items}
            requirementsById={requirementsById}
            allRequirements={kit.role.requirements}
            questionMeta={meta.question_meta}
            onUpdate={updateQuestion}
            onDelete={deleteQuestion}
            onAdd={(reqId) => addQuestion(category, reqId)}
            onMove={(id, dir) => moveQuestion(category, id, dir)}
            onMoveCategory={(id, newCategory) => updateQuestion(id, { category: newCategory })}
            onRegenerate={() => onRegenerate(category)}
            onPin={onPin}
          />
        );
      })}
    </div>
  );
}

function CategorySection({
  category,
  items,
  requirementsById,
  allRequirements,
  questionMeta,
  onUpdate,
  onDelete,
  onAdd,
  onMove,
  onMoveCategory,
  onRegenerate,
  onPin,
}: {
  category: QuestionCategory;
  items: Question[];
  requirementsById: Map<string, Requirement>;
  allRequirements: Requirement[];
  questionMeta: Record<string, { origin: EditOrigin; updated_at: string }>;
  onUpdate: (id: string, patch: Partial<Question>) => void;
  onDelete: (id: string) => void;
  onAdd: (requirementId: string | null) => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onMoveCategory: (id: string, category: QuestionCategory) => void;
  onRegenerate: () => Promise<void>;
  onPin: (itemId: string, pinned: boolean) => void;
}) {
  const [regenerating, setRegenerating] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      await onRegenerate();
    } catch {
      // surfaced via toast-less inline retry — user can just click again
    } finally {
      setRegenerating(false);
    }
  }

  return (
    <section aria-labelledby={`section-${category}`}>
      <div className="mb-3 flex items-center justify-between">
        <h3 id={`section-${category}`} className="font-semibold">
          {CATEGORY_LABELS[category]} <span className="font-normal text-[var(--color-text-faint)]">({items.length})</span>
        </h3>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowAdd((s) => !s)}>
            <Plus size={14} /> Add question
          </Button>
          <Button variant="secondary" size="sm" onClick={handleRegenerate} disabled={regenerating}>
            {regenerating ? <Spinner className="h-3.5 w-3.5" /> : <ArrowsClockwise size={14} />}
            {regenerating ? "Regenerating…" : "Regenerate"}
          </Button>
        </div>
      </div>

      {showAdd && (
        <AddQuestionForm requirements={allRequirements} onAdd={(reqId) => { onAdd(reqId); setShowAdd(false); }} onCancel={() => setShowAdd(false)} />
      )}

      {items.length === 0 && !showAdd && <p className="text-sm text-[var(--color-text-faint)]">No {CATEGORY_LABELS[category].toLowerCase()} questions yet.</p>}

      <ul className="flex flex-col gap-3">
        {items.map((q, i) => (
          <QuestionCard
            key={q.id}
            question={q}
            requirementsById={requirementsById}
            meta={questionMeta[q.id]}
            canMoveUp={i > 0}
            canMoveDown={i < items.length - 1}
            onUpdate={(patch) => onUpdate(q.id, patch)}
            onDelete={() => onDelete(q.id)}
            onMove={(dir) => onMove(q.id, dir)}
            onMoveCategory={(cat) => onMoveCategory(q.id, cat)}
            onPin={(pinned) => onPin(q.id, pinned)}
          />
        ))}
      </ul>
    </section>
  );
}

function AddQuestionForm({ requirements, onAdd, onCancel }: { requirements: Requirement[]; onAdd: (requirementId: string | null) => void; onCancel: () => void }) {
  const [requirementId, setRequirementId] = useState("");
  return (
    <Card className="mb-3 flex flex-wrap items-center gap-2 p-3">
      <label className="text-sm text-[var(--color-text-muted)]" htmlFor="new-question-requirement">
        Link to requirement (optional):
      </label>
      <select
        id="new-question-requirement"
        value={requirementId}
        onChange={(e) => setRequirementId(e.target.value)}
        className="min-h-[44px] rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm"
      >
        <option value="">None</option>
        {requirements.map((r) => (
          <option key={r.id} value={r.id}>
            {r.text.slice(0, 60)}
          </option>
        ))}
      </select>
      <Button size="sm" onClick={() => onAdd(requirementId || null)}>
        Add
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>
        Cancel
      </Button>
    </Card>
  );
}

function QuestionCard({
  question,
  requirementsById,
  meta,
  canMoveUp,
  canMoveDown,
  onUpdate,
  onDelete,
  onMove,
  onMoveCategory,
  onPin,
}: {
  question: Question;
  requirementsById: Map<string, Requirement>;
  meta?: { origin: EditOrigin; updated_at: string };
  canMoveUp: boolean;
  canMoveDown: boolean;
  onUpdate: (patch: Partial<Question>) => void;
  onDelete: () => void;
  onMove: (dir: -1 | 1) => void;
  onMoveCategory: (category: QuestionCategory) => void;
  onPin: (pinned: boolean) => void;
}) {
  const pinned = meta?.origin === "pinned";
  const edited = meta?.origin === "edited";

  return (
    <Card className="p-4">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {question.requirement_ids.map((rid) => {
          const req = requirementsById.get(rid);
          if (!req) return null;
          return (
            <Badge key={rid} tone={req.priority === "must" ? "must" : "nice"}>
              {req.text.slice(0, 40)}
            </Badge>
          );
        })}
        <Badge tone="neutral">Difficulty {question.difficulty}</Badge>
        {edited && <Badge tone="accent">Edited</Badge>}
        {pinned && <Badge tone="warning">Pinned</Badge>}
      </div>

      <TextArea rows={2} value={question.prompt} onChange={(e) => onUpdate({ prompt: e.target.value })} aria-label="Question prompt" />
      <TextArea
        rows={2}
        className="mt-2"
        value={question.answer_outline}
        onChange={(e) => onUpdate({ answer_outline: e.target.value })}
        aria-label="Answer outline"
        placeholder="Answer outline"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-xs text-[var(--color-text-muted)]" htmlFor={`difficulty-${question.id}`}>
          Difficulty
        </label>
        <TextInput
          id={`difficulty-${question.id}`}
          type="number"
          min={1}
          max={3}
          value={question.difficulty}
          onChange={(e) => onUpdate({ difficulty: Math.min(3, Math.max(1, Number(e.target.value))) as 1 | 2 | 3 })}
          className="w-16"
        />

        <label className="ml-2 text-xs text-[var(--color-text-muted)]" htmlFor={`category-${question.id}`}>
          Category
        </label>
        <select
          id={`category-${question.id}`}
          value={question.category}
          onChange={(e) => onMoveCategory(e.target.value as QuestionCategory)}
          className="min-h-[44px] rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>

        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onMove(-1)} disabled={!canMoveUp} aria-label="Move question up">
            <ArrowUp size={14} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onMove(1)} disabled={!canMoveDown} aria-label="Move question down">
            <ArrowDown size={14} />
          </Button>
          <Button variant={pinned ? "primary" : "ghost"} size="sm" onClick={() => onPin(!pinned)} aria-pressed={pinned}>
            <PushPin size={14} weight={pinned ? "fill" : "regular"} /> {pinned ? "Pinned" : "Pin"}
          </Button>
          <Button variant="danger" size="sm" onClick={onDelete} aria-label="Delete question">
            <Trash size={14} />
          </Button>
        </div>
      </div>
    </Card>
  );
}
