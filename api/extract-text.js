// POST /api/extract-text — extração de texto de UMA foto (feature "Extrair
// texto" no visualizador). Espelha api/analyze.js na validação de entrada,
// mas é uma chamada separada e mais simples: nunca recebe/repassa
// `preferences` (Modo Inclusão não se aplica ao texto extraído, §22 do
// briefing) e não gera material de estudo — só a transcrição da imagem.

import { extractPhotoText, isConfigured, GeminiError } from "../lib/gemini.js";
import { MAX_IMAGE_BYTES, DATA_URL_RE } from "../lib/imageDataUrl.js";

function badRequest(res, message) {
  return res.status(400).json({ success: false, error: message });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Método não permitido." });
  }

  const { image } = req.body || {};
  if (!image || typeof image !== "string") {
    return badRequest(res, "Nenhuma imagem foi enviada.");
  }

  const match = image.match(DATA_URL_RE);
  if (!match) {
    return badRequest(res, "Formato de imagem inválido.");
  }

  const mimeType = `image/${match[1].toLowerCase() === "jpg" ? "jpeg" : match[1].toLowerCase()}`;
  const base64Data = match[2];
  if (base64Data.length > MAX_IMAGE_BYTES) {
    return badRequest(res, "Imagem muito grande.");
  }

  if (!isConfigured()) {
    console.error("[api/extract-text] GEMINI_API_KEY ausente.");
    return res.status(500).json({ success: false, error: "Serviço de extração indisponível no momento." });
  }

  let result;
  try {
    result = await extractPhotoText({ mimeType, base64Data });
  } catch (err) {
    if (err instanceof GeminiError) {
      console.error(`[api/extract-text] ${err.code}: ${err.message}`);
      return res.status(502).json({ success: false, error: "Não foi possível extrair o texto desta foto." });
    }
    console.error("[api/extract-text] erro inesperado:", err);
    return res.status(500).json({ success: false, error: "Erro interno ao processar a imagem." });
  }

  if (!result || typeof result !== "object") {
    return res.status(502).json({ success: false, error: "Resposta inválida do serviço de extração." });
  }

  // success:false do modelo = a IA rodou e não encontrou texto legível.
  // HTTP 200: não é uma falha técnica, é um resultado válido ("sem texto").
  if (result.success === false) {
    return res.status(200).json({ success: false, reason: "no_text" });
  }

  const text = typeof result.text === "string" ? result.text.trim() : "";
  if (!text) {
    return res.status(200).json({ success: false, reason: "no_text" });
  }

  return res.status(200).json({ success: true, text, partial: result.partial === true });
}
