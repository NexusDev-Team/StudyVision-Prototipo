// POST /api/analyze — endpoint principal da inteligência do Study Vision.
// Roda como Serverless Function na Vercel (produção) e via plugin do Vite em dev.

import { generateAnalysis, isConfigured, GeminiError } from "../lib/gemini.js";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // ~6MB de base64, dentro do limite de body da Vercel
const DATA_URL_RE = /^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i;

function badRequest(res, message) {
  return res.status(400).json({ success: false, error: message });
}

// Sem responseSchema forçado (ver lib/gemini.js), o modelo ocasionalmente varia
// pequenos detalhes de forma mesmo seguindo o prompt — corrige aqui os desvios
// observados em teste antes de validar/repassar ao frontend.
function normalizeResult(result) {
  if (Array.isArray(result.openQuestions)) {
    result.openQuestions = result.openQuestions.map((q) => (typeof q === "string" ? q : q?.question)).filter(Boolean);
  }
  if (Array.isArray(result.quiz)) {
    result.quiz = result.quiz.map((q) => ({
      ...q,
      answer: Number.isInteger(q.answer) ? q.answer : q.correct,
    }));
  }
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
    console.error("[api/analyze] GEMINI_API_KEY ausente.");
    return res.status(500).json({ success: false, error: "Serviço de análise indisponível no momento." });
  }

  let result;
  try {
    result = await generateAnalysis({ mimeType, base64Data });
  } catch (err) {
    if (err instanceof GeminiError) {
      console.error(`[api/analyze] ${err.code}: ${err.message}`);
      return res.status(502).json({ success: false, error: "Não foi possível analisar a imagem agora. Tente novamente." });
    }
    console.error("[api/analyze] erro inesperado:", err);
    return res.status(500).json({ success: false, error: "Erro interno ao processar a imagem." });
  }

  if (!result || typeof result !== "object") {
    return res.status(502).json({ success: false, error: "Resposta inválida do serviço de análise." });
  }

  if (result.success === false) {
    return res.status(200).json({
      success: false,
      error: result.error || "Não foi possível identificar o conteúdo da imagem com segurança.",
    });
  }

  normalizeResult(result);

  const checks = {
    success: result.success === true,
    subject: typeof result.subject === "string" && !!result.subject,
    topic: typeof result.topic === "string" && !!result.topic,
    summary: typeof result.summary === "string" && !!result.summary,
    keyConcepts: Array.isArray(result.keyConcepts),
    flashcards: Array.isArray(result.flashcards),
    quiz: Array.isArray(result.quiz) && result.quiz.every((q) => Array.isArray(q.options) && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length),
  };
  const isValid = Object.values(checks).every(Boolean);

  if (!isValid) {
    console.error("[api/analyze] resposta do Gemini não passou na validação de forma:", JSON.stringify(checks));
    return res.status(502).json({ success: false, error: "Resposta inválida do serviço de análise." });
  }

  return res.status(200).json(result);
}
