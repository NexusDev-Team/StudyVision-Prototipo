// Métricas de desempenho derivadas SOMENTE de ações reais do usuário —
// nenhum número aqui pode ser inventado. Construído nesta fase para uso
// futuro; a Fase 2 troca a fonte do dashboard Vision+ (hoje plusMetrics.js
// mock) por este serviço.

import { readDb } from "../data/storage/index.js";

export function getPerformanceSummary() {
  const db = readDb();

  const contentsCreated = db.contents.length;

  const questionsAnswered = db.quizAttempts.reduce((sum, a) => sum + a.totalQuestions, 0);
  const questionsCorrect = db.quizAttempts.reduce((sum, a) => sum + a.correctAnswers, 0);
  const quizAccuracyRate = questionsAnswered > 0 ? Math.round((questionsCorrect / questionsAnswered) * 100) : null;

  const flashcardsReviewed = db.flashcardAttempts.length;
  const flashcardsCorrect = db.flashcardAttempts.filter((a) => a.correct).length;
  const flashcardAccuracyRate =
    flashcardsReviewed > 0 ? Math.round((flashcardsCorrect / flashcardsReviewed) * 100) : null;

  const masteryBreakdown = { not_started: 0, learning: 0, developing: 0, mastered: 0, needs_review: 0 };
  for (const content of db.contents) {
    const level = content.mastery?.level || "not_started";
    if (level in masteryBreakdown) masteryBreakdown[level] += 1;
  }

  return {
    contentsCreated,
    questionsAnswered,
    questionsCorrect,
    quizAccuracyRate,
    flashcardsReviewed,
    flashcardsCorrect,
    flashcardAccuracyRate,
    masteryBreakdown,
  };
}

export function getPerformanceForSubject(subjectId) {
  const db = readDb();
  const contentIds = new Set(db.contents.filter((c) => c.subjectId === subjectId).map((c) => c.id));

  const quizAttempts = db.quizAttempts.filter((a) => contentIds.has(a.contentId));
  const flashcardAttempts = db.flashcardAttempts.filter((a) => contentIds.has(a.contentId));

  const questionsAnswered = quizAttempts.reduce((sum, a) => sum + a.totalQuestions, 0);
  const questionsCorrect = quizAttempts.reduce((sum, a) => sum + a.correctAnswers, 0);

  return {
    contentsCount: contentIds.size,
    questionsAnswered,
    questionsCorrect,
    accuracyRate: questionsAnswered > 0 ? Math.round((questionsCorrect / questionsAnswered) * 100) : null,
    flashcardsReviewed: flashcardAttempts.length,
    flashcardsCorrect: flashcardAttempts.filter((a) => a.correct).length,
  };
}
