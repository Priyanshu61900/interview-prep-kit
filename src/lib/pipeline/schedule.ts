import type { Question, Requirement, Schedule, ScheduleDay } from "@/types/kit";

// Deterministic by design, per the brief: "Allocating topics across the
// days available is arithmetic, and the application should do it." No LLM
// call anywhere in this file.

const DIFFICULTY_MINUTES: Record<1 | 2 | 3, number> = { 1: 15, 2: 25, 3: 40 };
const SYSTEM_DESIGN_BONUS_MINUTES = 15;
const REVIEW_DAY_MINUTES = 30;

function minutesForQuestion(q: Question): number {
  const base = DIFFICULTY_MINUTES[q.difficulty];
  const bonus = q.category === "system-design" ? SYSTEM_DESIGN_BONUS_MINUTES : 0;
  return base + bonus;
}

function questionWeight(q: Question, requirementsById: Map<string, Requirement>): number {
  const hasMust = q.requirement_ids.some((id) => requirementsById.get(id)?.priority === "must");
  return (hasMust ? 1000 : 0) + q.difficulty * 10 + q.requirement_ids.length;
}

function summarizeFocus(questions: Question[], requirementsById: Map<string, Requirement>): string {
  if (!questions.length) return "Review and light practice";
  const categories = [...new Set(questions.map((q) => q.category))];
  const topRequirement = questions
    .flatMap((q) => q.requirement_ids)
    .map((id) => requirementsById.get(id))
    .find((r) => r?.priority === "must");
  const categoryLabel = categories.map((c) => c.replace("-", " ")).join(" + ");
  return topRequirement ? `${categoryLabel}: ${topRequirement.text}` : categoryLabel || "Mixed practice";
}

/**
 * Distributes every generated question across exactly `daysAvailable` days,
 * hardest / highest-priority (must-have-covering) material first so it lands
 * on earlier days rather than the night before. When there are more days
 * than questions, extra days become spaced-repetition review days that
 * revisit earlier material rather than being left empty or fabricating new
 * content. When there are more questions than days, days are packed in
 * priority order with slightly larger early chunks.
 */
export function buildSchedule(
  requirements: Requirement[],
  questions: Question[],
  daysAvailable: number
): Schedule {
  const days = Math.max(1, Math.floor(daysAvailable));
  const requirementsById = new Map(requirements.map((r) => [r.id, r]));

  const sorted = [...questions].sort((a, b) => {
    const diff = questionWeight(b, requirementsById) - questionWeight(a, requirementsById);
    return diff !== 0 ? diff : a.id.localeCompare(b.id);
  });

  const scheduleDays: ScheduleDay[] = [];

  if (sorted.length === 0) {
    for (let d = 1; d <= days; d++) {
      scheduleDays.push({ day: d, focus: "No questions generated yet — review the company brief and role breakdown", question_ids: [], minutes: 0 });
    }
    return { days_available: days, days: scheduleDays };
  }

  if (sorted.length <= days) {
    // One question per day, front-loaded by importance; remaining days
    // become review days cycling back through what's already covered.
    sorted.forEach((q, i) => {
      scheduleDays.push({
        day: i + 1,
        focus: summarizeFocus([q], requirementsById),
        question_ids: [q.id],
        minutes: minutesForQuestion(q),
      });
    });

    for (let d = sorted.length + 1; d <= days; d++) {
      const reviewTarget = sorted[(d - sorted.length - 1) % sorted.length];
      scheduleDays.push({
        day: d,
        focus: `Spaced review: revisit "${reviewTarget.prompt.slice(0, 60)}${reviewTarget.prompt.length > 60 ? "…" : ""}"`,
        question_ids: [reviewTarget.id],
        minutes: REVIEW_DAY_MINUTES,
      });
    }
    return { days_available: days, days: scheduleDays };
  }

  // More questions than days: pack into `days` contiguous chunks in
  // priority order, first `remainder` chunks one item larger so the extra
  // load falls on the earlier, more important days.
  const baseSize = Math.floor(sorted.length / days);
  const remainder = sorted.length % days;

  let cursor = 0;
  for (let d = 1; d <= days; d++) {
    const size = baseSize + (d <= remainder ? 1 : 0);
    const chunk = sorted.slice(cursor, cursor + size);
    cursor += size;
    scheduleDays.push({
      day: d,
      focus: summarizeFocus(chunk, requirementsById),
      question_ids: chunk.map((q) => q.id),
      minutes: chunk.reduce((sum, q) => sum + minutesForQuestion(q), 0),
    });
  }

  return { days_available: days, days: scheduleDays };
}
