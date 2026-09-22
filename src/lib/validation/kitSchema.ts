import { z } from "zod";

// Mirrors Appendix A exactly. Used to validate a generated kit before it is
// ever persisted or handed back to the interface — generation is the one
// place we do not trust the model's output shape.

export const requirementSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  kind: z.enum(["technical", "behavioural", "domain"]),
  priority: z.enum(["must", "nice"]),
});

export const questionSchema = z.object({
  id: z.string().min(1),
  requirement_ids: z.array(z.string()),
  category: z.enum(["technical", "behavioural", "system-design", "company-fit"]),
  prompt: z.string().min(1),
  answer_outline: z.string(),
  difficulty: z.union([z.literal(1), z.literal(2), z.literal(3)]),
});

export const flashcardSchema = z.object({
  id: z.string().min(1),
  front: z.string().min(1),
  back: z.string(),
  requirement_ids: z.array(z.string()),
});

export const scheduleDaySchema = z.object({
  day: z.number().int().min(1),
  focus: z.string(),
  question_ids: z.array(z.string()),
  minutes: z.number().int().min(0),
});

export const scheduleSchema = z.object({
  days_available: z.number().int().min(1),
  days: z.array(scheduleDaySchema),
});

export const coverageSchema = z.object({
  uncovered_requirement_ids: z.array(z.string()),
  passes: z.number().int().min(0),
});

export const kitSourceSchema = z.object({
  company: z.string(),
  company_url: z.string(),
  role: z.string(),
  location: z.string(),
  jd_chars: z.number().int().min(0),
  researched_at: z.string(),
  pages_used: z.array(z.string()),
});

export const companyBriefSchema = z.object({
  summary: z.string(),
  what_they_do: z.string(),
  sources: z.array(z.string()),
});

export const kitRoleSchema = z.object({
  title: z.string(),
  seniority: z.string(),
  responsibilities: z.array(z.string()),
  requirements: z.array(requirementSchema),
});

export const kitSchema = z.object({
  source: kitSourceSchema,
  company_brief: companyBriefSchema,
  role: kitRoleSchema,
  questions: z.array(questionSchema),
  flashcards: z.array(flashcardSchema),
  schedule: scheduleSchema,
  coverage: coverageSchema,
});

export interface StructuralIssue {
  path: string;
  message: string;
}

// Cross-field referential integrity that zod's shape checks cannot express:
// every id referenced elsewhere must resolve to something that exists.
export function checkReferentialIntegrity(kit: z.infer<typeof kitSchema>): StructuralIssue[] {
  const issues: StructuralIssue[] = [];
  const requirementIds = new Set(kit.role.requirements.map((r) => r.id));
  const questionIds = new Set(kit.questions.map((q) => q.id));

  for (const q of kit.questions) {
    for (const rid of q.requirement_ids) {
      if (!requirementIds.has(rid)) {
        issues.push({ path: `questions[${q.id}].requirement_ids`, message: `unknown requirement id "${rid}"` });
      }
    }
  }
  for (const f of kit.flashcards) {
    for (const rid of f.requirement_ids) {
      if (!requirementIds.has(rid)) {
        issues.push({ path: `flashcards[${f.id}].requirement_ids`, message: `unknown requirement id "${rid}"` });
      }
    }
  }
  for (const day of kit.schedule.days) {
    for (const qid of day.question_ids) {
      if (!questionIds.has(qid)) {
        issues.push({ path: `schedule.days[${day.day}].question_ids`, message: `unknown question id "${qid}"` });
      }
    }
  }
  for (const rid of kit.coverage.uncovered_requirement_ids) {
    if (!requirementIds.has(rid)) {
      issues.push({ path: "coverage.uncovered_requirement_ids", message: `unknown requirement id "${rid}"` });
    }
  }

  const dupReq = findDuplicates(kit.role.requirements.map((r) => r.id));
  if (dupReq.length) issues.push({ path: "role.requirements", message: `duplicate ids: ${dupReq.join(", ")}` });
  const dupQ = findDuplicates(kit.questions.map((q) => q.id));
  if (dupQ.length) issues.push({ path: "questions", message: `duplicate ids: ${dupQ.join(", ")}` });
  const dupF = findDuplicates(kit.flashcards.map((f) => f.id));
  if (dupF.length) issues.push({ path: "flashcards", message: `duplicate ids: ${dupF.join(", ")}` });

  if (kit.schedule.days.length !== kit.schedule.days_available) {
    issues.push({
      path: "schedule.days",
      message: `expected ${kit.schedule.days_available} days, got ${kit.schedule.days.length}`,
    });
  }

  return issues;
}

function findDuplicates(ids: string[]): string[] {
  const seen = new Set<string>();
  const dups = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) dups.add(id);
    seen.add(id);
  }
  return [...dups];
}

export function validateKit(candidate: unknown): { ok: true; kit: z.infer<typeof kitSchema> } | { ok: false; issues: StructuralIssue[] } {
  const parsed = kitSchema.safeParse(candidate);
  if (!parsed.success) {
    return {
      ok: false,
      issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
    };
  }
  const refIssues = checkReferentialIntegrity(parsed.data);
  if (refIssues.length) return { ok: false, issues: refIssues };
  return { ok: true, kit: parsed.data };
}
