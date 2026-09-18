// Comunicação do frontend com /api/extract-text (extração de texto de UMA
// foto). Espelha o padrão de studyVisionService.js/analyzeImage, mas é um
// fluxo separado: nunca envia `preferences` (Modo Inclusão não se aplica ao
// texto extraído, §22 do briefing) e nunca gera Content — só a transcrição.

import { copyText as copyTextToClipboard } from "./exportService.js";

// kind: "technical" (rede, timeout, erro do servidor, resposta malformada) ou
// "no_text" (a IA rodou e não encontrou texto legível na foto).
export class PhotoTextError extends Error {
  constructor(message, kind = "technical") {
    super(message);
    this.kind = kind;
  }
}

const GENERIC_ERROR = "Não foi possível extrair o texto desta foto.";
const NO_TEXT_MESSAGE = "Nenhum texto legível foi encontrado nesta foto.";

/**
 * Envia a foto para /api/extract-text e retorna { text, partial }.
 * @param {string} imageDataUrl - data:image/jpeg;base64,...
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<{ text: string, partial: boolean }>}
 */
export async function extractPhotoText(imageDataUrl, opts = {}) {
  let response;
  try {
    response = await fetch("/api/extract-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageDataUrl }),
      signal: opts.signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new PhotoTextError("Sem conexão com a internet. Verifique sua rede e tente novamente.", "technical");
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new PhotoTextError(GENERIC_ERROR, "technical");
  }

  if (!response.ok) {
    throw new PhotoTextError(body?.error || GENERIC_ERROR, "technical");
  }

  // success:false com HTTP 200 = a IA rodou e não encontrou texto legível —
  // não é uma falha técnica, é um resultado válido ("sem texto").
  if (body.success === false) {
    throw new PhotoTextError(NO_TEXT_MESSAGE, "no_text");
  }

  return { text: typeof body.text === "string" ? body.text : "", partial: body.partial === true };
}

// Reexportado para quem consome só este serviço (hook/UI da feature de
// extração de texto) não precisar importar de exportService.js diretamente.
export const copyText = copyTextToClipboard;
