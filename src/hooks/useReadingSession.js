// Ler Comigo — ponte entre a UI e o motor de leitura (readingService +
// readingProgressService). Nenhuma regra de negócio mora aqui: monta o
// texto/segmentos a partir do Content já persistido e delega toda escrita
// ao service, que é a única fonte de verdade. Segue o mesmo padrão de
// useFocusSession.js — inclusive a mesma ressalva de StrictMode abaixo.

import { useState, useCallback, useEffect, useMemo } from "react";
import {
  buildReadingSource,
  hasEnoughReadingText,
  readingSourceText,
  computeSourceFingerprint,
} from "../services/readingService.js";
import { segmentText, segmentationProfile } from "../utils/readingSegments.js";
import { getPreferenceOptions } from "../services/learningPreferencesService.js";
import {
  getReadingProgress,
  startOrResumeReadingProgress,
  setReadingSegmentIndex,
  setReadingRate,
  completeReadingProgress,
  restartReadingProgress,
} from "../services/readingProgressService.js";
import { READING_DEFAULT_RATE } from "../constants.js";

export function useReadingSession(content) {
  const contentId = content?.id || null;

  // Lido uma única vez, no mesmo padrão de ContentBlocks.jsx (comfort
  // reading): a preferência pode mudar depois, mas não durante uma leitura
  // já em andamento — evita a segmentação "pular" de tamanho no meio da
  // sessão do usuário.
  const [preferences] = useState(() => {
    try {
      return getPreferenceOptions();
    } catch {
      return null;
    }
  });

  const source = useMemo(() => buildReadingSource(content), [content]);
  const hasEnough = hasEnoughReadingText(source);
  const profile = useMemo(() => segmentationProfile(preferences), [preferences]);
  const fullText = useMemo(() => readingSourceText(source), [source]);
  const segments = useMemo(() => (hasEnough ? segmentText(fullText, profile) : []), [fullText, hasEnough, profile]);
  const fingerprint = useMemo(() => computeSourceFingerprint(fullText, profile), [fullText, profile]);

  const [progress, setProgress] = useState(() => (contentId ? getReadingProgress(contentId) : null));

  // Cria (ou reconcilia, se o fingerprint mudou) o registro persistido.
  // startOrResumeReadingProgress é idempotente — chamar de novo com os
  // mesmos parâmetros não duplica nem regrava desnecessariamente, então é
  // seguro mesmo sob a dupla invocação de efeitos do React.StrictMode.
  useEffect(() => {
    if (!contentId || !hasEnough || segments.length === 0) return;
    const { progress: p } = startOrResumeReadingProgress(contentId, {
      segmentCount: segments.length,
      sourceFingerprint: fingerprint,
    });
    setProgress(p);
  }, [contentId, hasEnough, segments.length, fingerprint]);

  const index = progress?.currentSegmentIndex ?? 0;
  const rate = progress?.playbackRate ?? READING_DEFAULT_RATE;
  const status = progress?.status ?? "in_progress";
  const total = segments.length;

  // As escritas abaixo NUNCA usam a forma-função de setState: cada callback
  // fecha sobre o `progress` atual e chama o service uma única vez — a
  // mesma regra de useFocusSession.js:73-80, pela mesma razão (um updater
  // com efeito colateral em storage duplicaria a escrita em StrictMode).
  const goTo = useCallback(
    (nextIndex) => {
      if (!contentId) return;
      setProgress(setReadingSegmentIndex(contentId, nextIndex));
    },
    [contentId]
  );

  const next = useCallback(() => {
    if (!contentId || !progress) return;
    setProgress(setReadingSegmentIndex(contentId, progress.currentSegmentIndex + 1));
  }, [contentId, progress]);

  const previous = useCallback(() => {
    if (!contentId || !progress) return;
    setProgress(setReadingSegmentIndex(contentId, progress.currentSegmentIndex - 1));
  }, [contentId, progress]);

  const changeRate = useCallback(
    (nextRate) => {
      if (!contentId) return;
      setProgress(setReadingRate(contentId, nextRate));
    },
    [contentId]
  );

  const complete = useCallback(() => {
    if (!contentId) return;
    setProgress(completeReadingProgress(contentId));
  }, [contentId]);

  const restart = useCallback(() => {
    if (!contentId) return;
    setProgress(restartReadingProgress(contentId));
  }, [contentId]);

  return {
    source,
    segments,
    hasEnough,
    preferences,
    progress,
    index,
    rate,
    status,
    total,
    isLastSegment: total > 0 && index >= total - 1,
    goTo,
    next,
    previous,
    setRate: changeRate,
    complete,
    restart,
  };
}
