import { useCallback, useRef, useState } from "react";
import { analyzeImage, normalizeAnalysisResult, AnalysisError } from "../services/studyVisionService";
import { makeThumbnail } from "../utils/image";

// Orquestra o fluxo real de captura -> IA: envia a foto para /api/analyze e expõe
// o estado de progresso para a AnalysisScreen refletir a requisição de verdade
// (nada de setTimeout fingindo processamento).
//
// `content` é o Content normalizado, ainda NÃO persistido — quem salva de
// verdade é a SummaryScreen, ao clicar em "Salvar".
export function useAnalysis() {
  const [status, setStatus] = useState("idle"); // idle | analyzing | done | error
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);
  const [errorKind, setErrorKind] = useState(null); // "technical" | "not_academic"
  const lastPhotoRef = useRef(null);
  const lastPreferencesRef = useRef(null);
  const controllerRef = useRef(null);

  const run = useCallback(async (photoDataUrl, preferences = null) => {
    lastPhotoRef.current = photoDataUrl;
    lastPreferencesRef.current = preferences;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setError(null);
    setErrorKind(null);
    setContent(null);
    setStatus("analyzing");

    try {
      const [result, thumbnail] = await Promise.all([
        analyzeImage(photoDataUrl, { signal: controller.signal, preferences }),
        makeThumbnail(photoDataUrl).catch(() => photoDataUrl),
      ]);
      if (controller.signal.aborted) return;
      const { content: normalized } = normalizeAnalysisResult(result, thumbnail, preferences);
      setContent(normalized);
      setStatus("done");
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof AnalysisError ? err.message : "Não foi possível analisar a imagem agora. Tente novamente.";
      setError(message);
      setErrorKind(err instanceof AnalysisError ? err.kind : "technical");
      setStatus("error");
    }
  }, []);

  const retry = useCallback(() => {
    // Reenvia a MESMA captura com as MESMAS preferências (§15 do briefing).
    if (lastPhotoRef.current) run(lastPhotoRef.current, lastPreferencesRef.current);
  }, [run]);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setStatus("idle");
    setContent(null);
    setError(null);
    setErrorKind(null);
    lastPhotoRef.current = null;
    lastPreferencesRef.current = null;
  }, []);

  return { status, content, error, errorKind, run, retry, reset };
}
