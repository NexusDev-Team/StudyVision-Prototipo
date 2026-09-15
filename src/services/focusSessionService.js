// Persistência de sessões do Modo Foco — só isso. Nenhum fetch, nenhuma
// chamada ao Gemini aqui: quem orquestra rede e normalização é
// focusModeService.js. Este serviço só lê/grava sv_db.focusSessions.

import { readDb, withDb } from "../data/storage/index.js";
import { nowIso } from "../utils/date.js";

// Teto de sessões guardadas por content. writeDb() só poda `contents` na
// cota do localStorage — sem teto próprio, focusSessions cresceria sem
// limite e nunca seria sacrificado nem beneficiado pela poda existente.
// Ao estourar, descarta a mais antiga já concluída primeiro; se não houver
// concluída para descartar, cai para a mais antiga qualquer.
export const MAX_SESSIONS_PER_CONTENT = 3;

export function getFocusSessions() {
  return readDb().focusSessions;
}

export function getFocusSession(sessionId) {
  return readDb().focusSessions.find((s) => s.id === sessionId) || null;
}

export function getFocusSessionsForContent(contentId) {
  return readDb().focusSessions.filter((s) => s.contentId === contentId);
}

// A sessão em andamento mais recente para o content, ou null. Retomar usa
// isto para decidir "gerar de novo" vs "continuar a que já existe" — NUNCA
// chama Gemini.
export function getActiveFocusSession(contentId) {
  const active = readDb()
    .focusSessions.filter((s) => s.contentId === contentId && s.status === "in_progress")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  return active[0] || null;
}

function pruneForContent(sessions, contentId) {
  const forContent = sessions.filter((s) => s.contentId === contentId);
  if (forContent.length <= MAX_SESSIONS_PER_CONTENT) return sessions;

  const byAge = [...forContent].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const excess = forContent.length - MAX_SESSIONS_PER_CONTENT;
  const completedFirst = [...byAge].sort((a, b) => {
    if (a.status === b.status) return 0;
    return a.status === "completed" ? -1 : 1;
  });
  const toDrop = new Set(completedFirst.slice(0, excess).map((s) => s.id));

  return sessions.filter((s) => !toDrop.has(s.id));
}

export function persistFocusSession(session) {
  const { result } = withDb((db) => ({
    ...db,
    focusSessions: pruneForContent([...db.focusSessions, session], session.contentId),
  }));
  return { session, result };
}

function updateSession(sessionId, updater) {
  let updated = null;
  withDb((db) => ({
    ...db,
    focusSessions: db.focusSessions.map((s) => {
      if (s.id !== sessionId) return s;
      updated = updater(s);
      return updated;
    }),
  }));
  return updated;
}

export function setFocusStepIndex(sessionId, index) {
  return updateSession(sessionId, (s) => {
    const maxIndex = Math.max(0, s.steps.length - 1);
    const clamped = Math.min(Math.max(Number(index) || 0, 0), maxIndex);
    return { ...s, currentStepIndex: clamped, updatedAt: nowIso() };
  });
}

export function advanceFocusStep(sessionId) {
  return updateSession(sessionId, (s) => {
    const maxIndex = Math.max(0, s.steps.length - 1);
    const next = Math.min(s.currentStepIndex + 1, maxIndex);
    return { ...s, currentStepIndex: next, updatedAt: nowIso() };
  });
}

export function completeFocusSession(sessionId) {
  const now = nowIso();
  return updateSession(sessionId, (s) => ({
    ...s,
    status: "completed",
    completedAt: now,
    updatedAt: now,
    // congela o tempo decorrido — depois de completed, getFocusElapsedMs não
    // deve mais avançar mesmo se algo chamar com um `now` no futuro.
    elapsedMs: getFocusElapsedMs(s, Date.now()),
    pausedAt: now,
  }));
}

// ─── Timer (Etapa 2) ──────────────────────────────────────────────────────
// Só timestamps são persistidos — nunca um contador regravado a cada
// segundo. O tempo decorrido é sempre DERIVADO por getFocusElapsedMs, tanto
// no cliente (a cada tick do relógio) quanto aqui.

// Tempo decorrido real, em ms, no instante `now`. Pura — não lê nem grava
// storage. Sessão nunca iniciada (timerStartedAt null) ou pausada devolve o
// acumulado congelado em elapsedMs.
export function getFocusElapsedMs(session, now = Date.now()) {
  const elapsedMs = Number.isInteger(session?.elapsedMs) ? session.elapsedMs : 0;
  if (!session?.timerStartedAt || session?.pausedAt) return elapsedMs;
  const startedMs = new Date(session.timerStartedAt).getTime();
  if (Number.isNaN(startedMs)) return elapsedMs;
  return elapsedMs + Math.max(0, now - startedMs);
}

// Marca o início da contagem se ainda não tiver começado. Chamar de novo
// numa sessão já iniciada é um no-op — não reinicia o relógio ao reabrir a
// tela (reload/retomada usam isto sem risco de "zerar" o tempo já passado).
export function startFocusTimer(sessionId) {
  return updateSession(sessionId, (s) => {
    if (s.timerStartedAt) return s;
    return { ...s, timerStartedAt: nowIso(), pausedAt: null, updatedAt: nowIso() };
  });
}

// Acumula o tempo corrido desde o último início/retomada em elapsedMs e
// registra pausedAt. Pausar uma sessão já pausada é um no-op — evita
// duplicar o acumulado em cliques repetidos no botão de pausa.
export function pauseFocusTimer(sessionId) {
  return updateSession(sessionId, (s) => {
    if (s.pausedAt || !s.timerStartedAt) return s;
    const now = nowIso();
    return {
      ...s,
      elapsedMs: getFocusElapsedMs(s, Date.now()),
      pausedAt: now,
      updatedAt: now,
    };
  });
}

// Reinicia a contagem a partir de agora, preservando o acumulado em
// elapsedMs. Retomar uma sessão que não está pausada é um no-op.
export function resumeFocusTimer(sessionId) {
  return updateSession(sessionId, (s) => {
    if (!s.pausedAt) return s;
    const now = nowIso();
    return { ...s, timerStartedAt: now, pausedAt: null, updatedAt: now };
  });
}

export function deleteFocusSessionsForContent(contentId) {
  let removed = 0;
  withDb((db) => {
    const keep = db.focusSessions.filter((s) => s.contentId !== contentId);
    removed = db.focusSessions.length - keep.length;
    return { ...db, focusSessions: keep };
  });
  return removed;
}
