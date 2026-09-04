// Camada de evolução: única fonte de métricas de aprendizagem da Fase 5.
// Não lê sv_db diretamente (exceto as agregações temporais desta fase) —
// consome performanceService/reviewService/studyService/contentService/
// subjectService, que já derivam tudo de tentativas reais. Nenhum dado novo
// é persistido aqui; nenhuma taxa vira 0 por falta de dado, sempre null.
//
// Nota sobre as duas funções "por matéria" do performanceService, para não
// confundir qual usar: getPerformanceForSubject soma acertos brutos da
// matéria inteira; getSubjectPerformance faz a média dos `overall` por
// conteúdo. Este serviço usa a agregação por soma (ver calculateSubjectPerformance),
// que é a que não distorce quando um conteúdo não tem atividade.

import { getContents } from "./contentService.js";
import { getPerformanceSummary, getReviewMetrics } from "./performanceService.js";

export function getEvolutionSummary() {
  const summary = getPerformanceSummary();
  const reviewMetrics = getReviewMetrics();
  const contents = getContents();

  const studiedContents = contents.filter((c) => (c.mastery?.level || "not_started") !== "not_started");
  const subjectsStudied = new Set(studiedContents.map((c) => c.subjectId).filter(Boolean)).size;

  const questionsAnswered = summary.questionsAnswered;
  const correctAnswers = summary.questionsCorrect;
  const incorrectAnswers = questionsAnswered - correctAnswers;

  const flashcardsReviewed = summary.flashcardsReviewed;
  const flashcardsCorrect = summary.flashcardsCorrect;

  const overallDenominator = questionsAnswered + flashcardsReviewed;
  const overallAccuracy =
    overallDenominator > 0
      ? Math.round(((correctAnswers + flashcardsCorrect) / overallDenominator) * 100)
      : null;

  return {
    totalContents: summary.contentsCreated,
    contentsStudied: studiedContents.length,
    subjectsStudied,

    questionsAnswered,
    correctAnswers,
    incorrectAnswers,
    quizAccuracy: summary.quizAccuracyRate,

    flashcardsReviewed,
    flashcardsCorrect,
    flashcardAccuracy: summary.flashcardAccuracyRate,

    overallAccuracy,

    masteredContents: summary.masteryBreakdown.mastered,
    developingContents: summary.masteryBreakdown.developing,
    needsReviewContents: summary.masteryBreakdown.needs_review,
    notStartedContents: summary.masteryBreakdown.not_started,

    reviewsCompleted: reviewMetrics.completed,
    reviewsPending: reviewMetrics.pending,
    reviewsOverdue: reviewMetrics.overdue,

    hasActivity: summary.hasActivity,
  };
}
