import { generateJson } from "@/lib/llm/provider";
import { buildQuestionGenPrompt, buildQuestionGenSystem } from "@/lib/llm/prompts";
import type { Question, QuestionCategory, Requirement } from "@/types/kit";

interface RawQuestion {
  requirement_ids: string[];
  prompt: string;
  answer_outline: string;
  difficulty: number;
}

const SYSTEM_DESIGN_SIGNALS = ["system design", "architecture round", "design round", "whiteboard"];

/**
 * Decides which question categories to generate and which requirements each
 * one draws on. A technical requirement generates technical questions; a
 * behavioural one generates behavioural questions; a domain one generates
 * company-fit questions — each category is a *separate* model call with its
 * own instructions, per the brief (a React requirement and a mentoring
 * requirement should not come from the same call with the same instructions).
 * system-design is added conditionally, when the hiring-process research or
 * the role's seniority suggests a design round actually happens.
 */
export function planCategories(
  requirements: Requirement[],
  seniority: string,
  hiringProcessText: string
): Partial<Record<QuestionCategory, Requirement[]>> {
  const plan: Partial<Record<QuestionCategory, Requirement[]>> = {};

  const technical = requirements.filter((r) => r.kind === "technical");
  const behavioural = requirements.filter((r) => r.kind === "behavioural");
  const domain = requirements.filter((r) => r.kind === "domain");

  if (technical.length) plan.technical = technical;
  if (behavioural.length) plan.behavioural = behavioural;
  if (domain.length) plan["company-fit"] = domain;

  const seniorityLower = seniority.toLowerCase();
  const isSenior = /senior|staff|lead|principal|architect/.test(seniorityLower);
  const mentionsDesignRound = SYSTEM_DESIGN_SIGNALS.some((sig) => hiringProcessText.toLowerCase().includes(sig));

  if (technical.length && (isSenior || mentionsDesignRound)) {
    const mustHaveTechnical = technical.filter((r) => r.priority === "must").slice(0, 3);
    if (mustHaveTechnical.length) plan["system-design"] = mustHaveTechnical;
  }

  return plan;
}

export interface GenerateQuestionsContext {
  companyContext: string;
  hiringProcessNotes: string;
}

/**
 * Runs one model call per planned category and returns questions without
 * ids assigned yet — id assignment happens once, centrally, in the
 * orchestrator so ids stay unique and stable across the whole kit even when
 * this function is called again for gap-filling or single-category regeneration.
 */
export async function generateQuestionsForCategory(
  category: QuestionCategory,
  requirements: Requirement[],
  context: GenerateQuestionsContext
): Promise<Omit<Question, "id">[]> {
  if (!requirements.length) return [];

  const raw = await generateJson<{ questions: RawQuestion[] }>({
    system: buildQuestionGenSystem(category),
    prompt: buildQuestionGenPrompt(
      category,
      requirements.map((r) => ({ id: r.id, text: r.text, priority: r.priority })),
      context.companyContext,
      context.hiringProcessNotes
    ),
    temperature: 0.5,
  });

  const validIds = new Set(requirements.map((r) => r.id));
  return (raw.questions ?? [])
    .filter((q) => q && typeof q.prompt === "string" && q.prompt.trim())
    .map((q) => ({
      requirement_ids: (q.requirement_ids ?? []).filter((id) => validIds.has(id)),
      category,
      prompt: q.prompt.trim(),
      answer_outline: (q.answer_outline ?? "").trim(),
      difficulty: clampDifficulty(q.difficulty),
    }));
}

function clampDifficulty(value: number): 1 | 2 | 3 {
  const n = Math.round(value);
  if (n <= 1) return 1;
  if (n >= 3) return 3;
  return 2;
}

export function assignQuestionIds(questions: Omit<Question, "id">[], startIndex: number): Question[] {
  return questions.map((q, i) => ({ ...q, id: `q${startIndex + i}` }));
}
