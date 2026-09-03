// Métricas de desempenho derivadas SOMENTE de ações reais do usuário —
// nenhum número aqui pode ser inventado. É a fonte do dashboard Vision+.

import { readDb } from "../data/storage/index.js";

// Domínio médio: média do content.mastery.score entre os conteúdos que já
// têm alguma tentativa (level != not_started). null quando ainda não há nenhum.
function averageMasteryScore(contents) {
  const scored = contents.filter((c) => (c.mastery?.level || "not_started") !== "not_started");
  if (scored.length === 0) return null;
  const total = scored.reduce((sum, c) => sum + (c.mastery?.score || 0), 0);
  return Math.round(total / scored.length);
}

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

  const masteryBreakdown = { not_started: 0, needs_review: 0, developing: 0, mastered: 0 };
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
    averageMasteryScore: averageMasteryScore(db.contents),
    hasActivity: db.quizAttempts.length > 0 || db.flashcardAttempts.length > 0,
  };
}

// Uma linha por matéria com conteúdo, ordenada por taxa de acerto (as com
// dados primeiro). accuracyRate é null quando a matéria ainda não tem quiz.
export function getSubjectsWithPerformance() {
  const db = readDb();
  return db.subjects
    .map((subject) => {
      const perf = getPerformanceForSubject(subject.id);
      return { id: subject.id, name: subject.name, ...perf };
    })
    .filter((s) => s.contentsCount > 0)
    .sort((a, b) => (b.accuracyRate ?? -1) - (a.accuracyRate ?? -1));
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
