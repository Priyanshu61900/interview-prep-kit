import { crawlCompanySite } from "@/lib/pipeline/crawler";
import { searchPublicDiscussion } from "@/lib/pipeline/publicDiscussion";
import { extractRequirements } from "@/lib/pipeline/extractRequirements";
import { generateJson, LlmError } from "@/lib/llm/provider";
import { buildCompanyBriefPrompt, COMPANY_BRIEF_SYSTEM } from "@/lib/llm/prompts";
import { generateQuestionsForCategory, assignQuestionIds, planCategories } from "@/lib/pipeline/generateQuestions";
import { generateFlashcards } from "@/lib/pipeline/flashcards";
import { findUncoveredRequirements, buildCoverage } from "@/lib/pipeline/coverage";
import { buildSchedule } from "@/lib/pipeline/schedule";
import { validateKit } from "@/lib/validation/kitSchema";
import type { Kit, Question, QuestionCategory, Requirement } from "@/types/kit";

export interface PipelineInput {
  jd: string;
  companyUrl: string;
  days: number;
  allowLoopback?: boolean; // batch runs may target http://localhost fixtures
}

export interface PipelineWarning {
  step: string;
  message: string;
}

export interface PipelineResult {
  kit: Kit;
  warnings: PipelineWarning[];
  skippedSources: { url: string; reason: string }[];
  research: {
    companyName: string;
    aboutText: string;
    hiringText: string;
    hiringProcessNotes: string;
    pagesUsed: string[];
  };
}

export class PipelineError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const MAX_COVERAGE_PASSES = 3; // first draft + up to 2 gap-filling passes

/**
 * Runs the full research -> generation -> validation path for one case.
 * This is the single implementation both the interactive "create kit" API
 * route and the batch CLI (`npm run evaluate`) call — the brief requires
 * they share code rather than duplicate it, so nothing pipeline-specific
 * lives in either caller.
 *
 * Sequencing (deliberately staged, not one prompt returning everything):
 *   1. Crawl the company site (no LLM) -> about/hiring pages, or skip+report.
 *   2. Search for public discussion of the hiring process (no LLM).
 *   3. Extract structured requirements from the JD (LLM, JD-only).
 *   4. Generate the company brief from whatever was actually retrieved (LLM).
 *   5. Generate questions per category, each a separate call with
 *      category-specific instructions, informed by what step 1-2 found.
 *   6. Deterministically check coverage (code, not the model) and loop
 *      gap-filling generation calls until covered or the pass budget is spent.
 *   7. Generate flashcards from the finished question bank (LLM).
 *   8. Deterministically allocate the schedule (code, not the model).
 *   9. Validate the assembled kit against the Appendix A structure.
 */
export async function runPipeline(input: PipelineInput): Promise<PipelineResult> {
  const { jd, companyUrl, days, allowLoopback } = input;
  const warnings: PipelineWarning[] = [];
  const skippedSources: { url: string; reason: string }[] = [];

  // Steps 1-2: retrieval. Independent of the JD and of each other, and
  // neither one is allowed to take the whole run down if it fails.
  const [crawlResult, discussionResult] = await Promise.all([
    crawlCompanySite(companyUrl, { allowLoopback }).catch((err) => {
      warnings.push({ step: "crawl", message: err instanceof Error ? err.message : String(err) });
      return { pagesUsed: [], hiringPages: [], aboutPages: [], skipped: [{ url: companyUrl, reason: "CRAWL_FAILED" }] };
    }),
    searchPublicDiscussion(extractCompanyNameFromUrl(companyUrl)).catch((err) => {
      warnings.push({ step: "public_discussion", message: err instanceof Error ? err.message : String(err) });
      return { snippets: [], skipped: [] };
    }),
  ]);
  skippedSources.push(...crawlResult.skipped, ...discussionResult.skipped);

  const aboutText = crawlResult.aboutPages.map((p) => `[${p.url}]\n${p.text}`).join("\n\n").slice(0, 12000);
  const hiringText = crawlResult.hiringPages.map((p) => `[${p.url}]\n${p.text}`).join("\n\n").slice(0, 12000);
  const discussionText = discussionResult.snippets.map((s) => `[${s.url}] ${s.title}: ${s.snippet}`).join("\n").slice(0, 6000);
  const hiringProcessNotes = [hiringText, discussionText].filter(Boolean).join("\n\n");

  const companyName =
    crawlResult.pagesUsed[0]?.title?.split(/[-|–]/)[0]?.trim() || extractCompanyNameFromUrl(companyUrl);

  // Step 3: JD is pasted text, needs no retrieval — straight to extraction.
  let extracted;
  try {
    extracted = await extractRequirements(jd);
  } catch (err) {
    throw new PipelineError("EXTRACTION_FAILED", describeLlmError(err, "extracting requirements from the job description"));
  }

  // Step 4: company brief, honest about thin or missing source material.
  let companyBrief: { summary: string; what_they_do: string };
  try {
    if (!aboutText && !hiringText) {
      companyBrief = {
        summary: "Limited public information was found about this company from the site provided.",
        what_they_do: "Not enough retrievable content to describe what this company does.",
      };
      warnings.push({ step: "company_brief", message: "No about/hiring page content retrieved; produced an honest thin brief." });
    } else {
      const brief = await generateJson<{ summary: string; what_they_do: string }>({
        system: COMPANY_BRIEF_SYSTEM,
        prompt: buildCompanyBriefPrompt(companyName, aboutText, hiringText),
        temperature: 0.3,
      });
      companyBrief = { summary: brief.summary?.trim() || "", what_they_do: brief.what_they_do?.trim() || "" };
    }
  } catch (err) {
    warnings.push({ step: "company_brief", message: describeLlmError(err, "generating the company brief") });
    companyBrief = { summary: "Company brief could not be generated due to a research or generation error.", what_they_do: "" };
  }

  // Step 5: question generation, one call per category.
  const categoryPlan = planCategories(extracted.requirements, extracted.seniority, hiringProcessNotes);
  let questions: Question[] = [];
  let nextQuestionIndex = 1;

  for (const [category, reqs] of Object.entries(categoryPlan) as [QuestionCategory, Requirement[]][]) {
    try {
      const raw = await generateQuestionsForCategory(category, reqs, {
        companyContext: `${companyBrief.summary}\n${companyBrief.what_they_do}`,
        hiringProcessNotes,
      });
      const withIds = assignQuestionIds(raw, nextQuestionIndex);
      nextQuestionIndex += withIds.length;
      questions = questions.concat(withIds);
    } catch (err) {
      warnings.push({ step: `questions:${category}`, message: describeLlmError(err, `generating ${category} questions`) });
    }
  }

  // Step 6: deterministic coverage check + gap-filling loop (the "second pass").
  let passes = 1;
  for (let pass = 2; pass <= MAX_COVERAGE_PASSES; pass++) {
    const uncovered = findUncoveredRequirements(extracted.requirements, questions);
    if (!uncovered.length) break;

    const uncoveredReqs = extracted.requirements.filter((r) => uncovered.includes(r.id));
    const gapPlan = planCategories(uncoveredReqs, extracted.seniority, hiringProcessNotes);
    let filledAny = false;

    for (const [category, reqs] of Object.entries(gapPlan) as [QuestionCategory, Requirement[]][]) {
      try {
        const raw = await generateQuestionsForCategory(category, reqs, {
          companyContext: `${companyBrief.summary}\n${companyBrief.what_they_do}`,
          hiringProcessNotes,
        });
        if (raw.length) {
          const withIds = assignQuestionIds(raw, nextQuestionIndex);
          nextQuestionIndex += withIds.length;
          questions = questions.concat(withIds);
          filledAny = true;
        }
      } catch (err) {
        warnings.push({ step: `coverage_pass_${pass}:${category}`, message: describeLlmError(err, `filling coverage gaps for ${category}`) });
      }
    }

    passes = pass;
    if (!filledAny) break; // no progress possible this pass, stop rather than loop pointlessly
  }

  // Step 7: flashcards, derived from the finished question bank.
  let flashcards: Kit["flashcards"] = [];
  try {
    flashcards = await generateFlashcards(questions, 1);
  } catch (err) {
    warnings.push({ step: "flashcards", message: describeLlmError(err, "generating flashcards") });
  }

  // Step 8: deterministic schedule allocation.
  const schedule = buildSchedule(extracted.requirements, questions, days);

  const kit: Kit = {
    source: {
      company: companyName,
      company_url: companyUrl,
      role: extracted.title,
      location: extractLocation(jd),
      jd_chars: jd.length,
      researched_at: new Date().toISOString(),
      pages_used: crawlResult.pagesUsed.map((p) => p.url),
    },
    company_brief: { ...companyBrief, sources: crawlResult.pagesUsed.map((p) => p.url) },
    role: {
      title: extracted.title,
      seniority: extracted.seniority,
      responsibilities: extracted.responsibilities,
      requirements: extracted.requirements,
    },
    questions,
    flashcards,
    schedule,
    coverage: buildCoverage(extracted.requirements, questions, passes),
  };

  const validation = validateKit(kit);
  if (!validation.ok) {
    throw new PipelineError(
      "INVALID_KIT_STRUCTURE",
      `Generated kit failed structural validation: ${validation.issues.map((i) => `${i.path}: ${i.message}`).join("; ")}`
    );
  }

  return {
    kit,
    warnings,
    skippedSources,
    research: {
      companyName,
      aboutText,
      hiringText,
      hiringProcessNotes,
      pagesUsed: crawlResult.pagesUsed.map((p) => p.url),
    },
  };
}

function extractCompanyNameFromUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const base = host.split(".")[0];
    return base.charAt(0).toUpperCase() + base.slice(1);
  } catch {
    return url;
  }
}

function extractLocation(jd: string): string {
  const match = jd.match(/location\s*[:\-]\s*([^\n]{1,80})/i);
  return match ? match[1].trim() : "";
}

function describeLlmError(err: unknown, context: string): string {
  if (err instanceof LlmError) return `${err.code} while ${context}: ${err.message}`;
  return `Error while ${context}: ${err instanceof Error ? err.message : String(err)}`;
}
