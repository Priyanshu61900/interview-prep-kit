import { describe, expect, it } from "vitest";
import { findUncoveredRequirements, buildCoverage } from "@/lib/pipeline/coverage";
import type { Question, Requirement } from "@/types/kit";

function req(id: string): Requirement {
  return { id, text: `Requirement ${id}`, kind: "technical", priority: "must" };
}
function q(id: string, requirement_ids: string[]): Question {
  return { id, requirement_ids, category: "technical", prompt: "p", answer_outline: "", difficulty: 2 };
}

describe("findUncoveredRequirements", () => {
  it("returns requirements with no covering question", () => {
    const requirements = [req("r1"), req("r2"), req("r3")];
    const questions = [q("q1", ["r1"]), q("q2", ["r1", "r2"])];
    expect(findUncoveredRequirements(requirements, questions)).toEqual(["r3"]);
  });

  it("returns an empty array when every requirement has at least one question", () => {
    const requirements = [req("r1"), req("r2")];
    const questions = [q("q1", ["r1"]), q("q2", ["r2"])];
    expect(findUncoveredRequirements(requirements, questions)).toEqual([]);
  });

  it("treats a requirement as uncovered if no question references it, even if other questions exist", () => {
    const requirements = [req("r1")];
    const questions = [q("q1", ["r2"])]; // covers an unrelated requirement id
    expect(findUncoveredRequirements(requirements, questions)).toEqual(["r1"]);
  });

  it("handles zero requirements and zero questions", () => {
    expect(findUncoveredRequirements([], [])).toEqual([]);
  });
});

describe("buildCoverage", () => {
  it("reports the pass count it was given alongside the uncovered list", () => {
    const coverage = buildCoverage([req("r1")], [], 2);
    expect(coverage).toEqual({ uncovered_requirement_ids: ["r1"], passes: 2 });
  });
});
