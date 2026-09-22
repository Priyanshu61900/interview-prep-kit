import { describe, expect, it } from "vitest";
import { buildSchedule } from "@/lib/pipeline/schedule";
import type { Question, Requirement } from "@/types/kit";

function req(id: string, priority: "must" | "nice" = "must"): Requirement {
  return { id, text: `Requirement ${id}`, kind: "technical", priority };
}

function q(id: string, requirement_ids: string[], difficulty: 1 | 2 | 3 = 2, category: Question["category"] = "technical"): Question {
  return { id, requirement_ids, category, prompt: `Prompt ${id}`, answer_outline: "", difficulty };
}

describe("buildSchedule", () => {
  it("produces exactly the number of days requested", () => {
    const requirements = [req("r1"), req("r2")];
    const questions = [q("q1", ["r1"]), q("q2", ["r2"])];
    for (const days of [1, 3, 7, 60]) {
      const schedule = buildSchedule(requirements, questions, days);
      expect(schedule.days).toHaveLength(days);
      expect(schedule.days_available).toBe(days);
    }
  });

  it("every question_ids entry refers to a real question", () => {
    const requirements = [req("r1"), req("r2"), req("r3")];
    const questions = [q("q1", ["r1"]), q("q2", ["r2"]), q("q3", ["r3"])];
    const schedule = buildSchedule(requirements, questions, 2);
    const validIds = new Set(questions.map((qq) => qq.id));
    for (const day of schedule.days) {
      for (const qid of day.question_ids) expect(validIds.has(qid)).toBe(true);
    }
  });

  it("every day has an integer minutes value", () => {
    const requirements = [req("r1"), req("r2")];
    const questions = [q("q1", ["r1"], 3), q("q2", ["r2"], 1)];
    const schedule = buildSchedule(requirements, questions, 5);
    for (const day of schedule.days) {
      expect(Number.isInteger(day.minutes)).toBe(true);
    }
  });

  it("puts must-have, higher-difficulty material on earlier days than nice-to-have, lower-difficulty material", () => {
    const requirements = [req("r-must", "must"), req("r-nice", "nice")];
    const questions = [q("q-nice", ["r-nice"], 1), q("q-must", ["r-must"], 3)];
    const schedule = buildSchedule(requirements, questions, 2);
    // q-must should land on day 1 (or at least no later than q-nice)
    const dayOfMust = schedule.days.find((d) => d.question_ids.includes("q-must"))!.day;
    const dayOfNice = schedule.days.find((d) => d.question_ids.includes("q-nice"))!.day;
    expect(dayOfMust).toBeLessThanOrEqual(dayOfNice);
  });

  it("handles a 1-day schedule by packing everything into a single day", () => {
    const requirements = [req("r1"), req("r2"), req("r3")];
    const questions = [q("q1", ["r1"]), q("q2", ["r2"]), q("q3", ["r3"])];
    const schedule = buildSchedule(requirements, questions, 1);
    expect(schedule.days).toHaveLength(1);
    expect(schedule.days[0].question_ids.sort()).toEqual(["q1", "q2", "q3"]);
  });

  it("handles a 60-day schedule by filling extra days with review rather than leaving them empty", () => {
    const requirements = [req("r1")];
    const questions = [q("q1", ["r1"])];
    const schedule = buildSchedule(requirements, questions, 60);
    expect(schedule.days).toHaveLength(60);
    expect(schedule.days.every((d) => d.focus.length > 0)).toBe(true);
  });

  it("handles zero questions without throwing, still producing the requested number of days", () => {
    const schedule = buildSchedule([], [], 4);
    expect(schedule.days).toHaveLength(4);
  });
});
