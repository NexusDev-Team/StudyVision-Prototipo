// POST /api/analyze-extras — completa em segundo plano as seções secundárias
// (quiz/flashcards/openQuestions) que ficaram vazias na análise inicial de
// /api/analyze (ver lib/analysisSanitize.js). Espelha api/extract-text.js na
// validação de entrada: chamada separada e mais simples que api/analyze.js,
// nunca recebe imagem — só o tópico/resumo já identificados.

import { generateExtras, isConfigured, GeminiError } from "../lib/gemini.js";
import { sanitizePreferences } from "../lib/prompts.js";
import { sanitizeExtras } from "../lib/analysisSanitize.js";
import { EXTRAS_KEYS } from "../lib/extrasPrompts.js";
import { getRequestId } from "../lib/requestId.js";

const MAX_FIELD_LENGTH = 20000; // mesma ordem de grandeza dos outros endpoints de texto (api/focus.js)

function badRequest(res, message) {
  return res.status(400).json({ success: false, error: message });
}

export default async function handler(req, res) {
  const requestId = getRequestId(req);

  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Método não permitido." });
  }

  const { topic, summary, extractedText, missing, preferences } = req.body || {};

  if (typeof topic !== "string" || !topic.trim()) {
    return badRequest(res, "Tópico ausente.");
  }
  if (typeof summary !== "string" || !summary.trim()) {
    return badRequest(res, "Resumo ausente.");
  }
  if (topic.length > MAX_FIELD_LENGTH || summary.length > MAX_FIELD_LENGTH || (typeof extractedText === "string" && extractedText.length > MAX_FIELD_LENGTH)) {
    return badRequest(res, "Conteúdo muito grande.");
  }

  const safeMissing = Array.isArray(missing) ? missing.filter((key) => EXTRAS_KEYS.includes(key)) : [];
  if (safeMissing.length === 0) {
    return badRequest(res, "Nenhuma seção reconhecida foi solicitada.");
  }

  // Modo Inclusão: preferências vêm do body (não confiável) — sempre passam
  // pela whitelist, igual a api/analyze.js.
  const safePreferences = sanitizePreferences(preferences);

  if (!isConfigured()) {
    console.error(`[api/analyze-extras#${requestId}] GEMINI_API_KEY ausente.`);
    return res.status(500).json({ success: false, error: "Serviço de complemento indisponível no momento." });
  }

  let result;
  try {
    result = await generateExtras({
      topic,
      summary,
      extractedText: typeof extractedText === "string" ? extractedText : "",
      missing: safeMissing,
      preferences: safePreferences,
    });
  } catch (err) {
    if (err instanceof GeminiError) {
      console.error(`[api/analyze-extras#${requestId}] ${err.code}: ${err.message} (tentativas: ${err.attempts}, missing: [${safeMissing.join(", ")}])`);
      return res.status(502).json({ success: false, error: "Não foi possível completar o material agora." });
    }
    console.error(`[api/analyze-extras#${requestId}] erro inesperado:`, err);
    return res.status(500).json({ success: false, error: "Erro interno ao completar o material." });
  }

  if (!result || typeof result !== "object") {
    console.error(`[api/analyze-extras#${requestId}] resposta nao e um objeto apos generateExtras.`);
    return res.status(502).json({ success: false, error: "Resposta inválida do serviço de complemento." });
  }

  // Reusa o mesmo saneamento do secundário da análise inicial — mesma
  // tolerância a item ruim, mesma conversão de answer, etc. `partial` aqui
  // reflete o que continuou vazio mesmo depois desta chamada dedicada.
  const { result: sanitized, partial } = sanitizeExtras({ topic, summary, ...result });
  const stillPartial = partial.filter((key) => safeMissing.includes(key));

  const out = {};
  for (const key of safeMissing) out[key] = sanitized[key];

  console.log(`[api/analyze-extras#${requestId}] sucesso — missing: [${safeMissing.join(", ")}]${stillPartial.length ? `, ainda partial: [${stillPartial.join(", ")}]` : ""}`);
  return res.status(200).json({ success: true, ...out, partial: stillPartial });
}
