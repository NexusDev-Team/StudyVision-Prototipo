import { useCallback, useRef, useState } from "react";
import { analyzeImage, toStudyItem, AnalysisError } from "../services/studyVisionService";
import { makeThumbnail } from "../utils/image";

// Orquestra o fluxo real de captura -> IA: envia a foto para /api/analyze e expõe
// o estado de progresso para a AnalysisScreen refletir a requisição de verdade
// (nada de setTimeout fingindo processamento).
export function useAnalysis() {
  const [status, setStatus] = useState("idle"); // idle | uploading | analyzing | done | error
  const [item, setItem] = useState(null);
  const [error, setError] = useState(null);
  const lastPhotoRef = useRef(null);
  const controllerRef = useRef(null);

  const run = useCallback(async (photoDataUrl) => {
    lastPhotoRef.current = photoDataUrl;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    setError(null);
    setItem(null);
    setStatus("uploading");

    try {
      setStatus("analyzing");
      const [result, thumbnail] = await Promise.all([
        analyzeImage(photoDataUrl, { signal: controller.signal }),
        makeThumbnail(photoDataUrl).catch(() => photoDataUrl),
      ]);
      if (controller.signal.aborted) return;
      setItem(toStudyItem(result, thumbnail));
      setStatus("done");
    } catch (err) {
      if (controller.signal.aborted) return;
      const message = err instanceof AnalysisError ? err.message : "Não foi possível analisar a imagem agora. Tente novamente.";
      setError(message);
      setStatus("error");
    }
  }, []);

  const retry = useCallback(() => {
    if (lastPhotoRef.current) run(lastPhotoRef.current);
  }, [run]);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setStatus("idle");
    setItem(null);
    setError(null);
    lastPhotoRef.current = null;
  }, []);

  return { status, item, error, run, retry, reset };
}
