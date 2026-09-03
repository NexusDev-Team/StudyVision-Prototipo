// Repetição espaçada baseada em entidades Review próprias (não mais um campo
// dentro do content). Mesmas offsets do antigo src/services/reviewEngine.js,
// que continua existindo e funcionando para o modelo legado usado pelo
// adaptador de compatibilidade (T7).

import { readDb, withDb } from "../data/storage/index.js";
import { createReview } from "../data/models/review.js";
import { nowIso, addDaysIso, endOfTodayIso, formatDueIso } from "../utils/date.js";

export const REVIEW_OFFSETS = [
  { stage: 1, label: "D+1", days: 1 },
  { stage: 2, label: "D+3", days: 3 },
  { stage: 3, label: "D+7", days: 7 },
  { stage: 4, label: "D+15", days: 15 },
  { stage: 5, label: "D+30", days: 30 },
];

export function scheduleReviewsForContent(contentId, fromIso = nowIso()) {
  const reviews = REVIEW_OFFSETS.map((o) =>
    createReview({
      contentId,
      stage: o.stage,
      scheduledFor: addDaysIso(fromIso, o.days),
      status: "pending",
      reason: "spaced_repetition",
    })
  );
  withDb((db) => ({ ...db, reviews: [...db.reviews, ...reviews] }));
  return reviews;
}

export function getReviewsForContent(contentId) {
  return readDb().reviews.filter((r) => r.contentId === contentId);
}

// Revisão avulsa, fora do ciclo D+1..D+30 — usada quando o usuário agenda
// manualmente um compromisso do tipo "Revisão" (ver services/calendarService.js).
export function scheduleManualReview(contentId, scheduledForIso) {
  const stage = getReviewsForContent(contentId).length + 1;
  const review = createReview({ contentId, stage, scheduledFor: scheduledForIso, status: "pending", reason: "manual" });
  withDb((db) => ({ ...db, reviews: [...db.reviews, review] }));
  return review;
}

export function nextPendingReview(contentId) {
  return getReviewsForContent(contentId)
    .filter((r) => r.status === "pending")
    .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))[0] || null;
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

export function markReviewDone(reviewId) {
  let updated = null;
  withDb((db) => ({
    ...db,
    reviews: db.reviews.map((r) => {
      if (r.id !== reviewId) return r;
      updated = { ...r, status: "completed", completedAt: nowIso() };
      return updated;
    }),
  }));
  return updated;
}

export function skipReview(reviewId) {
  let updated = null;
  withDb((db) => ({
    ...db,
    reviews: db.reviews.map((r) => {
      if (r.id !== reviewId) return r;
      updated = { ...r, status: "skipped" };
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
