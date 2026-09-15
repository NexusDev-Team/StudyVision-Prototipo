// Ponte entre a UI do Modo Foco (Etapa 2) e o motor já existente (Etapa 1).
// Nenhuma regra de negócio mora aqui — cada operação delega para
// focusSessionService/focusModeService, que são a única fonte de verdade
// persistida. Este hook só espelha o resultado em state React.
//
// Observação: FocusSession não faz parte do snapshot do ContentStoreContext
// (que só rastreia contents/subjects/reviews/events) — não há necessidade de
// rotear as escritas por `mutate()`, então o hook mantém seu próprio state e
// sempre relê do service depois de cada operação persistida.

import { useState, useCallback, useEffect } from "react";
import {
  setFocusStepIndex,
  advanceFocusStep,
  completeFocusSession,
  startFocusTimer,
  pauseFocusTimer,
  resumeFocusTimer,
} from "../services/focusSessionService.js";
import { startFocusSession, getOrResumeFocusSession, FocusError } from "../services/focusModeService.js";

const ERROR_MESSAGES = {
  not_found: "Não encontramos este conteúdo.",
  insufficient_content: "Este conteúdo ainda não tem informação suficiente para gerar uma sessão de foco.",
  invalid_duration: "Duração não suportada.",
  network: "Sem conexão com a internet. Verifique sua rede e tente novamente.",
  upstream: "Não conseguimos preparar sua sessão agora.",
  invalid_plan: "Não conseguimos preparar sua sessão agora.",
  technical: "Não conseguimos preparar sua sessão agora.",
};

// Pura — nunca expõe err.message cru (que pode vir do Gemini/rede) para a
// UI; sempre traduz para uma das mensagens acima via err.kind.
export function focusErrorMessage(err) {
  const kind = err instanceof FocusError ? err.kind : "technical";
  return ERROR_MESSAGES[kind] || ERROR_MESSAGES.technical;
}

export function useFocusSession(contentId) {
  const [session, setSession] = useState(() => (contentId ? getOrResumeFocusSession(contentId) : null));
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const [error, setError] = useState(null); // { kind, message } | null

  const refresh = useCallback(() => {
    setSession(contentId ? getOrResumeFocusSession(contentId) : null);
  }, [contentId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Gera (ou retoma, sem nova chamada ao Gemini — regra crítica da Etapa 2)
  // uma sessão para `durationMinutes`. startFocusSession já garante isso: se
  // já existir sessão ativa, devolve-a direto, sem tocar em rede.
  const start = useCallback(
    async (durationMinutes) => {
      setStatus("loading");
      setError(null);
      try {
        const { session: s } = await startFocusSession(contentId, durationMinutes);
        setSession(s);
        setStatus("ready");
        return s;
      } catch (err) {
        setStatus("error");
        setError({ kind: err instanceof FocusError ? err.kind : "technical", message: focusErrorMessage(err) });
        throw err;
      }
    },
    [contentId]
  );

  // As seis operações abaixo chamam serviços com efeito colateral real
  // (leem e gravam sv_db). Por isso NUNCA usam a forma-função de setState
  // (`setSession(prev => ...)`): em React.StrictMode (dev), o updater
  // passado nessa forma é invocado duas vezes de propósito para expor
  // reducers impuros — e um updater que grava no storage a cada chamada
  // duplicaria a escrita (ex.: um único clique em "Continuar" avançava dois
  // steps). Em vez disso, cada callback fecha sobre `session` do state atual
  // e chama o serviço uma única vez.
  const goToStep = useCallback(
    (index) => {
      if (!session) return;
      setSession(setFocusStepIndex(session.id, index));
    },
    [session]
  );

  const advance = useCallback(() => {
    if (!session) return;
    setSession(advanceFocusStep(session.id));
  }, [session]);

  const goBackStep = useCallback(() => {
    if (!session) return;
    setSession(setFocusStepIndex(session.id, session.currentStepIndex - 1));
  }, [session]);

  const complete = useCallback(() => {
    if (!session) return;
    setSession(completeFocusSession(session.id));
  }, [session]);

  const startTimer = useCallback(() => {
    if (!session) return;
    setSession(startFocusTimer(session.id));
  }, [session]);

  const pauseTimer = useCallback(() => {
    if (!session) return;
    setSession(pauseFocusTimer(session.id));
  }, [session]);

  const resumeTimer = useCallback(() => {
    if (!session) return;
    setSession(resumeFocusTimer(session.id));
  }, [session]);

  return {
    session,
    status,
    error,
    refresh,
    start,
    goToStep,
    advance,
    goBackStep,
    complete,
    startTimer,
    pauseTimer,
    resumeTimer,
  };
}
