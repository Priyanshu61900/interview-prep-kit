import { generateJson } from "@/lib/llm/provider";
import { buildFlashcardPrompt, FLASHCARD_SYSTEM } from "@/lib/llm/prompts";
import type { Flashcard, Question } from "@/types/kit";

interface RawFlashcard {
  front: string;
  back: string;
  requirement_ids: string[];
}

/**
 * Derives flashcards from the finished question bank rather than the
 * requirements directly, so every flashcard traces back to a real question
 * (and therefore a real requirement) instead of being invented independently.
 */
export async function generateFlashcards(questions: Question[], startIndex: number): Promise<Flashcard[]> {
  if (!questions.length) return [];

  const raw = await generateJson<{ flashcards: RawFlashcard[] }>({
    system: FLASHCARD_SYSTEM,
    prompt: buildFlashcardPrompt(questions.map((q) => ({ id: q.id, prompt: q.prompt, answer_outline: q.answer_outline, requirement_ids: q.requirement_ids }))),
    temperature: 0.4,
  });

  const validIds = new Set(questions.flatMap((q) => q.requirement_ids));
  return (raw.flashcards ?? [])
    .filter((f) => f && typeof f.front === "string" && f.front.trim())
    .map((f, i) => ({
      id: `f${startIndex + i}`,
      front: f.front.trim(),
      back: (f.back ?? "").trim(),
      requirement_ids: (f.requirement_ids ?? []).filter((id) => validIds.has(id)),
    }));
}
