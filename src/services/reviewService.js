// Revisões atreladas a uma intenção — nunca repetição espaçada infinita.
// Toda revisão pendente tem um `kind`:
//
//   plan       — cadência escolhida no conteúdo (content.reviewPlan):
//                semanal / quinzenal / mensal. Exatamente UMA pendente por
//                conteúdo, sempre em dia útil, com a carga distribuída para
//                nenhum dia ficar lotado.
//   commitment — contagem regressiva rumo a um evento acadêmico futuro
//                (Prova/Trabalho/Entrega): marcos em D-7, D-3, D-1. Pode
//                cair em fim de semana (segue o compromisso). O desempenho
//                recente só ANTECIPA, nunca posterga.
//   manual     — evento do tipo "Revisão" agendado pelo usuário.
//
// Este serviço lê eventos só via readDb() — nunca importa eventService, para
// não criar ciclo. É o eventService que chama syncCommitmentReviews aqui.

import { readDb, withDb } from "../data/storage/index.js";
import { createReview } from "../data/models/review.js";
import {
  nowIso,
  addDaysIso,
  endOfTodayIso,
  startOfTodayIso,
  formatDueIso,
  toMs,
  toDayKey,
  fromDayKey,
  todayKey,
  nextWeekdayIso,
} from "../utils/date.js";

// Teto de revisões pendentes por dia (somando todos os conteúdos) antes de
// empurrar uma revisão de plano para o próximo dia útil.
export const REVIEW_DAY_CAP = 3;

const PLAN_INTERVAL_DAYS = { weekly: 7, biweekly: 15, monthly: 30 };
export function reviewPlanIntervalDays(plan) {
  return PLAN_INTERVAL_DAYS[plan] ?? null;
}

// Eventos acadêmicos que geram revisão de compromisso (Aula/Outro não geram).
const COMMITMENT_EVENT_TYPES = new Set(["exam", "assignment", "deadline"]);
const COMMITMENT_OFFSETS = [7, 3, 1]; // D-7, D-3, D-1

// Intervalo em dias a partir do desempenho real (0-100). Usado só para
// antecipar a revisão de compromisso mais próxima. Mantém os mesmos cortes
// de masteryLevelFromScore.
export const REVIEW_INTERVALS = [
  { max: 60, days: 1, reason: "low_performance" },
  { max: 80, days: 3, reason: "reinforcement" },
  { max: 90, days: 7, reason: "consolidation" },
  { max: Infinity, days: 14, reason: "long_term" },
];

export function resolveReviewInterval(performance) {
  if (performance === null || performance === undefined) return { days: 1, reason: "first_study" };
  const bucket = REVIEW_INTERVALS.find((b) => performance < b.max);
  return { days: bucket.days, reason: bucket.reason };
}

// ─── rótulos ────────────────────────────────────────────────────────────────

export const REVIEW_REASON_META = {
  plan: { label: "Revisão programada" },
  commitment: { label: "Revisão de compromisso" },
  manual: { label: "Agendada" },
};

const COMMITMENT_LABEL = {
  exam: "Revisão para prova",
  assignment: "Revisão para trabalho",
  deadline: "Revisão para entrega",
};

// Rótulo de uma revisão para a UI. "Atrasada" tem prioridade sobre o tipo.
export function reviewLabel(review) {
  if (!review) return "Revisão";
  if (review.overdue) return "Atrasada";
  if (review.kind === "commitment") {
    const event = review.eventId ? readDb().events.find((e) => e.id === review.eventId) : null;
    return COMMITMENT_LABEL[event?.type] || REVIEW_REASON_META.commitment.label;
  }
  return REVIEW_REASON_META[review.kind]?.label || "Revisão";
}

// Alias fino para quem ainda passa review.reason (ReviewCard antigo etc).
export function reviewReasonLabel(reason) {
  return REVIEW_REASON_META[reason]?.label || "Revisão";
}

// ─── leituras ───────────────────────────────────────────────────────────────

export function getReviewsForContent(contentId) {
  return readDb().reviews.filter((r) => r.contentId === contentId);
}

function pendingFor(contentId, kind) {
  return getReviewsForContent(contentId).filter(
    (r) => r.status === "pending" && (!kind || r.kind === kind)
  );
}

export function getPendingReviews() {
  return readDb().reviews.filter((r) => r.status === "pending");
}

export function getCompletedReviews() {
  return readDb().reviews.filter((r) => r.status === "completed");
}

export function getDueReviews() {
  const end = toMs(endOfTodayIso());
  return getPendingReviews().filter((r) => (toMs(r.scheduledFor) ?? Infinity) <= end);
}

export function getOverdueReviews() {
  const start = toMs(startOfTodayIso());
  return getPendingReviews().filter(
    (r) => r.overdue === true || (toMs(r.scheduledFor) ?? Infinity) < start
  );
}

export function nextPendingReview(contentId) {
  return pendingFor(contentId).sort((a, b) => toMs(a.scheduledFor) - toMs(b.scheduledFor))[0] || null;
}

export function isContentDueForReview(contentId) {
  const next = nextPendingReview(contentId);
  return !!next && (toMs(next.scheduledFor) ?? Infinity) <= toMs(endOfTodayIso());
}

// ─── revisão de plano ───────────────────────────────────────────────────────

// Revisões pendentes agendadas para o mesmo dia-chave, somando todos os
// conteúdos — base da distribuição de carga.
function pendingCountOnDay(dayKey, ignoreId) {
  return getPendingReviews().filter(
    (r) => r.id !== ignoreId && toDayKey(r.scheduledFor) === dayKey
  ).length;
}

// A partir de um ISO qualquer: normaliza para dia útil e, se o dia já tem
// REVIEW_DAY_CAP ou mais revisões pendentes, empurra para o próximo dia útil
// com espaço (até 10 saltos; se todos cheios, fica no último).
function balancedWeekday(iso, ignoreId) {
  let cur = nextWeekdayIso(iso);
  for (let i = 0; i < 10; i++) {
    if (pendingCountOnDay(toDayKey(cur), ignoreId) < REVIEW_DAY_CAP) return cur;
    cur = nextWeekdayIso(addDaysIso(cur, 1));
  }
  return cur;
}

// Garante o estado correto das revisões de plano de UM conteúdo:
// - reviewPlan "none": remove as pendentes de plano;
// - senão: mantém (ou, com reschedule, reagenda) a pendente existente, ou
//   cria uma no próximo intervalo, em dia útil e com carga distribuída.
// `reschedule: true` é usado quando o usuário troca a cadência — a revisão de
// plano pendente pula para o novo período. No boot / ao concluir uma revisão
// fica false, para não empurrar uma revisão já agendada.
export function applyReviewPlan(contentId, fromIso = nowIso(), { reschedule = false } = {}) {
  const content = readDb().contents.find((c) => c.id === contentId);
  const intervalDays = reviewPlanIntervalDays(content?.reviewPlan || "none");

  if (!intervalDays) {
    const remove = new Set(pendingFor(contentId, "plan").map((r) => r.id));
    if (remove.size) withDb((db) => ({ ...db, reviews: db.reviews.filter((r) => !remove.has(r.id)) }));
    return null;
  }

  const existing = pendingFor(contentId, "plan")[0];
  if (existing && !reschedule) return existing;

  if (existing && reschedule) {
    const scheduledFor = balancedWeekday(addDaysIso(fromIso, intervalDays), existing.id);
    let updated = null;
    withDb((db) => ({
      ...db,
      reviews: db.reviews.map((r) => {
        if (r.id !== existing.id) return r;
        updated = { ...r, scheduledFor, overdue: false, updatedAt: nowIso() };
        return updated;
      }),
    }));
    return updated;
  }

  const scheduledFor = balancedWeekday(addDaysIso(fromIso, intervalDays));
  const completed = getReviewsForContent(contentId).filter((r) => r.status !== "pending").length;
  const review = createReview({
    contentId,
    kind: "plan",
    reason: "plan",
    stage: completed + 1,
    scheduledFor,
    status: "pending",
  });
  withDb((db) => ({ ...db, reviews: [...db.reviews, review] }));
  return review;
}

// ─── revisão de compromisso ─────────────────────────────────────────────────

// Eventos elegíveis (tipo certo, com data hoje ou no futuro) ligados ao
// conteúdo, do mais próximo ao mais distante.
function futureCommitmentEvents(contentId) {
  const startKey = todayKey();
  return readDb()
    .events.filter(
      (e) =>
        e.contentIds.includes(contentId) &&
        COMMITMENT_EVENT_TYPES.has(e.type) &&
        e.date &&
        e.date >= startKey
    )
    .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

// Dias-chave da série regressiva rumo a `eventDate` ("YYYY-MM-DD"):
// D-7/D-3/D-1 que ainda não passaram e não ultrapassam o evento. Se o evento
// é hoje/amanhã e nenhum marco sobra, usa hoje.
function commitmentCheckpointDays(eventDate) {
  const eventMs = toMs(fromDayKey(eventDate));
  const todayMs = toMs(startOfTodayIso());
  const days = [];
  for (const off of COMMITMENT_OFFSETS) {
    const iso = addDaysIso(fromDayKey(eventDate), -off);
    if (toMs(iso) >= todayMs && toMs(iso) <= eventMs) days.push(toDayKey(iso));
  }
  if (days.length === 0) days.push(todayKey());
  return [...new Set(days)];
}

// Reconcilia as revisões de compromisso pendentes de UM conteúdo com o evento
// futuro mais próximo. Sem evento elegível: remove todas as pendentes de
// compromisso (o histórico concluído fica).
export function syncCommitmentReviews(contentId) {
  const events = futureCommitmentEvents(contentId);
  const pending = pendingFor(contentId, "commitment");

  if (events.length === 0) {
    if (pending.length) {
      const ids = new Set(pending.map((r) => r.id));
      withDb((db) => ({ ...db, reviews: db.reviews.filter((r) => !ids.has(r.id)) }));
    }
    return [];
  }

  const target = events[0];
  const wantDays = commitmentCheckpointDays(target.date);
  const wantSet = new Set(wantDays);

  const staleIds = new Set(
    pending
      .filter((r) => r.eventId !== target.id || !wantSet.has(toDayKey(r.scheduledFor)))
      .map((r) => r.id)
  );
  const haveDays = new Set(
    pending
      .filter((r) => r.eventId === target.id && !staleIds.has(r.id))
      .map((r) => toDayKey(r.scheduledFor))
  );

  const additions = wantDays
    .filter((d) => !haveDays.has(d))
    .map((d, i) =>
      createReview({
        contentId,
        kind: "commitment",
        reason: "commitment",
        eventId: target.id,
        stage: i + 1,
        scheduledFor: fromDayKey(d),
        status: "pending",
      })
    );

  if (staleIds.size || additions.length) {
    withDb((db) => ({
      ...db,
      reviews: [...db.reviews.filter((r) => !staleIds.has(r.id)), ...additions],
    }));
  }
  return pendingFor(contentId, "commitment");
}

// ─── desempenho: só antecipa a revisão de compromisso ──────────────────────

// Chamada pelas telas de estudo após uma sessão. Se o desempenho recente
// pede reforço (intervalo curto), antecipa a revisão de compromisso pendente
// mais próxima — nunca posterga, nunca cria revisão, nunca toca no plano.
export function advanceReviewsAfterActivity(contentId, performance) {
  const next = pendingFor(contentId, "commitment").sort(
    (a, b) => toMs(a.scheduledFor) - toMs(b.scheduledFor)
  )[0];
  if (!next) return null;

  const { days } = resolveReviewInterval(performance);
  const candidate = Math.max(
    toMs(addDaysIso(nowIso(), days)),
    toMs(addDaysIso(startOfTodayIso(), 1))
  );
  if (candidate >= toMs(next.scheduledFor)) return next;

  let updated = null;
  withDb((db) => ({
    ...db,
    reviews: db.reviews.map((r) => {
      if (r.id !== next.id) return r;
      updated = { ...r, scheduledFor: new Date(candidate).toISOString(), updatedAt: nowIso() };
      return updated;
    }),
  }));
  return updated;
}

// ─── revisão manual (evento tipo "Revisão") ────────────────────────────────

export function scheduleManualReview(contentId, scheduledForIso) {
  const stage = getReviewsForContent(contentId).length + 1;
  const review = createReview({
    contentId,
    stage,
    scheduledFor: scheduledForIso,
    status: "pending",
    kind: "manual",
    reason: "manual",
  });
  withDb((db) => ({ ...db, reviews: [...db.reviews, review] }));
  return review;
}

// ─── concluir / pular ──────────────────────────────────────────────────────

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
  if (updated?.kind === "plan") applyReviewPlan(updated.contentId, updated.completedAt);
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
  if (updated?.kind === "plan") applyReviewPlan(updated.contentId, updated.skippedAt);
  return updated;
}

// ─── boot: reconcilia tudo ─────────────────────────────────────────────────

// Roda uma vez ao abrir o app (ContentStoreContext), depois de sweepOrphans.
// Idempotente. Limpa o backlog de revisões sem intenção, garante plano e
// série de compromisso, e rola atrasadas para hoje marcando `overdue`.
export function reconcileReviews() {
  // 1. conteúdo legado sem reviewPlan → "none"
  if (readDb().contents.some((c) => c.reviewPlan == null)) {
    withDb((db) => ({
      ...db,
      contents: db.contents.map((c) => (c.reviewPlan == null ? { ...c, reviewPlan: "none" } : c)),
    }));
  }

  const contents = readDb().contents;
  const contentIds = new Set(contents.map((c) => c.id));
  const planById = new Map(contents.map((c) => [c.id, c.reviewPlan || "none"]));
  const targetEventByContent = new Map();
  for (const c of contents) {
    const evs = futureCommitmentEvents(c.id);
    if (evs.length) targetEventByContent.set(c.id, evs[0].id);
  }

  // 2. remove pendentes sem intenção válida
  withDb((db) => ({
    ...db,
    reviews: db.reviews.filter((r) => {
      if (r.status !== "pending") return true;
      if (!contentIds.has(r.contentId)) return false;
      if (r.kind === "manual" || r.reason === "manual") return true;
      if (r.kind === "plan") return (planById.get(r.contentId) || "none") !== "none";
      if (r.kind === "commitment") return targetEventByContent.get(r.contentId) === r.eventId;
      return false; // kind ausente / motivo antigo (spaced_repetition, first_study, ...)
    }),
  }));

  // 3 + 4. garante plano e série de compromisso por conteúdo
  for (const c of readDb().contents) {
    applyReviewPlan(c.id);
    syncCommitmentReviews(c.id);
  }

  // 5. rola atrasadas para hoje, marcando overdue
  const startMs = toMs(startOfTodayIso());
  const todayNoon = fromDayKey(todayKey());
  withDb((db) => ({
    ...db,
    reviews: db.reviews.map((r) => {
      if (r.status !== "pending") return r;
      if ((toMs(r.scheduledFor) ?? Infinity) >= startMs) return r;
      const rolled = r.kind === "plan" ? nextWeekdayIso(todayNoon) : todayNoon;
      return { ...r, scheduledFor: rolled, overdue: true, updatedAt: nowIso() };
    }),
  }));
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
