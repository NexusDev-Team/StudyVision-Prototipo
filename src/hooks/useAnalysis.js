import { useCallback, useRef, useState } from "react";
import { runAnalysisWithRetry } from "../services/analysisRunner";

// Orquestra o fluxo real de captura -> IA: envia a foto para /api/analyze e expõe
// o estado de progresso para a AnalysisScreen refletir a requisição de verdade
// (nada de setTimeout fingindo processamento).
//
// A retentativa em si (rede/timeout/servidor, sem sair de "analyzing") mora em
// analysisRunner.js — este hook só traduz o resultado em state React e cuida
// das preocupações de UI: o timer de "está demorando" e o cancelamento.
//
// `content` é o Content normalizado, ainda NÃO persistido — quem salva de
// verdade é a SummaryScreen, ao clicar em "Salvar".

// Depois desse tempo sem terminar, a UI pode mostrar um aviso honesto de
// demora — nunca falso progresso, só reconhecer que está demorando.
const SLOW_AFTER_MS = 15000;

export function useAnalysis() {
  const [status, setStatus] = useState("idle"); // idle | analyzing | done | error
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);
  const [errorKind, setErrorKind] = useState(null); // "network" | "timeout" | "server" | "technical" | "not_academic"
  const [slow, setSlow] = useState(false);
  const [partial, setPartial] = useState([]); // seções secundárias que ficaram vazias (ver Bloco 8)
  const [canRetry, setCanRetry] = useState(false);
  const lastPhotoRef = useRef(null);
  const lastPreferencesRef = useRef(null);
  const controllerRef = useRef(null);
  const slowTimerRef = useRef(null);

  const clearSlowTimer = useCallback(() => {
    if (slowTimerRef.current) {
      clearTimeout(slowTimerRef.current);
      slowTimerRef.current = null;
    }
  }, []);

  const run = useCallback(async (photoDataUrl, preferences = null) => {
    lastPhotoRef.current = photoDataUrl;
    lastPreferencesRef.current = preferences;
    setCanRetry(true);
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setError(null);
    setErrorKind(null);
    setContent(null);
    setPartial([]);
    setSlow(false);
    setStatus("analyzing");

    clearSlowTimer();
    slowTimerRef.current = setTimeout(() => {
      if (!controller.signal.aborted) setSlow(true);
    }, SLOW_AFTER_MS);

    const outcome = await runAnalysisWithRetry(photoDataUrl, preferences, controller.signal);
    clearSlowTimer();

    // outcome === null: cancelamento explícito (reset()/troca de foto) — o
    // controller já não é mais o atual, nada a fazer.
    if (controller.signal.aborted || outcome === null) return;

    if (outcome.ok) {
      setPartial(outcome.partial);
      setContent(outcome.content);
      setStatus("done");
    } else {
      setError(outcome.message);
      setErrorKind(outcome.kind);
      setStatus("error");
    }
  }, [clearSlowTimer]);

  const retry = useCallback(() => {
    // Reenvia a MESMA captura com as MESMAS preferências (§15 do briefing).
    // Se não houver foto memorizada (ex.: depois de reset()), não há o que
    // reenviar — `canRetry` deixa a UI desabilitar o botão em vez de um
    // clique que não faz nada.
    if (lastPhotoRef.current) run(lastPhotoRef.current, lastPreferencesRef.current);
  }, [run]);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    clearSlowTimer();
    setStatus("idle");
    setContent(null);
    setError(null);
    setErrorKind(null);
    setSlow(false);
    setPartial([]);
    setCanRetry(false);
    lastPhotoRef.current = null;
    lastPreferencesRef.current = null;
  }, [clearSlowTimer]);

  return { status, content, error, errorKind, slow, partial, canRetry, run, retry, reset };
}
