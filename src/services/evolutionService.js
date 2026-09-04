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

import { getContents, getContent } from "./contentService.js";
import { getSubjects } from "./subjectService.js";
import {
  getPerformanceSummary,
  getReviewMetrics,
  getContentPerformance,
  getPerformanceForSubject,
} from "./performanceService.js";
import { masteryLevelFromScore } from "./studyService.js";
import {
  getPendingReviews,
  getCompletedReviews,
  getOverdueReviews,
  getDueReviews,
  reviewReasonLabel,
} from "./reviewService.js";
import { getMasteryMeta } from "../constants.js";
import { readDb } from "../data/storage/index.js";
import { startOfWeekKey, fromDayKey, toMs } from "../utils/date.js";

// Cortes usados para "pontos fortes" e "precisa de reforço" — alinhados aos
// mesmos limites de masteryLevelFromScore (needs_review < 60, mastered >= 80).
export const STRONG_THRESHOLD = 80;
export const WEAK_THRESHOLD = 60;

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

// Desempenho de UM conteúdo, com o nível de domínio já resolvido pela mesma
// régua do studyService (inclusive o mínimo de interações) — nenhum
// threshold de classificação deve ser reimplementado na UI.
export function calculateContentPerformance(contentId) {
  const content = getContent(contentId);
  const perf = getContentPerformance(contentId);
  const masteryLevel = masteryLevelFromScore(perf.overall ?? 0, perf.hasActivity, perf.interactions);

  return {
    contentId,
    title: content?.title ?? "",
    subjectId: content?.subjectId ?? null,
    subjectName: content?.subjectName ?? "",
    questionsAnswered: perf.quiz.questionsAnswered,
    correctAnswers: perf.quiz.questionsCorrect,
    flashcardsReviewed: perf.flashcards.reviewed,
    flashcardsCorrect: perf.flashcards.correct,
    accuracy: perf.overall,
    interactions: perf.interactions,
    masteryLevel,
    masteryLabel: getMasteryMeta(masteryLevel).label,
    hasActivity: perf.hasActivity,
  };
}

// Desempenho da matéria a partir da SOMA de acertos/respostas dos conteúdos
// dela (getPerformanceForSubject) — nunca a média dos percentuais por
// conteúdo, que distorceria contando conteúdo sem atividade como 0.
export function calculateSubjectPerformance(subjectId) {
  const subject = getSubjects().find((s) => s.id === subjectId) || null;
  const contents = getContents().filter((c) => c.subjectId === subjectId);
  const forSubject = getPerformanceForSubject(subjectId);

  const denominator = forSubject.questionsAnswered + forSubject.flashcardsReviewed;
  const accuracy =
    denominator > 0
      ? Math.round(((forSubject.questionsCorrect + forSubject.flashcardsCorrect) / denominator) * 100)
      : null;
  const contentsWithActivity = contents.filter((c) => (c.mastery?.level || "not_started") !== "not_started").length;

  return {
    subjectId,
    name: subject?.name ?? "",
    contentsCount: contents.length,
    contentsWithActivity,
    questionsAnswered: forSubject.questionsAnswered,
    correctAnswers: forSubject.questionsCorrect,
    accuracy,
    mastered: contents.filter((c) => (c.mastery?.level || "not_started") === "mastered").length,
    needsReview: contents.filter((c) => (c.mastery?.level || "not_started") === "needs_review").length,
    hasActivity: contentsWithActivity > 0,
  };
}

// Só matérias com atividade, da mais forte para a mais fraca.
export function getSubjectPerformances() {
  return getSubjects()
    .map((s) => calculateSubjectPerformance(s.id))
    .filter((p) => p.hasActivity)
    .sort((a, b) => (b.accuracy ?? -1) - (a.accuracy ?? -1));
}

// Matérias com atividade e acurácia alta — nunca uma matéria sem nenhum
// conteúdo estudado.
export function getStrongSubjects({ limit = 3 } = {}) {
  return getSubjectPerformances()
    .filter((s) => s.accuracy !== null && s.accuracy >= STRONG_THRESHOLD)
    .slice(0, limit);
}

// Conteúdos com desempenho baixo OU com revisão pendente atrasada — cada um
// carrega `reason` para a UI escolher o texto certo, sem duplicar conteúdo
// que já apareceu por baixo desempenho.
export function getWeakContents({ limit = 5 } = {}) {
  const overdueContentIds = new Set(getOverdueReviews().map((r) => r.contentId));

  const lowAccuracy = getContents()
    .map((c) => calculateContentPerformance(c.id))
    .filter((p) => p.hasActivity && p.accuracy !== null && p.accuracy < WEAK_THRESHOLD)
    .map((p) => ({ ...p, reason: "low_accuracy" }));

  const lowIds = new Set(lowAccuracy.map((p) => p.contentId));
  const overdueOnly = getContents()
    .filter((c) => overdueContentIds.has(c.id) && !lowIds.has(c.id))
    .map((c) => ({ ...calculateContentPerformance(c.id), reason: "overdue_review" }));

  return [...lowAccuracy, ...overdueOnly]
    .sort((a, b) => (a.accuracy ?? Infinity) - (b.accuracy ?? Infinity))
    .slice(0, limit);
}

// Única exceção a "não ler sv_db direto": a agregação temporal precisa
// varrer todas as tentativas por answeredAt, o que nenhum service atual
// expõe agregado. Só semanas com pelo menos uma resposta viram ponto —
// nunca preenchida com zero nem interpolada.
export function getProgressHistory({ weeks = 8 } = {}) {
  const db = readDb();
  const buckets = new Map();

  for (const a of db.quizAttempts) {
    const key = startOfWeekKey(a.answeredAt);
    if (!key) continue;
    const bucket = buckets.get(key) || { answered: 0, correct: 0 };
    bucket.answered += a.totalQuestions;
    bucket.correct += a.correctAnswers;
    buckets.set(key, bucket);
  }
  for (const a of db.flashcardAttempts) {
    const key = startOfWeekKey(a.answeredAt);
    if (!key) continue;
    const bucket = buckets.get(key) || { answered: 0, correct: 0 };
    bucket.answered += 1;
    if (a.correct) bucket.correct += 1;
    buckets.set(key, bucket);
  }

  const sorted = [...buckets.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const limited = sorted.slice(-weeks);

  return limited.map(([weekKey, bucket]) => {
    const weekStart = fromDayKey(weekKey);
    return {
      weekStart,
      label: new Date(toMs(weekStart)).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }),
      answered: bucket.answered,
      correct: bucket.correct,
      accuracy: bucket.answered > 0 ? Math.round((bucket.correct / bucket.answered) * 100) : null,
    };
  });
}

// Diferença em pontos percentuais entre a primeira e a última semana com
// dado dentro da janela — alimenta o insight "+N p.p.". null com menos de
// 2 pontos, nunca inventado.
export function getAccuracyDelta({ weeks = 4 } = {}) {
  const history = getProgressHistory({ weeks });
  if (history.length < 2) return null;
  const from = history[0];
  const to = history[history.length - 1];
  if (from.accuracy === null || to.accuracy === null) return null;
  return { deltaPoints: to.accuracy - from.accuracy, from: from.accuracy, to: to.accuracy };
}

// Revisão é mecanismo de aprendizagem/retenção — nunca vira evento de
// calendário; esta função só agrega o que o reviewService já resolve.
export function getReviewProgress() {
  const pending = getPendingReviews();
  return {
    pending: pending.length,
    completed: getCompletedReviews().length,
    overdue: getOverdueReviews().length,
    dueToday: getDueReviews().length,
    contentsInReview: pending
      .slice()
      .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))
      .map((r) => ({
        contentId: r.contentId,
        title: getContent(r.contentId)?.title ?? "",
        scheduledFor: r.scheduledFor,
        reason: r.reason,
        reasonLabel: reviewReasonLabel(r.reason),
      })),
  };
}

// Recomendações determinísticas: mesma entrada produz sempre a mesma saída,
// zero IA e zero aleatoriedade. Ordem fixa de prioridade — conteúdo mais
// fraco, revisão mais atrasada, evolução recente, matéria mais forte —
// preenchida só até `limit`, pulando regras sem dado suficiente.
export function getRecommendations({ limit = 3 } = {}) {
  const recommendations = [];
  const usedContentIds = new Set();

  const weak = getWeakContents({ limit: 1 })[0];
  if (weak && weak.reason === "low_accuracy") {
    recommendations.push({
      id: `weak_${weak.contentId}`,
      tone: "attention",
      title: "Vale revisar",
      message: `Você teve ${weak.accuracy}% de acerto em "${weak.title}". Esse conteúdo pode precisar de mais uma revisão.`,
      action: { screen: "detail", contentId: weak.contentId },
    });
    usedContentIds.add(weak.contentId);
  }

  const overdue = getOverdueReviews().sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))[0];
  if (overdue && !usedContentIds.has(overdue.contentId)) {
    const content = getContent(overdue.contentId);
    recommendations.push({
      id: `overdue_${overdue.contentId}`,
      tone: "attention",
      title: "Revisão atrasada",
      message: `Sua revisão de "${content?.title ?? "um conteúdo"}" está atrasada. Vale revisar esse conteúdo.`,
      action: { screen: "detail", contentId: overdue.contentId },
    });
    usedContentIds.add(overdue.contentId);
  }

  const delta = getAccuracyDelta();
  if (delta && delta.deltaPoints > 0) {
    recommendations.push({
      id: "delta_positive",
      tone: "positive",
      title: "Você está evoluindo",
      message: `Sua taxa de acerto subiu ${delta.deltaPoints} pontos percentuais nas últimas semanas. Continue assim.`,
      action: null,
    });
  }

  const strong = getStrongSubjects({ limit: 1 })[0];
  if (strong) {
    recommendations.push({
      id: `strong_${strong.subjectId}`,
      tone: "positive",
      title: "Bom desempenho",
      message: `Você teve bom desempenho em ${strong.name} (${strong.accuracy}%). Continue praticando.`,
      action: { screen: "library", subjectId: strong.subjectId },
    });
  }

  return recommendations.slice(0, limit);
}
