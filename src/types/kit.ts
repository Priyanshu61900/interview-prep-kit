// Kit structure — must match Appendix A of the assessment brief exactly.
// Field names and nesting are contractual: the batch pipeline and automated
// grading depend on this shape being stable.

export type RequirementKind = "technical" | "behavioural" | "domain";
export type RequirementPriority = "must" | "nice";

export interface Requirement {
  id: string; // stable within a kit, e.g. "r1"
  text: string;
  kind: RequirementKind;
  priority: RequirementPriority;
}

export type QuestionCategory =
  | "technical"
  | "behavioural"
  | "system-design"
  | "company-fit";

export interface Question {
  id: string; // stable within a kit, e.g. "q1"
  requirement_ids: string[];
  category: QuestionCategory;
  prompt: string;
  answer_outline: string;
  difficulty: 1 | 2 | 3;
}

export interface Flashcard {
  id: string; // stable within a kit, e.g. "f1"
  front: string;
  back: string;
  requirement_ids: string[];
}

export interface ScheduleDay {
  day: number;
  focus: string;
  question_ids: string[];
  minutes: number; // integer
}

export interface Schedule {
  days_available: number;
  days: ScheduleDay[];
}

export interface Coverage {
  uncovered_requirement_ids: string[];
  passes: number;
}

export interface KitSource {
  company: string;
  company_url: string;
  role: string;
  location: string;
  jd_chars: number;
  researched_at: string; // ISO timestamp
  pages_used: string[];
}

export interface CompanyBrief {
  summary: string;
  what_they_do: string;
  sources: string[];
}

export interface KitRole {
  title: string;
  seniority: string;
  responsibilities: string[];
  requirements: Requirement[];
}

export interface Kit {
  source: KitSource;
  company_brief: CompanyBrief;
  role: KitRole;
  questions: Question[];
  flashcards: Flashcard[];
  schedule: Schedule;
  coverage: Coverage;
}

// --- Extensions beyond Appendix A (additive only, never replacing a
// mandated field). These carry state the Builder and Practice Mode need. ---

export type EditOrigin = "generated" | "edited" | "pinned";

export interface EditableMeta {
  origin: EditOrigin;
  updated_at: string;
}

export interface PracticeAttempt {
  flashcard_id: string;
  confidence: 1 | 2 | 3 | 4 | 5; // 1 = no idea, 5 = nailed it
  attempted_at: string;
}

export interface SkippedSource {
  url: string;
  reason: string;
}

export interface KitMeta {
  question_meta: Record<string, EditableMeta>;
  flashcard_meta: Record<string, EditableMeta>;
  brief_meta: EditableMeta | null;
  schedule_meta: EditableMeta | null;
  skipped_sources: SkippedSource[];
  practice_attempts: PracticeAttempt[];
}

export interface KitDocument {
  _id: string;
  owner_id: string;
  title: string;
  status: "generating" | "ready" | "failed" | "partial";
  generation_error: string | null;
  kit: Kit;
  meta: KitMeta;
  created_at: string;
  updated_at: string;
}

// --- Batch entry point I/O (Appendix B) ---

export interface BatchCase {
  id: string;
  jd: string;
  company_url: string;
  days: number;
}

export interface BatchKitResult {
  id: string;
  status: "ok" | "failed";
  kit: Kit | null;
  error: { code: string; message: string } | null;
}

export interface BatchOutput {
  version: string;
  generated_at: string;
  kits: BatchKitResult[];
}
