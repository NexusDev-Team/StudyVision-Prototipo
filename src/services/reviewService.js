// Repetição espaçada orientada a desempenho real: no máximo UMA revisão
// pendente por conteúdo. Cada atividade (quiz ou flashcards) recalcula o
// desempenho e reagenda essa pendente única — nunca cria uma segunda.
//
// Ordem crítica usada pelas telas de estudo (ver studyService.registerActivity
// e FlashcardsScreen/QuizScreen): a tela registra as tentativas da sessão
// (o que reagenda a pendente ATUAL para uma nova data, via
// scheduleReviewFromPerformance) e só DEPOIS, se estiver em modo revisão,
// chama markReviewDone sobre essa mesma pendente já reagendada. markReviewDone
// então chama ensureNextReview para o conteúdo nunca ficar sem próxima revisão.

import { readDb, withDb } from "../data/storage/index.js";
import { createReview } from "../data/models/review.js";
import { nowIso, addDaysIso, endOfTodayIso, formatDueIso, toMs } from "../utils/date.js";

// dias e motivo agendados a partir do desempenho (0-100) do conteúdo.
export const REVIEW_INTERVALS = [
  { max: 60, days: 1, reason: "low_performance" },
  { max: 80, days: 3, reason: "reinforcement" },
  { max: 90, days: 7, reason: "consolidation" },
  { max: Infinity, days: 14, reason: "long_term" },
];

// Rótulo exibido na UI para cada motivo de revisão — substitui o antigo rótulo
// por stage fixo (D+1..D+30), que não refletia mais o agendamento real.
export const REVIEW_REASON_META = {
  first_study: { label: "Primeiro estudo" },
  low_performance: { label: "Reforço urgente" },
  reinforcement: { label: "Reforço" },
  consolidation: { label: "Consolidação" },
  long_term: { label: "Longo prazo" },
  manual: { label: "Agendada" },
};

export function reviewReasonLabel(reason) {
  return REVIEW_REASON_META[reason]?.label || "Revisão";
}

// performance: número 0-100, ou null/undefined quando ainda não há dados.
export function resolveReviewInterval(performance) {
  if (performance === null || performance === undefined) return { days: 1, reason: "first_study" };
  const bucket = REVIEW_INTERVALS.find((b) => performance < b.max);
  return { days: bucket.days, reason: bucket.reason };
}

// Cria a revisão inicial (D+1) ao salvar um conteúdo novo — antes de qualquer
// atividade, não há desempenho para basear o intervalo.
export function scheduleInitialReview(contentId, fromIso = nowIso()) {
  const review = createReview({
    contentId,
    stage: 1,
    scheduledFor: addDaysIso(fromIso, 1),
    status: "pending",
    reason: "first_study",
  });
  withDb((db) => ({ ...db, reviews: [...db.reviews, review] }));
  return review;
}

export function getReviewsForContent(contentId) {
  return readDb().reviews.filter((r) => r.contentId === contentId);
}

function pendingReviewsFor(contentId) {
  return getReviewsForContent(contentId).filter((r) => r.status === "pending");
}

// Revisão avulsa, fora do cálculo automático — usada quando o usuário agenda
// manualmente um compromisso do tipo "Revisão" (ver services/calendarService.js).
// reason: "manual" nunca é sobrescrito por scheduleReviewFromPerformance.
export function scheduleManualReview(contentId, scheduledForIso) {
  const stage = getReviewsForContent(contentId).length + 1;
  const review = createReview({ contentId, stage, scheduledFor: scheduledForIso, status: "pending", reason: "manual" });
  withDb((db) => ({ ...db, reviews: [...db.reviews, review] }));
  return review;
}

// Garante no máximo UMA revisão pendente por conteúdo, reagendada pelo
// desempenho real. Uma pendente "manual" nunca é alterada automaticamente.
export function scheduleReviewFromPerformance(contentId, performance) {
  const pending = pendingReviewsFor(contentId);
  const manual = pending.find((r) => r.reason === "manual");
  if (manual) return manual;

  const { days, reason } = resolveReviewInterval(performance);
  const scheduledFor = addDaysIso(nowIso(), days);
  const now = nowIso();

  const existing = pending[0];
  if (existing) {
    let updated = null;
    withDb((db) => ({
      ...db,
      reviews: db.reviews.map((r) => {
        if (r.id !== existing.id) return r;
        updated = { ...r, scheduledFor, reason, updatedAt: now };
        return updated;
      }),
    }));
    return updated;
  }

  const completedCount = getReviewsForContent(contentId).filter((r) => r.status !== "pending").length;
  const review = createReview({ contentId, stage: completedCount + 1, scheduledFor, status: "pending", reason });
  withDb((db) => ({ ...db, reviews: [...db.reviews, review] }));
  return review;
}

// Cria a próxima pendente apenas se o conteúdo estiver sem nenhuma — usado
// após concluir uma revisão para o conteúdo nunca ficar "sem próxima".
export function ensureNextReview(contentId, performance = null) {
  if (pendingReviewsFor(contentId).length > 0) return null;
  return scheduleReviewFromPerformance(contentId, performance);
}

export function nextPendingReview(contentId) {
  return pendingReviewsFor(contentId).sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))[0] || null;
}

export function isContentDueForReview(contentId) {
  const next = nextPendingReview(contentId);
  return !!next && new Date(next.scheduledFor).getTime() <= new Date(endOfTodayIso()).getTime();
}

export function getDueReviews() {
  const endOfToday = new Date(endOfTodayIso()).getTime();
  return readDb().reviews.filter(
    (r) => r.status === "pending" && new Date(r.scheduledFor).getTime() <= endOfToday
  );
}

export function getPendingReviews() {
  return readDb().reviews.filter((r) => r.status === "pending");
}

export function getCompletedReviews() {
  return readDb().reviews.filter((r) => r.status === "completed");
}

export function getOverdueReviews() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startMs = startOfToday.getTime();
  return readDb().reviews.filter((r) => r.status === "pending" && (toMs(r.scheduledFor) ?? Infinity) < startMs);
}

export function markReviewDone(reviewId) {
  let updated = null;
  withDb((db) => ({
    ...db,
    reviews: db.reviews.map((r) => {
      if (r.id !== reviewId) return r;
      updated = { ...r, status: "completed", completedAt: nowIso(), updatedAt: nowIso() };
      return updated;
    }),
  }));
  if (updated) ensureNextReview(updated.contentId);
  return updated;
}

export function skipReview(reviewId) {
  let updated = null;
  withDb((db) => ({
    ...db,
    reviews: db.reviews.map((r) => {
      if (r.id !== reviewId) return r;
      updated = { ...r, status: "skipped", skippedAt: nowIso(), updatedAt: nowIso() };
      return updated;
    }),
  }));
  return updated;
}

export { formatDueIso as formatDue };

// Fisher–Yates — mesma implementação do reviewEngine legado.
export function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
