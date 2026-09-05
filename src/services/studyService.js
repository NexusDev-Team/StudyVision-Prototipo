// Registro de desempenho real: tentativas de flashcard e de quiz são sempre
// anexadas (append-only), nunca sobrescrevem o histórico anterior.

import { readDb, withDb } from "../data/storage/index.js";
import { createFlashcardAttempt } from "../data/models/flashcard.js";
import { createQuizAttempt } from "../data/models/quiz.js";
import { nowIso } from "../utils/date.js";
import { getContentPerformance } from "./performanceService.js";
import { advanceReviewsAfterActivity } from "./reviewService.js";

export function recordFlashcardAttempt({ flashcardId, contentId, correct, responseTimeMs }) {
  const attempt = createFlashcardAttempt({ flashcardId, contentId, correct, responseTimeMs });
  withDb((db) => ({ ...db, flashcardAttempts: [...db.flashcardAttempts, attempt] }));
  return attempt;
}

export function recordQuizAttempt({ quizId, contentId, answers }) {
  const attempt = createQuizAttempt({ quizId, contentId, answers });
  withDb((db) => ({ ...db, quizAttempts: [...db.quizAttempts, attempt] }));
  return attempt;
}

export function getAttemptsForContent(contentId) {
  const db = readDb();
  return {
    flashcardAttempts: db.flashcardAttempts.filter((a) => a.contentId === contentId),
    quizAttempts: db.quizAttempts.filter((a) => a.contentId === contentId),
  };
}

// Um único acerto isolado não vira "domínio absoluto": abaixo desse número de
// interações, o nível fica travado em "developing" mesmo com score alto.
export const MIN_INTERACTIONS_FOR_MASTERY = 3;

// not_started (sem tentativa) | needs_review (<60%) | developing (60-79%) | mastered (>=80%)
export function masteryLevelFromScore(score, hasAttempts, interactions = Infinity) {
  if (!hasAttempts) return "not_started";
  if (score >= 80) return interactions < MIN_INTERACTIONS_FOR_MASTERY ? "developing" : "mastered";
  if (score >= 60) return "developing";
  return "needs_review";
}

// 1 interação = 1 flashcard respondido ou 1 questão de quiz respondida.
export function getInteractionCount(contentId) {
  const { flashcardAttempts, quizAttempts } = getAttemptsForContent(contentId);
  return flashcardAttempts.length + quizAttempts.reduce((sum, a) => sum + a.totalQuestions, 0);
}

export function calculateMastery(contentId) {
  const { flashcardAttempts, quizAttempts } = getAttemptsForContent(contentId);
  const hasAttempts = flashcardAttempts.length > 0 || quizAttempts.length > 0;

  if (!hasAttempts) {
    return { score: 0, level: "not_started", interactions: 0, updatedAt: nowIso() };
  }

  const flashcardCorrect = flashcardAttempts.filter((a) => a.correct).length;
  const flashcardRate = flashcardAttempts.length > 0 ? (flashcardCorrect / flashcardAttempts.length) * 100 : null;

  const quizAvg =
    quizAttempts.length > 0
      ? quizAttempts.reduce((sum, a) => sum + a.score, 0) / quizAttempts.length
      : null;

  // Média simples entre as duas fontes disponíveis; se só uma existir, usa só ela.
  const parts = [flashcardRate, quizAvg].filter((v) => v !== null);
  const score = Math.round(parts.reduce((sum, v) => sum + v, 0) / parts.length);
  const interactions = getInteractionCount(contentId);

  return { score, level: masteryLevelFromScore(score, true, interactions), interactions, updatedAt: nowIso() };
}

// Recalcula e persiste o domínio do conteúdo (content.mastery).
export function updateMastery(contentId) {
  const mastery = calculateMastery(contentId);
  let updated = null;
  withDb((db) => ({
    ...db,
    contents: db.contents.map((c) => {
      if (c.id !== contentId) return c;
      updated = { ...c, mastery, updatedAt: nowIso() };
      return updated;
    }),
  }));
  return updated?.mastery ?? mastery;
}

// Sinal derivado do desempenho real — não confundir com content.difficulty
// (o nível do material analisado pela IA). Usado futuramente para a IA
// gerar novas questões no nível certo para o estudante.
export function getRecommendedDifficulty(contentId) {
  const { overall } = getContentPerformance(contentId);
  if (overall === null) return null;
  if (overall < 60) return "easy";
  if (overall < 80) return "medium";
  return "hard";
}

// Recalcula e persiste content.recommendedDifficulty.
export function updateRecommendedDifficulty(contentId) {
  const recommendedDifficulty = getRecommendedDifficulty(contentId);
  withDb((db) => ({
    ...db,
    contents: db.contents.map((c) => (c.id === contentId ? { ...c, recommendedDifficulty, updatedAt: nowIso() } : c)),
  }));
  return recommendedDifficulty;
}

// Orquestrador único chamado pelas telas de estudo após uma sessão de quiz ou
// flashcards: nenhuma fórmula, agendamento ou escrita de db fica em componente.
export function registerActivity(contentId) {
  const mastery = updateMastery(contentId);
  const recommendedDifficulty = updateRecommendedDifficulty(contentId);
  const performance = getContentPerformance(contentId);
  // Só antecipa a revisão de compromisso pendente quando o desempenho pede —
  // nunca cria revisão nova nem mexe na revisão de plano.
  const review = advanceReviewsAfterActivity(contentId, performance.overall);
  return { mastery, recommendedDifficulty, review, performance };
}
