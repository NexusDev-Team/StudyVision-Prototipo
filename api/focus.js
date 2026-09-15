// POST /api/focus — motor do Modo Foco. Transforma um Content já analisado
// numa sessão de estudo guiada, adaptada ao tempo disponível e às
// necessidades do Modo Inclusão. Nunca recebe imagem — a análise já
// aconteceu antes, em POST /api/analyze. Mesmo padrão de api/analyze.js:
// Serverless Function na Vercel, plugin do Vite em dev.

import { generateFocusPlan, isConfigured, GeminiError } from "../lib/gemini.js";
import { sanitizePreferences } from "../lib/prompts.js";
import { buildFocusPrompt, FOCUS_DURATIONS, FOCUS_STEP_BOUNDS } from "../lib/focusPrompts.js";

// Whitelist dos campos acadêmicos aceitos no payload — o corpo da requisição
// nunca é confiável, então mesmo que o frontend já monte um payload enxuto
// (buildFocusPayload em src/services/focusModeService.js), o servidor filtra
// de novo antes de colocar qualquer coisa no prompt.
const PAYLOAD_FIELDS = ["title", "subject", "topic", "summary", "keyConcepts", "keywords", "extractedText", "difficulty"];
const MAX_TEXT_FIELD_CHARS = 20000;

function badRequest(res, message) {
  return res.status(400).json({ success: false, error: message });
}

function sanitizePayload(raw) {
  const src = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const out = {};
  for (const field of PAYLOAD_FIELDS) {
    const value = src[field];
    if (Array.isArray(value)) {
      out[field] = value.filter((v) => typeof v === "string");
    } else if (typeof value === "string") {
      out[field] = value.length > MAX_TEXT_FIELD_CHARS ? value.slice(0, MAX_TEXT_FIELD_CHARS) : value;
    }
  }
  return out;
}

// Não olha `title`: o frontend sempre manda um título não-vazio (a fábrica de
// Content cai em "Conteúdo sem título" na ausência de um real — ver
// src/data/models/content.js), então checar title nunca barraria nada. A
// substância real do material está em summary/extractedText.
function hasEnoughContent(payload) {
  return Boolean((payload.summary && payload.summary.trim()) || (payload.extractedText && payload.extractedText.trim()));
}

// Sem responseSchema forçado (ver lib/gemini.js), o modelo pode variar
// pequenos detalhes de forma — normaliza os desvios óbvios antes de validar.
function normalizeResult(result) {
  if (Array.isArray(result.steps)) {
    result.steps = result.steps.map((step) => ({
      ...step,
      type: typeof step?.type === "string" ? step.type.trim() : step?.type,
      title: typeof step?.title === "string" ? step.title.trim() : step?.title,
      content: typeof step?.content === "string" ? step.content.trim() : step?.content,
    }));
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Método não permitido." });
  }

  const { payload, durationMinutes, preferences } = req.body || {};

  if (!FOCUS_DURATIONS.includes(durationMinutes)) {
    return badRequest(res, "Duração inválida.");
  }

  const safePayload = sanitizePayload(payload);
  if (!hasEnoughContent(safePayload)) {
    return badRequest(res, "Conteúdo insuficiente para gerar uma sessão de foco.");
  }

  // Modo Inclusão: preferências vêm do body (não confiável) — sempre passam
  // pela whitelist. Body malformado vira "nenhuma preferência", nunca erro 400.
  const safePreferences = sanitizePreferences(preferences);

  if (!isConfigured()) {
    console.error("[api/focus] GEMINI_API_KEY ausente.");
    return res.status(500).json({ success: false, error: "Serviço de foco indisponível no momento." });
  }

  const prompt = buildFocusPrompt({ durationMinutes, preferences: safePreferences, payload: safePayload });

  let result;
  try {
    result = await generateFocusPlan({ prompt });
  } catch (err) {
    if (err instanceof GeminiError) {
      console.error(`[api/focus] ${err.code}: ${err.message}`);
      return res.status(502).json({ success: false, error: "Não foi possível gerar a sessão de foco agora. Tente novamente." });
    }
    console.error("[api/focus] erro inesperado:", err);
    return res.status(500).json({ success: false, error: "Erro interno ao gerar a sessão de foco." });
  }

  if (!result || typeof result !== "object") {
    return res.status(502).json({ success: false, error: "Resposta inválida do serviço de foco." });
  }

  if (result.success === false) {
    return res.status(200).json({
      success: false,
      error: result.error || "Não foi possível gerar uma sessão de foco útil a partir deste conteúdo.",
    });
  }

  normalizeResult(result);

  const bound = FOCUS_STEP_BOUNDS[durationMinutes];
  // A validação aqui é estrutural (array, faixa, strings não-vazias) — o
  // enum exato de `type` é responsabilidade de normalizeFocusPlan (client),
  // que faz fallback de tipo desconhecido para "explanation" em vez de
  // rejeitar a sessão inteira por causa de um campo presentacional.
  const checks = {
    success: result.success === true,
    steps: Array.isArray(result.steps) && result.steps.length >= bound.min && result.steps.length <= bound.max,
    stepsShape: Array.isArray(result.steps) && result.steps.every(
      (s) => typeof s?.title === "string" && s.title.trim() && typeof s?.content === "string" && s.content.trim()
    ),
  };
  const isValid = Object.values(checks).every(Boolean);

  if (!isValid) {
    console.error("[api/focus] resposta do Gemini não passou na validação de forma:", JSON.stringify(checks));
    return res.status(502).json({ success: false, error: "Resposta inválida do serviço de foco." });
  }

  return res.status(200).json(result);
}
