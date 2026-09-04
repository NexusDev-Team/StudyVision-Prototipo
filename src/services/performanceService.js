// Métricas de desempenho derivadas SOMENTE de ações reais do usuário —
// nenhum número aqui pode ser inventado. É a fonte do dashboard Vision+.

import { readDb } from "../data/storage/index.js";
import { getPendingReviews, getCompletedReviews, getOverdueReviews } from "./reviewService.js";

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

// Desempenho de quiz de UM conteúdo, com histórico completo (base para a
// evolução da Fase 5). null quando não há tentativa nenhuma.
export function getQuizPerformance(contentId) {
  const db = readDb();
  const attempts = db.quizAttempts
    .filter((a) => a.contentId === contentId)
    .sort((a, b) => new Date(a.answeredAt) - new Date(b.answeredAt));

  if (attempts.length === 0) {
    return {
      attempts: 0,
      questionsAnswered: 0,
      questionsCorrect: 0,
      questionsWrong: 0,
      accuracyRate: null,
      averageScore: null,
      bestScore: null,
      lastScore: null,
      history: [],
    };
  }

  const questionsAnswered = attempts.reduce((sum, a) => sum + a.totalQuestions, 0);
  const questionsCorrect = attempts.reduce((sum, a) => sum + a.correctAnswers, 0);

  return {
    attempts: attempts.length,
    questionsAnswered,
    questionsCorrect,
    questionsWrong: questionsAnswered - questionsCorrect,
    accuracyRate: Math.round((questionsCorrect / questionsAnswered) * 100),
    averageScore: Math.round(attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length),
    bestScore: Math.max(...attempts.map((a) => a.score)),
    lastScore: attempts[attempts.length - 1].score,
    history: attempts.map((a) => ({ score: a.score, answeredAt: a.answeredAt })),
  };
}

// Desempenho de flashcards de UM conteúdo. null quando não há tentativa.
export function getFlashcardPerformance(contentId) {
  const db = readDb();
  const attempts = db.flashcardAttempts
    .filter((a) => a.contentId === contentId)
    .sort((a, b) => new Date(a.answeredAt) - new Date(b.answeredAt));

  if (attempts.length === 0) {
    return { reviewed: 0, correct: 0, wrong: 0, accuracyRate: null, lastAnsweredAt: null };
  }

  const correct = attempts.filter((a) => a.correct).length;
  return {
    reviewed: attempts.length,
    correct,
    wrong: attempts.length - correct,
    accuracyRate: Math.round((correct / attempts.length) * 100),
    lastAnsweredAt: attempts[attempts.length - 1].answeredAt,
  };
}

// Desempenho geral do conteúdo: média entre quiz e flashcards quando ambos
// existem; só a modalidade disponível quando só uma existe; null quando
// nenhuma atividade foi feita — nunca 0 por falta de dados.
export function getContentPerformance(contentId) {
  const quiz = getQuizPerformance(contentId);
  const flashcards = getFlashcardPerformance(contentId);

  const parts = [quiz.accuracyRate, flashcards.accuracyRate].filter((v) => v !== null);
  const overall = parts.length > 0 ? Math.round(parts.reduce((sum, v) => sum + v, 0) / parts.length) : null;

  return {
    quiz,
    flashcards,
    overall,
    interactions: flashcards.reviewed + quiz.questionsAnswered,
    hasActivity: quiz.attempts > 0 || flashcards.reviewed > 0,
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

// Desempenho da matéria baseado exclusivamente nos conteúdos reais dela —
// média dos `overall` (não nulos) de getContentPerformance por conteúdo.
export function getSubjectPerformance(subjectId) {
  const db = readDb();
  const contents = db.contents.filter((c) => c.subjectId === subjectId);
  const performances = contents.map((c) => getContentPerformance(c.id));
  const withActivity = performances.filter((p) => p.overall !== null);

  const averageOverall =
    withActivity.length > 0
      ? Math.round(withActivity.reduce((sum, p) => sum + p.overall, 0) / withActivity.length)
      : null;

  return {
    contentsCount: contents.length,
    contentsWithActivity: withActivity.length,
    averageOverall,
    mastered: contents.filter((c) => (c.mastery?.level || "not_started") === "mastered").length,
    needsReview: contents.filter((c) => (c.mastery?.level || "not_started") === "needs_review").length,
  };
}

// Contadores reais de conteúdo por domínio — sem dashboard, só os números.
export function getContentMetrics() {
  const db = readDb();
  const breakdown = { not_started: 0, needs_review: 0, developing: 0, mastered: 0 };
  for (const content of db.contents) {
    const level = content.mastery?.level || "not_started";
    if (level in breakdown) breakdown[level] += 1;
  }
  return {
    total: db.contents.length,
    studied: db.contents.length - breakdown.not_started,
    mastered: breakdown.mastered,
    needsReview: breakdown.needs_review,
    notStarted: breakdown.not_started,
  };
}

export function getReviewMetrics() {
  return {
    pending: getPendingReviews().length,
    completed: getCompletedReviews().length,
    overdue: getOverdueReviews().length,
  };
}
