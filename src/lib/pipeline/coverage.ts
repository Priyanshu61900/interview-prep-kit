import type { Coverage, Question, Requirement } from "@/types/kit";

// Deterministic by design, per the brief: "Comparing the extracted
// requirements against the generated questions to find the gaps is likewise
// your code's decision to make, not the model's." No LLM call here.

/**
 * A requirement is "covered" if at least one question references its id.
 * Returns the ids of requirements with zero covering questions — the gap
 * list the second pass must act on.
 */
export function findUncoveredRequirements(requirements: Requirement[], questions: Question[]): string[] {
  const covered = new Set(questions.flatMap((q) => q.requirement_ids));
  return requirements.filter((r) => !covered.has(r.id)).map((r) => r.id);
}

export function buildCoverage(requirements: Requirement[], questions: Question[], passes: number): Coverage {
  return {
    uncovered_requirement_ids: findUncoveredRequirements(requirements, questions),
    passes,
  };
}
