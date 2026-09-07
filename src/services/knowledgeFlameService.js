// Chama do Conhecimento (Fase 8, meta personalizada na Fase 9): indicador de
// CONSTÂNCIA SEMANAL, não de streak diário. O estudante define sua própria
// meta semanal (1..7 atividades); o período continua fixo (segunda→domingo).
// Nenhuma atividade nova é persistida aqui — ela é derivada, a cada chamada,
// de quizAttempts, flashcardAttempts e reviews já existentes em sv_db. A
// única coisa que este serviço grava é a preferência de meta e o carimbo da
// meta vigente em cada semana (db.flameGoals), via setPreferredWeeklyTarget.
//
// Regras de contagem (uma atividade válida = uma ação concluída):
// - Quiz: 1 quizAttempt = 1 atividade (respondê-lo gera 1 attempt só).
// - Flashcards: não existe entidade "sessão" no modelo de dados — usamos
//   1 atividade por (contentId, dia) com pelo menos uma flashcardAttempt.
//   Limitação aceita: duas sessões do mesmo conteúdo no mesmo dia contam
//   como 1; conteúdos diferentes no mesmo dia contam separadamente.
// - Revisão: 1 review com status "completed" = 1 atividade.
//
// Histórico imutável: mudar a meta hoje nunca reescreve a meta que valia
// numa semana passada (ver getWeekTarget) — inclusive no cálculo do streak.
//
// Comunicação sempre sem pressão diária: nunca "você perdeu a sequência",
// sempre "uma nova semana começou".

import { readDb, withDb } from "../data/storage/index.js";
import { startOfWeekKey, toDayKey, toMs, currentWeekStartKey, previousWeekKey, weekRangeFromKey } from "../utils/date.js";

export const DEFAULT_WEEKLY_TARGET = 3;
export const MIN_WEEKLY_TARGET = 1;
export const MAX_WEEKLY_TARGET = 7;

function activityWord(n) {
  return n === 1 ? "atividade" : "atividades";
}

function emptyState(weekStartKey) {
  const range = weekRangeFromKey(weekStartKey) || { weekStart: null, weekEnd: null };
  return {
    weekStart: range.weekStart,
    weekEnd: range.weekEnd,
    target: DEFAULT_WEEKLY_TARGET,
    completed: 0,
    displayCompleted: 0,
    extraCompleted: 0,
    remaining: DEFAULT_WEEKLY_TARGET,
    activities: [],
    weekCompleted: false,
    streakWeeks: 0,
    isFirstTime: true,
    preferredWeeklyTarget: DEFAULT_WEEKLY_TARGET,
    message: `Complete ${DEFAULT_WEEKLY_TARGET} atividades de estudo nesta semana para começar sua sequência.`,
    srLabel: `0 de ${DEFAULT_WEEKLY_TARGET} atividades concluídas nesta semana.`,
  };
}

// Valida uma meta candidata: só inteiros entre 1 e 7. Qualquer outra coisa
// (0, negativo, > 7, null, undefined, string não-numérica, fracionário)
// devolve null — quem chama decide não escrever nada nesse caso.
export function normalizeWeeklyTarget(value) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return null;
  if (n < MIN_WEEKLY_TARGET || n > MAX_WEEKLY_TARGET) return null;
  return n;
}

// Meta que o usuário escolheu por último (usada como valor inicial do
// seletor e como meta de toda semana nova a partir de agora).
export function getPreferredWeeklyTarget() {
  const { flameGoals } = readDb();
  return flameGoals.preferredWeeklyTarget;
}

// Meta que vigorava numa semana específica: carimbo exato da semana, senão o
// carimbo mais recente anterior a ela, senão o padrão (3). Nunca recalcula
// uma semana com a preferência atual — isso é o que preserva o histórico.
export function getWeekTarget(weekStartKey) {
  if (!weekStartKey) return DEFAULT_WEEKLY_TARGET;
  const { weekTargets } = readDb().flameGoals;

  if (Object.prototype.hasOwnProperty.call(weekTargets, weekStartKey)) {
    return weekTargets[weekStartKey];
  }

  let bestKey = null;
  for (const key of Object.keys(weekTargets)) {
    if (key < weekStartKey && (bestKey === null || key > bestKey)) bestKey = key;
  }
  return bestKey !== null ? weekTargets[bestKey] : DEFAULT_WEEKLY_TARGET;
}

export function getCurrentWeeklyTarget() {
  return getWeekTarget(currentWeekStartKey());
}

// Atualiza a preferência do usuário e carimba a semana atual com o novo
// valor — as semanas anteriores ao carimbo continuam resolvendo para o que
// vigorava antes (ver getWeekTarget). Retorna o novo getKnowledgeFlameState()
// em caso de sucesso, ou null se o valor for inválido (nada é escrito).
export function setPreferredWeeklyTarget(value) {
  const target = normalizeWeeklyTarget(value);
  if (target === null) return null;

  const weekKey = currentWeekStartKey();
  withDb((db) => ({
    ...db,
    flameGoals: {
      preferredWeeklyTarget: target,
      weekTargets: { ...db.flameGoals.weekTargets, [weekKey]: target },
    },
  }));

  return getKnowledgeFlameState();
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
  const target = getWeekTarget(weekStartKey);
  const completed = activities.length;
  return {
    weekStart: range.weekStart,
    weekEnd: range.weekEnd,
    target,
    completed,
    activities,
    status: completed >= target ? "completed" : "active",
  };
}

export function isWeekCompleted(weekStartKey) {
  return getWeekProgress(weekStartKey).status === "completed";
}

// Conta quantas semanas consecutivas bateram a MEta que vigorava em CADA uma
// delas (não a meta atual) — anda para trás a partir da semana atual (se ela
// já bateu sua própria meta) ou da anterior. Construído sobre um mapa único
// de contagens por semana — sem caminhar data por data indefinidamente: para
// na primeira semana incompleta encontrada, ou quando não há mais atividade
// nenhuma antes dela.
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
  const currentCount = countsByWeek.get(currentKey) || 0;
  let cursor = currentCount >= getWeekTarget(currentKey) ? currentKey : previousWeekKey(currentKey);

  let streak = 0;
  while (cursor && (countsByWeek.get(cursor) || 0) >= getWeekTarget(cursor)) {
    streak += 1;
    cursor = previousWeekKey(cursor);
  }
  return streak;
}

function messageFor({ completed, target, extraCompleted, streakWeeks, hasAnyHistory }) {
  if (completed >= target) {
    if (extraCompleted > 0) return `Meta semanal concluída! ${completed} atividades realizadas.`;
    return "Meta semanal concluída! Sua chama continua acesa.";
  }
  if (completed === 0) {
    if (hasAnyHistory || streakWeeks > 0) {
      return `Uma nova semana começou. Complete ${target} ${activityWord(target)} para acender sua chama.`;
    }
    return `Complete ${target} ${activityWord(target)} de estudo nesta semana para começar sua sequência.`;
  }
  const remaining = target - completed;
  if (remaining === 1) return "Falta 1 atividade para manter sua chama.";
  return `Faltam ${remaining} atividades para manter sua chama.`;
}

// Estado único consumido pela UI (Evolution e Review) — nenhuma regra de
// negócio deve ser recalculada nos componentes, só leitura destes campos.
// displayCompleted é o número a exibir (nunca passa de `target`, mesmo que a
// meta tenha sido reduzida depois de já ter mais atividades); extraCompleted
// é o excedente real, usado só para compor a mensagem.
export function getKnowledgeFlameState() {
  try {
    const weekStartKey = currentWeekStartKey();
    const progress = getWeekProgress(weekStartKey);
    const streakWeeks = getCurrentStreak();
    const hasAnyHistory = getActivities().length > 0;
    const { target, completed } = progress;
    const displayCompleted = Math.min(completed, target);
    const extraCompleted = Math.max(completed - target, 0);
    const isFirstTime = streakWeeks === 0 && completed === 0 && !hasAnyHistory;

    return {
      weekStart: progress.weekStart,
      weekEnd: progress.weekEnd,
      target,
      completed,
      displayCompleted,
      extraCompleted,
      remaining: Math.max(target - completed, 0),
      activities: progress.activities,
      weekCompleted: progress.status === "completed",
      streakWeeks,
      isFirstTime,
      preferredWeeklyTarget: getPreferredWeeklyTarget(),
      message: messageFor({ completed, target, extraCompleted, streakWeeks, hasAnyHistory }),
      srLabel: `${displayCompleted} de ${target} atividades concluídas nesta semana.`,
    };
  } catch {
    return emptyState(currentWeekStartKey());
  }
}
