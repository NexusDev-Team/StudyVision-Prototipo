import { useCallback, useRef, useState } from "react";
import { extractPhotoText, PhotoTextError } from "../services/photoTextService";

// Mensagens de erro centralizadas aqui — único lugar que decide o texto
// exibido ao usuário para cada kind de PhotoTextError, evitando string
// duplicada entre o hook e a UI (PhotoTextSheet só lê `error`).
const GENERIC_ERROR = "Não foi possível extrair o texto desta foto.";
const NO_TEXT_MESSAGE = "Nenhum texto legível foi encontrado nesta foto.";

function messageForError(err) {
  if (err instanceof PhotoTextError && err.kind === "no_text") return NO_TEXT_MESSAGE;
  return GENERIC_ERROR;
}

// Orquestra a extração de texto de UMA foto: cache por foto (nunca chama a
// API de novo se a foto já tem extractedText salvo — §19 do briefing),
// isolamento entre fotos (troca de foto nunca vaza o texto da anterior) e
// proteção contra toque duplo (uma requisição em voo por vez).
//
// `contentId` é fixo por instância do hook (o Content da foto aberta);
// `run(image)` recebe o registro de imagem completo (id + dataUrl +
// extractedText já persistido, se houver).
//
// `persist(contentId, imageId, { text, partial })` é injetado por quem usa o
// hook (PhotoViewerModal, via App.jsx) em vez de chamar contentService
// diretamente daqui: a escrita precisa passar por mutate() do
// ContentStoreContext para o array `images` em memória (prop deste modal)
// refletir o novo extractedText — sem isso, `image.extractedText` no cache-hit
// abaixo permaneceria "" para sempre e a foto chamaria a API de novo a cada
// abertura, mesmo já tendo o texto salvo em disco.
export function usePhotoTextExtraction(contentId, persist) {
  const [status, setStatus] = useState("idle"); // idle | loading | done | empty | error
  const [text, setText] = useState("");
  const [partial, setPartial] = useState(false);
  const [error, setError] = useState(null);
  const controllerRef = useRef(null);
  const currentImageIdRef = useRef(null);
  const lastImageRef = useRef(null);
  // Guarda síncrona contra toque duplo: `status` só reflete a nova requisição
  // no próximo render, então dois cliques no mesmo tick (antes do re-render)
  // ainda veriam status !== "loading" se essa checagem dependesse só do
  // state. Esta ref é atualizada imediatamente, sem esperar o React.
  const isLoadingRef = useRef(false);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    currentImageIdRef.current = null;
    lastImageRef.current = null;
    isLoadingRef.current = false;
    setStatus("idle");
    setText("");
    setPartial(false);
    setError(null);
  }, []);

  const run = useCallback(
    (image) => {
      if (!image?.id) return;
      if (isLoadingRef.current) return; // toque duplo: ignora enquanto uma requisição está em voo

      lastImageRef.current = image;

      // Já extraído e salvo nesta foto: mostra o que já existe, sem chamar a
      // API de novo (evita custo/latência desnecessários).
      if (image.extractedText) {
        currentImageIdRef.current = image.id;
        setText(image.extractedText);
        setPartial(image.extractedTextPartial === true);
        setError(null);
        setStatus("done");
        return;
      }

      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      currentImageIdRef.current = image.id;
      isLoadingRef.current = true;

      setError(null);
      setText("");
      setPartial(false);
      setStatus("loading");

      extractPhotoText(image.dataUrl, { signal: controller.signal })
        .then((result) => {
          if (controller.signal.aborted || currentImageIdRef.current !== image.id) return;
          isLoadingRef.current = false;
          setText(result.text);
          setPartial(result.partial);
          setStatus("done");
          // Persiste na foto (e recarrega o store) para a próxima abertura
          // não chamar a API de novo.
          persist?.(contentId, image.id, { text: result.text, partial: result.partial });
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          if (controller.signal.aborted || currentImageIdRef.current !== image.id) {
            isLoadingRef.current = false;
            return;
          }
          isLoadingRef.current = false;
          // "Sem texto legível" não é persistido (§19): pode ser uma foto mal
          // enquadrada, o usuário deve poder tentar de novo depois.
          if (err instanceof PhotoTextError && err.kind === "no_text") {
            setStatus("empty");
            return;
          }
          setError(messageForError(err));
          setStatus("error");
        });
    },
    [contentId, persist]
  );

  const retry = useCallback(() => {
    if (lastImageRef.current) run({ ...lastImageRef.current, extractedText: "" });
  }, [run]);

  return { status, text, partial, error, run, retry, reset };
}
