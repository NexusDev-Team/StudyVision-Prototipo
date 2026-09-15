// Ler Comigo — progresso de leitura guiada de um Content. Fábrica pura, sem
// I/O. Relaciona-se com o Content EXCLUSIVAMENTE por contentId — nada do
// Content é copiado para dentro deste registro (seção 33 do briefing).
//
// Diferente de FocusSession (histórico de várias sessões por content), aqui
// existe no máximo UM registro por contentId: createReadingProgress só roda
// na primeira vez; atualizações seguintes passam por
// readingProgressService.js, que muta o registro existente diretamente.

import { newId, ID_PREFIX } from "../../utils/id.js";
import { nowIso, toIso } from "../../utils/date.js";
import { READING_RATES, READING_DEFAULT_RATE } from "../../constants.js";

export const READING_PROGRESS_STATUSES = ["in_progress", "completed"];

// Índice sempre dentro de [0, segmentCount-1] — nunca negativo, nunca além
// do último trecho existente. `segmentCount` 0 (sem trechos ainda) clampa a 0.
function normalizeSegmentIndex(index, segmentCount) {
  const n = Number.isInteger(index) ? index : 0;
  const maxIndex = Math.max(0, segmentCount - 1);
  return Math.min(Math.max(n, 0), maxIndex);
}

function normalizeSegmentCount(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

export function createReadingProgress({
  contentId,
  currentSegmentIndex,
  playbackRate,
  status,
  segmentCount,
  sourceFingerprint,
  completedAt,
} = {}) {
  const now = nowIso();
  const safeSegmentCount = normalizeSegmentCount(segmentCount);

  return {
    id: newId(ID_PREFIX.readingProgress),
    contentId: contentId || null,
    currentSegmentIndex: normalizeSegmentIndex(currentSegmentIndex, safeSegmentCount),
    playbackRate: READING_RATES.includes(playbackRate) ? playbackRate : READING_DEFAULT_RATE,
    status: READING_PROGRESS_STATUSES.includes(status) ? status : "in_progress",
    segmentCount: safeSegmentCount,
    // Identifica o texto+perfil de segmentação que gerou segmentCount — se
    // mudar entre sessões (conteúdo editado, preferências trocadas), o
    // service clampa/reajusta em vez de apontar para um trecho inexistente.
    sourceFingerprint: typeof sourceFingerprint === "string" ? sourceFingerprint : null,
    createdAt: now,
    updatedAt: now,
    completedAt: toIso(completedAt),
  };
}
