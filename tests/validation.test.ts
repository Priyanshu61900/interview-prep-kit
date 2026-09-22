import { describe, expect, it } from "vitest";
import { validateKit, checkReferentialIntegrity, kitSchema } from "@/lib/validation/kitSchema";
import type { Kit } from "@/types/kit";

function baseKit(): Kit {
  return {
    source: {
      company: "Acme",
      company_url: "https://acme.example",
      role: "Backend Engineer",
      location: "",
      jd_chars: 120,
      researched_at: new Date().toISOString(),
      pages_used: ["https://acme.example"],
    },
    company_brief: { summary: "s", what_they_do: "d", sources: [] },
    role: {
      title: "Backend Engineer",
      seniority: "Senior",
      responsibilities: ["Ship things"],
      requirements: [{ id: "r1", text: "5+ years with React", kind: "technical", priority: "must" }],
    },
    questions: [{ id: "q1", requirement_ids: ["r1"], category: "technical", prompt: "p", answer_outline: "a", difficulty: 2 }],
    flashcards: [{ id: "f1", front: "front", back: "back", requirement_ids: ["r1"] }],
    schedule: { days_available: 1, days: [{ day: 1, focus: "React", question_ids: ["q1"], minutes: 30 }] },
    coverage: { uncovered_requirement_ids: [], passes: 1 },
  };
}

describe("validateKit", () => {
  it("accepts a well-formed kit", () => {
    const result = validateKit(baseKit());
    expect(result.ok).toBe(true);
  });

  it("rejects a question that references a requirement id that doesn't exist", () => {
    const kit = baseKit();
    kit.questions[0].requirement_ids = ["r-missing"];
    const result = validateKit(kit);
    expect(result.ok).toBe(false);
  });

  it("rejects a schedule day whose question_ids reference a question that doesn't exist", () => {
    const kit = baseKit();
    kit.schedule.days[0].question_ids = ["q-missing"];
    const result = validateKit(kit);
    expect(result.ok).toBe(false);
  });

  it("rejects a non-integer difficulty", () => {
    const parsed = kitSchema.safeParse({ ...baseKit(), questions: [{ ...baseKit().questions[0], difficulty: 2.5 }] });
    expect(parsed.success).toBe(false);
  });

  it("rejects duplicate requirement ids", () => {
    const kit = baseKit();
    kit.role.requirements.push({ id: "r1", text: "dup", kind: "technical", priority: "nice" });
    const issues = checkReferentialIntegrity(kitSchema.parse(baseKitWithDuplicateStrippedForParse(kit)));
    expect(issues.some((i) => i.message.includes("duplicate"))).toBe(true);
  });

  it("rejects a schedule whose day count does not match days_available", () => {
    const kit = baseKit();
    kit.schedule.days_available = 3;
    const result = validateKit(kit);
    expect(result.ok).toBe(false);
  });

  it("rejects an invalid priority value", () => {
    const parsed = kitSchema.safeParse({
      ...baseKit(),
      role: { ...baseKit().role, requirements: [{ id: "r1", text: "x", kind: "technical", priority: "optional" }] },
    });
    expect(parsed.success).toBe(false);
  });
});

// duplicate ids fail zod's inferred type only if we bypass strict parse first; this
// helper keeps the duplicate-id test focused on checkReferentialIntegrity's own logic.
function baseKitWithDuplicateStrippedForParse(kit: Kit) {
  return kit;
}
