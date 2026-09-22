import { generateJson } from "@/lib/llm/provider";
import { buildExtractRequirementsPrompt, EXTRACT_REQUIREMENTS_SYSTEM } from "@/lib/llm/prompts";
import type { Requirement } from "@/types/kit";

export interface ExtractedRole {
  title: string;
  seniority: string;
  responsibilities: string[];
  requirements: Requirement[];
}

interface RawExtraction {
  title: string;
  seniority: string;
  responsibilities: string[];
  requirements: { id: string; text: string; kind: string; priority: string }[];
}

const VALID_KINDS = new Set(["technical", "behavioural", "domain"]);
const VALID_PRIORITIES = new Set(["must", "nice"]);

/**
 * Extracts a structured requirement list from the pasted job description.
 * This is step one of the pipeline: everything downstream (questions,
 * flashcards, schedule) is generated *from* these requirements, so this
 * step alone is responsible for not inventing content the JD doesn't
 * support — a thin JD must produce a short requirement list, not a padded one.
 */
export async function extractRequirements(jd: string): Promise<ExtractedRole> {
  const trimmed = jd.trim();
  if (!trimmed) {
    return { title: "Untitled role", seniority: "unspecified", responsibilities: [], requirements: [] };
  }

  const raw = await generateJson<RawExtraction>({
    system: EXTRACT_REQUIREMENTS_SYSTEM,
    prompt: buildExtractRequirementsPrompt(trimmed),
    temperature: 0.2,
  });

  const requirements: Requirement[] = (raw.requirements ?? [])
    .filter((r) => r && typeof r.text === "string" && r.text.trim())
    .map((r, i) => ({
      id: `r${i + 1}`,
      text: r.text.trim(),
      kind: VALID_KINDS.has(r.kind) ? (r.kind as Requirement["kind"]) : "technical",
      priority: VALID_PRIORITIES.has(r.priority) ? (r.priority as Requirement["priority"]) : "nice",
    }));

  return {
    title: raw.title?.trim() || "Untitled role",
    seniority: raw.seniority?.trim() || "unspecified",
    responsibilities: Array.isArray(raw.responsibilities) ? raw.responsibilities.filter(Boolean) : [],
    requirements,
  };
}
