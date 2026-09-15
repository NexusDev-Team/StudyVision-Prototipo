// Modo Foco — sessão gerada a partir de um Content já existente, adaptada ao
// tempo disponível (2/5/10 min) e às necessidades declaradas no Modo Inclusão.
// Fábricas puras: nenhum I/O, nenhuma chamada de rede aqui. IDs são SEMPRE
// gerados por esta camada — nunca confiar em um id vindo do Gemini.

import { newId, ID_PREFIX } from "../../utils/id.js";
import { nowIso, toIso } from "../../utils/date.js";
import { FOCUS_STEP_TYPES, LEARNING_PREFERENCE_KEYS } from "../../constants.js";

export const FOCUS_SESSION_STATUSES = ["in_progress", "completed"];

// Um passo da sessão. `type` é presentacional — um tipo fora da lista vira
// "explanation" em vez de invalidar a sessão inteira. Campos que o Gemini
// não deveria mandar (id, duration, audio, o que for) são descartados por
// construção: só lemos as chaves que conhecemos, sem spread do bruto.
export function createFocusStep({ sessionId, order, type, title, content } = {}) {
  return {
    id: newId(ID_PREFIX.focusStep),
    sessionId: sessionId || null,
    order: Number.isInteger(order) ? order : 0,
    type: FOCUS_STEP_TYPES.includes(type) ? type : "explanation",
    title: String(title || "").trim(),
    content: String(content || "").trim(),
  };
}

// Snapshot das 4 necessidades do Modo Inclusão vigentes na geração — sempre
// as 4 chaves booleanas, nunca `null` (diferente de content.learningPreferences,
// que usa null para "conteúdo legado sem Modo Inclusão": aqui não há legado,
// a sessão sempre nasce depois do Modo Inclusão existir). Congelado: mudar as
// preferências depois não reescreve sessões já geradas.
function sanitizeSnapshot(raw) {
  const snapshot = {};
  for (const key of LEARNING_PREFERENCE_KEYS) {
    snapshot[key] = raw && typeof raw === "object" ? raw[key] === true : false;
  }
  return snapshot;
}

// Tempo acumulado (ms) antes da pausa/estado atual em andamento. Nunca
// negativo, nunca NaN — qualquer valor fora disso vira 0 em vez de invalidar
// a sessão inteira (mesma filosofia de `type` inválido virando "explanation").
function normalizeElapsedMs(value) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

export function createFocusSession({
  contentId,
  durationMinutes,
  status,
  steps,
  currentStepIndex,
  inclusionPreferencesSnapshot,
  completedAt,
  timerStartedAt,
  elapsedMs,
  pausedAt,
} = {}) {
  const now = nowIso();
  const id = newId(ID_PREFIX.focusSession);

  // reatribui `sessionId`/`order` para garantir consistência mesmo se o
  // chamador passar steps já criados por createFocusStep noutro contexto.
  const normalizedSteps = Array.isArray(steps)
    ? steps.map((step, index) => createFocusStep({ ...step, sessionId: id, order: index }))
    : [];

  const maxIndex = Math.max(0, normalizedSteps.length - 1);
  const index = Number.isInteger(currentStepIndex) ? currentStepIndex : 0;

  return {
    id,
    contentId: contentId || null,
    durationMinutes: Number(durationMinutes) || 0,
    status: FOCUS_SESSION_STATUSES.includes(status) ? status : "in_progress",
    steps: normalizedSteps,
    currentStepIndex: Math.min(Math.max(index, 0), maxIndex),
    inclusionPreferencesSnapshot: sanitizeSnapshot(inclusionPreferencesSnapshot),
    createdAt: now,
    updatedAt: now,
    completedAt: completedAt || null,
    // Timer não punitivo (Etapa 2): apenas timestamps, nunca um contador
    // regravado a cada segundo. Elapsed real = elapsedMs + (agora - timerStartedAt)
    // enquanto não pausado; ver getFocusElapsedMs em focusSessionService.js.
    timerStartedAt: toIso(timerStartedAt),
    elapsedMs: normalizeElapsedMs(elapsedMs),
    pausedAt: toIso(pausedAt),
  };
}
