// Ler Comigo — persistência do progresso de leitura guiada. Só storage:
// nenhum fetch, nenhuma chamada ao Gemini aqui (mesma separação de
// focusSessionService.js). Um único registro por contentId — não é
// histórico de sessões, é o "marcador de página" daquele conteúdo.

import { readDb, withDb } from "../data/storage/index.js";
import { createReadingProgress } from "../data/models/readingProgress.js";
import { READING_RATES, READING_DEFAULT_RATE } from "../constants.js";
import { nowIso } from "../utils/date.js";

export function getReadingProgress(contentId) {
  return readDb().readingProgress.find((p) => p.contentId === contentId) || null;
}

function normalizeIndex(index, segmentCount) {
  const n = Number.isInteger(index) ? index : 0;
  const maxIndex = Math.max(0, segmentCount - 1);
  return Math.min(Math.max(n, 0), maxIndex);
}

function updateProgress(contentId, updater) {
  let updated = null;
  withDb((db) => ({
    ...db,
    readingProgress: db.readingProgress.map((p) => {
      if (p.contentId !== contentId) return p;
      updated = updater(p);
      return updated;
    }),
  }));
  return updated;
}

// Cria o registro na primeira vez, ou retoma o existente. Se o texto/perfil
// de segmentação mudou desde a última leitura (fingerprint diferente), o
// índice salvo é CLAMPADO ao novo segmentCount em vez de apontar para um
// trecho que não existe mais — nunca reinicia silenciosamente sem motivo,
// só ajusta o suficiente para continuar válido.
export function startOrResumeReadingProgress(contentId, { segmentCount, sourceFingerprint } = {}) {
  const safeSegmentCount = Number.isInteger(segmentCount) && segmentCount >= 0 ? segmentCount : 0;
  const existing = getReadingProgress(contentId);

  if (!existing) {
    const progress = createReadingProgress({ contentId, segmentCount: safeSegmentCount, sourceFingerprint });
    const { result } = withDb((db) => ({ ...db, readingProgress: [...db.readingProgress, progress] }));
    return { progress, result, resumed: false };
  }

  if (existing.sourceFingerprint === sourceFingerprint && existing.segmentCount === safeSegmentCount) {
    return { progress: existing, result: { ok: true }, resumed: true };
  }

  // Fingerprint/segmentCount mudou: reajusta sem apagar o registro nem
  // perder createdAt/status — só o índice é reclampado ao tamanho novo.
  const adjusted = updateProgress(contentId, (p) => ({
    ...p,
    segmentCount: safeSegmentCount,
    sourceFingerprint,
    currentSegmentIndex: normalizeIndex(p.currentSegmentIndex, safeSegmentCount),
    updatedAt: nowIso(),
  }));
  return { progress: adjusted, result: { ok: true }, resumed: true, resegmented: true };
}

export function setReadingSegmentIndex(contentId, index) {
  return updateProgress(contentId, (p) => ({
    ...p,
    currentSegmentIndex: normalizeIndex(index, p.segmentCount),
    updatedAt: nowIso(),
  }));
}

export function setReadingRate(contentId, rate) {
  const safeRate = READING_RATES.includes(rate) ? rate : READING_DEFAULT_RATE;
  return updateProgress(contentId, (p) => ({ ...p, playbackRate: safeRate, updatedAt: nowIso() }));
}

export function completeReadingProgress(contentId) {
  const now = nowIso();
  return updateProgress(contentId, (p) => ({ ...p, status: "completed", completedAt: now, updatedAt: now }));
}

// Volta ao trecho 1, sem apagar createdAt nem o registro — "Ler novamente"
// não é uma nova entidade, é o mesmo progresso reiniciado.
export function restartReadingProgress(contentId) {
  return updateProgress(contentId, (p) => ({
    ...p,
    status: "in_progress",
    currentSegmentIndex: 0,
    completedAt: null,
    updatedAt: nowIso(),
  }));
}

export function deleteReadingProgressForContent(contentId) {
  let removed = 0;
  withDb((db) => {
    const keep = db.readingProgress.filter((p) => p.contentId !== contentId);
    removed = db.readingProgress.length - keep.length;
    return { ...db, readingProgress: keep };
  });
  return removed;
}
