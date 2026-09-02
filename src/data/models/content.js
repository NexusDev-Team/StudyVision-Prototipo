import { newId, ID_PREFIX } from "../../utils/id.js";
import { nowIso } from "../../utils/date.js";
import { createFlashcard } from "./flashcard.js";
import { createQuiz } from "./quiz.js";

export function createImage({ contentId, dataUrl, order, createdAt } = {}) {
  return {
    id: newId(ID_PREFIX.image),
    contentId: contentId || null,
    dataUrl: dataUrl || "",
    order: typeof order === "number" ? order : 0,
    createdAt: createdAt || nowIso(),
  };
}

export function createOpenQuestion({ contentId, question } = {}) {
  return {
    id: newId(ID_PREFIX.openQuestion),
    contentId: contentId || null,
    question: String(question || ""),
  };
}

// mastery.level: not_started | learning | developing | mastered | needs_review
export function createMastery({ score, level, updatedAt } = {}) {
  return {
    score: typeof score === "number" ? score : 0,
    level: level || "not_started",
    updatedAt: updatedAt || null,
  };
}

// CONTENT — entidade central do Study Vision. Toda foto, flashcard, quiz e
// questão pertence exclusivamente a um content e carrega seu contentId.
export function createContent(input = {}) {
  const id = input.id || newId(ID_PREFIX.content);
  const now = nowIso();
  const createdAt = input.createdAt || now;

  const images = (Array.isArray(input.images) ? input.images : []).map((img, i) =>
    img.id ? { ...img, contentId: id } : createImage({ ...img, contentId: id, order: img.order ?? i })
  );

  const flashcards = (Array.isArray(input.flashcards) ? input.flashcards : []).map((fc) =>
    fc.id ? { ...fc, contentId: id } : createFlashcard({ ...fc, contentId: id })
  );

  const quizzes = (Array.isArray(input.quizzes) ? input.quizzes : []).map((qz) =>
    qz.id ? { ...qz, contentId: id } : createQuiz({ ...qz, contentId: id })
  );

  const openQuestions = (Array.isArray(input.openQuestions) ? input.openQuestions : []).map((oq) =>
    typeof oq === "string"
      ? createOpenQuestion({ contentId: id, question: oq })
      : oq.id
      ? { ...oq, contentId: id }
      : createOpenQuestion({ ...oq, contentId: id })
  );

  return {
    id,
    subjectId: input.subjectId || null,
    subjectName: input.subjectName || "",
    topic: input.topic || "",
    title: input.title || input.topic || "Conteúdo sem título",
    extractedText: input.extractedText || "",
    summary: input.summary || "",
    notes: input.notes || "",
    keyConcepts: Array.isArray(input.keyConcepts) ? input.keyConcepts : [],
    keywords: Array.isArray(input.keywords) ? input.keywords : [],
    difficulty: ["easy", "medium", "hard"].includes(input.difficulty) ? input.difficulty : null,
    images,
    flashcards,
    quizzes,
    openQuestions,
    mastery: createMastery(input.mastery),
    isSample: Boolean(input.isSample),
    createdAt,
    updatedAt: input.updatedAt || now,
  };
}
