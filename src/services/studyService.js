// Registro de desempenho real: tentativas de flashcard e de quiz são sempre
// anexadas (append-only), nunca sobrescrevem o histórico anterior.

import { readDb, withDb } from "../data/storage/index.js";
import { createFlashcardAttempt } from "../data/models/flashcard.js";
import { createQuizAttempt } from "../data/models/quiz.js";
import { nowIso } from "../utils/date.js";

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

// not_started (sem tentativa) | needs_review (<60%) | developing (60-79%) | mastered (>=80%)
export function masteryLevelFromScore(score, hasAttempts) {
  if (!hasAttempts) return "not_started";
  if (score >= 80) return "mastered";
  if (score >= 60) return "developing";
  return "needs_review";
}

export function calculateMastery(contentId) {
  const { flashcardAttempts, quizAttempts } = getAttemptsForContent(contentId);
  const hasAttempts = flashcardAttempts.length > 0 || quizAttempts.length > 0;

  if (!hasAttempts) {
    return { score: 0, level: "not_started", updatedAt: nowIso() };
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

  return { score, level: masteryLevelFromScore(score, true), updatedAt: nowIso() };
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
