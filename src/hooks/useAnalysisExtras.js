import { useEffect, useRef, useState } from "react";
import { requestExtras, mergeExtrasIntoContent } from "../services/analysisExtrasService";

// Completa em segundo plano as seções secundárias (quiz/flashcards/
// openQuestions) que ficaram vazias na análise inicial — dispara UMA vez ao
// receber um `content`+`partial` não vazios, sem bloquear nem arriscar levar
// o usuário de volta à tela de erro: qualquer falha aqui é silenciosa, o
// usuário já está vendo o núcleo (resumo, tópico, conceitos).
//
// Devolve sempre um `content` para renderizar: começa igual ao recebido e é
// substituído por uma versão mesclada assim que (e se) o complemento chegar.
export function useAnalysisExtras(content, partial) {
  const [merged, setMerged] = useState(content);
  const [pending, setPending] = useState(false);
  const contentRef = useRef(content);
  const firedRef = useRef(false);

  // Novo Content (nova análise, ex.: depois de "Tirar outra foto" e voltar) —
  // reinicia o acompanhamento e o espelho local.
  if (contentRef.current !== content) {
    contentRef.current = content;
    firedRef.current = false;
  }

  useEffect(() => {
    setMerged(content);
  }, [content]);

  useEffect(() => {
    if (!content || !Array.isArray(partial) || partial.length === 0 || firedRef.current) return;
    firedRef.current = true;

    const controller = new AbortController();
    setPending(true);
    requestExtras({
      topic: content.topic,
      summary: content.summary,
      extractedText: content.extractedText,
      missing: partial,
      preferences: content.learningPreferences,
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) return;
        setMerged((prev) => mergeExtrasIntoContent(prev || content, result));
      })
      .catch(() => {
        // Silencioso por decisão do produto: falha do complemento nunca vira
        // tela de erro — o núcleo já está garantido.
      })
      .finally(() => {
        if (!controller.signal.aborted) setPending(false);
      });

    return () => controller.abort();
  }, [content, partial]);

  return { content: merged, pending };
}
