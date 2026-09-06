// Chama do Conhecimento (Fase 8): indicador de CONSTÂNCIA SEMANAL, não de
// streak diário. Meta: 3 atividades de estudo concluídas por semana
// (segunda→domingo). Nenhum dado novo é persistido aqui — tudo é derivado,
// a cada chamada, de quizAttempts, flashcardAttempts e reviews já existentes
// em sv_db. Isso garante que o estado nunca fica inconsistente e que um
// reload sempre reconstrói o mesmo resultado.
//
// Regras de contagem (uma atividade válida = uma ação concluída):
// - Quiz: 1 quizAttempt = 1 atividade (respondê-lo gera 1 attempt só).
// - Flashcards: não existe entidade "sessão" no modelo de dados — usamos
//   1 atividade por (contentId, dia) com pelo menos uma flashcardAttempt.
//   Limitação aceita: duas sessões do mesmo conteúdo no mesmo dia contam
//   como 1; conteúdos diferentes no mesmo dia contam separadamente.
// - Revisão: 1 review com status "completed" = 1 atividade.
//
// Comunicação sempre sem pressão diária: nunca "você perdeu a sequência",
// sempre "uma nova semana começou".

import { readDb } from "../data/storage/index.js";
import { startOfWeekKey, toDayKey, toMs, currentWeekStartKey, previousWeekKey, weekRangeFromKey } from "../utils/date.js";

export const WEEKLY_TARGET = 3;

function emptyState(weekStartKey) {
  const range = weekRangeFromKey(weekStartKey) || { weekStart: null, weekEnd: null };
  return {
    weekStart: range.weekStart,
    weekEnd: range.weekEnd,
    target: WEEKLY_TARGET,
    completed: 0,
    remaining: WEEKLY_TARGET,
    activities: [],
    weekCompleted: false,
    streakWeeks: 0,
    isFirstTime: true,
    message: "Complete 3 atividades de estudo nesta semana para começar sua sequência.",
    srLabel: "0 de 3 atividades concluídas nesta semana.",
  };
}

// Lista normalizada e deduplicada de todas as atividades válidas do
// histórico (não só da semana atual) — base para semana atual e streak.
export function getActivities() {
  const db = readDb();
  const seen = new Set();
  const activities = [];

  for (const attempt of db.quizAttempts || []) {
    const at = attempt?.answeredAt;
    if (toMs(at) === null) continue;
    const key = `quiz:${attempt.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    activities.push({ key, type: "quiz", contentId: attempt.contentId || null, at });
  }

  const flashcardDays = new Map(); // "contentId:dayKey" -> primeiro answeredAt
  for (const attempt of db.flashcardAttempts || []) {
    const at = attempt?.answeredAt;
    if (toMs(at) === null) continue;
    const dayKey = toDayKey(at);
    if (!dayKey) continue;
    const groupKey = `${attempt.contentId || "none"}:${dayKey}`;
    const existing = flashcardDays.get(groupKey);
    if (!existing || toMs(at) < toMs(existing.at)) {
      flashcardDays.set(groupKey, { contentId: attempt.contentId || null, at });
    }
  }
  for (const [groupKey, entry] of flashcardDays) {
    const key = `flashcards:${groupKey}`;
    if (seen.has(key)) continue;
    seen.add(key);
    activities.push({ key, type: "flashcards", contentId: entry.contentId, at: entry.at });
  }

  for (const review of db.reviews || []) {
    if (review?.status !== "completed") continue;
    const at = review.completedAt;
    if (toMs(at) === null) continue;
    const key = `review:${review.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    activities.push({ key, type: "review", contentId: review.contentId || null, at });
  }

  activities.sort((a, b) => toMs(a.at) - toMs(b.at));
  return activities;
}

export function getWeekActivities(weekStartKey) {
  if (!weekStartKey) return [];
  return getActivities().filter((activity) => startOfWeekKey(activity.at) === weekStartKey);
}

export function getWeekProgress(weekStartKey) {
  const activities = getWeekActivities(weekStartKey);
  const range = weekRangeFromKey(weekStartKey) || { weekStart: null, weekEnd: null };
  const completed = activities.length;
  return {
    weekStart: range.weekStart,
    weekEnd: range.weekEnd,
    target: WEEKLY_TARGET,
    completed,
    activities,
    status: completed >= WEEKLY_TARGET ? "completed" : "active",
  };
}

export function isWeekCompleted(weekStartKey) {
  return getWeekProgress(weekStartKey).status === "completed";
}

// Conta quantas semanas consecutivas terminaram completas, andando para trás
// a partir da semana atual (se a atual já bateu a meta) ou da anterior (se
// ainda não bateu). Construído sobre um mapa único de contagens por semana —
// sem caminhar data por data indefinidamente: para na primeira semana
// incompleta encontrada, ou quando não há mais atividade nenhuma antes dela.
export function getCurrentStreak() {
  const activities = getActivities();
  if (activities.length === 0) return 0;

  const countsByWeek = new Map();
  for (const activity of activities) {
    const weekKey = startOfWeekKey(activity.at);
    if (!weekKey) continue;
    countsByWeek.set(weekKey, (countsByWeek.get(weekKey) || 0) + 1);
  }

  const currentKey = currentWeekStartKey();
  let cursor = (countsByWeek.get(currentKey) || 0) >= WEEKLY_TARGET ? currentKey : previousWeekKey(currentKey);

  let streak = 0;
  while (cursor && (countsByWeek.get(cursor) || 0) >= WEEKLY_TARGET) {
    streak += 1;
    cursor = previousWeekKey(cursor);
  }
  return streak;
}

function messageFor(completed, streakWeeks, hasAnyHistory) {
  if (completed >= WEEKLY_TARGET) return "Meta semanal concluída! Sua chama continua acesa.";
  if (completed === 2) return "Falta pouco para manter sua chama.";
  if (completed === 1) return "Continue seu ritmo.";
  if (hasAnyHistory || streakWeeks > 0) return "Uma nova semana começou. Complete 3 atividades para acender sua chama.";
  return "Complete 3 atividades de estudo nesta semana para começar sua sequência.";
}

// Estado único consumido pela UI (Evolution e Review) — nenhuma regra de
// negócio deve ser recalculada nos componentes, só leitura destes campos.
export function getKnowledgeFlameState() {
  try {
    const weekStartKey = currentWeekStartKey();
    const progress = getWeekProgress(weekStartKey);
    const streakWeeks = getCurrentStreak();
    const hasAnyHistory = getActivities().length > 0;
    const completed = progress.completed;
    const isFirstTime = streakWeeks === 0 && completed === 0 && !hasAnyHistory;

    return {
      weekStart: progress.weekStart,
      weekEnd: progress.weekEnd,
      target: WEEKLY_TARGET,
      completed,
      remaining: Math.max(WEEKLY_TARGET - completed, 0),
      activities: progress.activities,
      weekCompleted: progress.status === "completed",
      streakWeeks,
      isFirstTime,
      message: messageFor(completed, streakWeeks, hasAnyHistory),
      srLabel: `${Math.min(completed, WEEKLY_TARGET)} de ${WEEKLY_TARGET} atividades concluídas nesta semana.`,
    };
  } catch {
    return emptyState(currentWeekStartKey());
  }
}
