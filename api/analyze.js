// POST /api/analyze — endpoint principal da inteligência do Study Vision.
// Roda como Serverless Function na Vercel (produção) e via plugin do Vite em dev.

import { generateAnalysis, isConfigured, GeminiError } from "../lib/gemini.js";
import { sanitizePreferences } from "../lib/prompts.js";
import { MAX_IMAGE_BYTES, DATA_URL_RE } from "../lib/imageDataUrl.js";
import { validateCore, sanitizeExtras } from "../lib/analysisSanitize.js";
import { getRequestId } from "../lib/requestId.js";

function badRequest(res, message) {
  return res.status(400).json({ success: false, error: message });
}

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Método não permitido." });
  }

  const { image, preferences } = req.body || {};
  if (!image || typeof image !== "string") {
    return badRequest(res, "Nenhuma imagem foi enviada.");
  }

  // Modo Inclusão: preferências vêm do body (não confiável) — sempre passam
  // pela whitelist. Body malformado vira "nenhuma preferência", nunca erro 400.
  const safePreferences = sanitizePreferences(preferences);

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
    console.error(`[api/analyze#${requestId}] GEMINI_API_KEY ausente.`);
    return res.status(500).json({ success: false, error: "Serviço de análise indisponível no momento." });
  }

  let result;
  try {
    // validateCore roda DENTRO do laço de retentativa de lib/gemini.js: uma
    // resposta sem tópico/resumo é tratada como falha transitória e gera de
    // novo, no mesmo orçamento — não é mais um 502 na primeira variação ruim.
    result = await generateAnalysis({ mimeType, base64Data, preferences: safePreferences, validate: validateCore });
  } catch (err) {
    if (err instanceof GeminiError) {
      console.error(`[api/analyze#${requestId}] ${err.code}: ${err.message} (tentativas: ${err.attempts}, imagem: ${base64Data.length}b64)`);
      return res.status(502).json({ success: false, error: "Não foi possível analisar a imagem agora. Tente novamente." });
    }
    console.error(`[api/analyze#${requestId}] erro inesperado:`, err);
    return res.status(500).json({ success: false, error: "Erro interno ao processar a imagem." });
  }

  if (!result || typeof result !== "object") {
    console.error(`[api/analyze#${requestId}] resposta nao e um objeto apos generateAnalysis.`);
    return res.status(502).json({ success: false, error: "Resposta inválida do serviço de análise." });
  }

  if (result.success === false) {
    console.log(`[api/analyze#${requestId}] not_academic — imagem: ${base64Data.length}b64`);
    return res.status(200).json({
      success: false,
      error: result.error || "Não foi possível identificar o conteúdo da imagem com segurança.",
    });
  }

  // Núcleo já garantido por validateCore (topic/summary não vazios); aqui só
  // o secundário é saneado — itens ruins de quiz/flashcards/openQuestions são
  // filtrados, nunca derrubam a resposta inteira (ver lib/analysisSanitize.js).
  const { result: sanitized, partial } = sanitizeExtras(result);

  console.log(`[api/analyze#${requestId}] sucesso — imagem: ${base64Data.length}b64${partial.length ? `, partial: [${partial.join(", ")}]` : ""}`);
  return res.status(200).json({ ...sanitized, partial });
}
