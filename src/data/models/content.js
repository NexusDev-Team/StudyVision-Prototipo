import { newId, ID_PREFIX } from "../../utils/id.js";
import { nowIso } from "../../utils/date.js";
import { createFlashcard } from "./flashcard.js";
import { createQuiz } from "./quiz.js";
import { LEARNING_PREFERENCE_KEYS } from "../../constants.js";

export const REVIEW_PLANS = ["none", "weekly", "biweekly", "monthly"];

// Modo Inclusão (Fase 10): rastro opcional de quais preferências de aprendizagem
// geraram este material. `null` = conteúdo criado sem o Modo Inclusão (todo o
// legado). Quando presente, é um objeto só com as chaves canônicas, booleanas.
// Prepara — sem implementar agora — a futura análise de desempenho por formato.
export function sanitizeLearningPreferences(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const options = {};
  for (const key of LEARNING_PREFERENCE_KEYS) options[key] = raw[key] === true;
  return options;
}

// extractedText/extractedTextAt/extractedTextPartial: texto transcrito desta
// FOTO específica (feature de extração de texto), sob demanda, via
// /api/extract-text. Independente e nunca misturado com content.extractedText,
// content.summary ou content.notes — ver src/services/photoTextService.js.
// extractedText === "" significa "nunca extraído" (não "sem texto na foto";
// esse caso usa reason "no_text" na resposta do endpoint e não persiste nada).
export function createImage({ contentId, dataUrl, order, createdAt, extractedText, extractedTextAt, extractedTextPartial } = {}) {
  return {
    id: newId(ID_PREFIX.image),
    contentId: contentId || null,
    dataUrl: dataUrl || "",
    order: typeof order === "number" ? order : 0,
    createdAt: createdAt || nowIso(),
    extractedText: typeof extractedText === "string" ? extractedText : "",
    extractedTextAt: typeof extractedTextAt === "string" ? extractedTextAt : null,
    extractedTextPartial: extractedTextPartial === true,
  };
}

export function createOpenQuestion({ contentId, question } = {}) {
  return {
    id: newId(ID_PREFIX.openQuestion),
    contentId: contentId || null,
    question: String(question || ""),
  };
}

// mastery.level: not_started | needs_review | developing | mastered
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
    // Sinal derivado do desempenho real (studyService.updateRecommendedDifficulty),
    // usado futuramente para a IA adaptar a dificuldade de novas questões.
    // Não confundir com `difficulty`, que descreve o material analisado.
    recommendedDifficulty: ["easy", "medium", "hard"].includes(input.recommendedDifficulty)
      ? input.recommendedDifficulty
      : null,
    images,
    flashcards,
    quizzes,
    openQuestions,
    mastery: createMastery(input.mastery),
    // Cadência de revisão escolhida pelo usuário na captura. "none" = sem
    // revisão de plano. Conteúdo legado (sem o campo) é tratado como "none"
    // por reconcileReviews.
    reviewPlan: REVIEW_PLANS.includes(input.reviewPlan) ? input.reviewPlan : "none",
    learningPreferences: sanitizeLearningPreferences(input.learningPreferences),
    createdAt,
    updatedAt: input.updatedAt || now,
  };
}
