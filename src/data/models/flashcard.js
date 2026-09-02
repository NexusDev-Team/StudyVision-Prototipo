import { newId, ID_PREFIX } from "../../utils/id.js";
import { nowIso } from "../../utils/date.js";

export function createFlashcard({ contentId, front, back, source, createdAt } = {}) {
  return {
    id: newId(ID_PREFIX.flashcard),
    contentId: contentId || null,
    front: String(front || ""),
    back: String(back || ""),
    source: source === "user" ? "user" : "ai",
    createdAt: createdAt || nowIso(),
  };
}

// Uma tentativa de flashcard — sempre um registro novo, nunca sobrescreve o anterior.
export function createFlashcardAttempt({ flashcardId, contentId, correct, answeredAt, responseTimeMs } = {}) {
  return {
    id: newId(ID_PREFIX.flashcardAttempt),
    flashcardId: flashcardId || null,
    contentId: contentId || null,
    correct: Boolean(correct),
    answeredAt: answeredAt || nowIso(),
    responseTimeMs: typeof responseTimeMs === "number" ? responseTimeMs : null,
  };
}
