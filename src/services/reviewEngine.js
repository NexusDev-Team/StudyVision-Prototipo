import { saveItem } from "./storage";

// ─── SPACED REPETITION ────────────────────────────────────────────────────────
export const DAY_MS = 24 * 60 * 60 * 1000;
export const REVIEW_OFFSETS = [
  { stage: 1, label: "D+1", days: 1 },
  { stage: 2, label: "D+3", days: 3 },
  { stage: 3, label: "D+7", days: 7 },
  { stage: 4, label: "D+15", days: 15 },
  { stage: 5, label: "D+30", days: 30 },
];

export function buildReviewSchedule(fromMs) {
  return REVIEW_OFFSETS.map(o => ({
    stage: o.stage,
    label: o.label,
    dueAt: fromMs + o.days * DAY_MS,
    done: false,
  }));
}

export function nextPendingReview(item) {
  return (item.reviewSchedule || []).find(r => !r.done) || null;
}

export function isDueForReview(item) {
  const next = nextPendingReview(item);
  return !!next && next.dueAt <= Date.now();
}

export function completedReviews(item) {
  return (item.reviewSchedule || []).filter(r => r.done).length;
}

export function formatDue(dueAt) {
  const diffDays = Math.round((dueAt - Date.now()) / DAY_MS);
  if (diffDays <= 0) return "Hoje";
  if (diffDays === 1) return "Amanhã";
  return new Date(dueAt).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

// Advances the item's earliest pending review stage to "done" and persists it.
export function markReviewDone(item) {
  const schedule = item.reviewSchedule || [];
  const idx = schedule.findIndex(r => !r.done);
  if (idx === -1) return item;
  const updated = { ...item, reviewSchedule: schedule.map((r, i) => i === idx ? { ...r, done: true } : r) };
  saveItem(updated);
  return updated;
}
