// POST /api/reading-help — auxílio contextual do Ler Comigo (Etapa 3):
// "Me perdi" (mode: "lost") e "Outro jeito" (mode: "rephrase") em uma única
// operação (seção 45 do briefing), em vez de dois endpoints separados.
// Payload sempre pequeno, nunca imagem, nunca o Content inteiro, nunca
// histórico — não gera nova sessão, não inicia conversa persistente. Mesmo
// padrão de api/rephrase.js: Serverless Function na Vercel, plugin do Vite
// em dev.

import { generateReadingHelp, isConfigured, GeminiError } from "../lib/gemini.js";
import { sanitizePreferences } from "../lib/prompts.js";
import { buildReadingHelpPrompt } from "../lib/readingHelpPrompts.js";

const READING_HELP_MODES = ["lost", "rephrase"];
const MAX_TOPIC_CHARS = 80;
const MAX_CURRENT_CHARS = 1200;
const MAX_PREVIOUS_ITEMS = 2;
const MAX_PREVIOUS_CHARS = 400;

function badRequest(res, message) {
  return res.status(400).json({ success: false, error: message });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Método não permitido." });
  }

  const { mode, topic, current, previous, preferences } = req.body || {};

  if (!READING_HELP_MODES.includes(mode)) {
    return badRequest(res, "Modo de auxílio inválido.");
  }

  const safeTopic = typeof topic === "string" ? topic.slice(0, MAX_TOPIC_CHARS) : "";
  const safeCurrent = typeof current === "string" ? current.slice(0, MAX_CURRENT_CHARS) : "";
  // Nunca aceita imagem/base64/Content inteiro/histórico — só as strings
  // esperadas passam adiante, e `previous` nunca ultrapassa 2 itens.
  const safePrevious = Array.isArray(previous)
    ? previous
        .filter((item) => typeof item === "string")
        .slice(0, MAX_PREVIOUS_ITEMS)
        .map((item) => item.slice(0, MAX_PREVIOUS_CHARS))
    : [];

  if (!safeCurrent.trim()) {
    return badRequest(res, "Nada para explicar.");
  }

  const safePreferences = sanitizePreferences(preferences);

  if (!isConfigured()) {
    console.error("[api/reading-help] GEMINI_API_KEY ausente.");
    return res.status(500).json({ success: false, error: "Serviço indisponível no momento." });
  }

  const prompt = buildReadingHelpPrompt({
    mode,
    topic: safeTopic,
    current: safeCurrent,
    previous: safePrevious,
    preferences: safePreferences,
  });

  let result;
  try {
    result = await generateReadingHelp({ prompt });
  } catch (err) {
    if (err instanceof GeminiError) {
      console.error(`[api/reading-help] ${err.code}: ${err.message}`);
      return res.status(502).json({ success: false, error: "Não foi possível preparar o auxílio agora. Tente novamente." });
    }
    console.error("[api/reading-help] erro inesperado:", err);
    return res.status(500).json({ success: false, error: "Erro interno ao preparar o auxílio." });
  }

  if (!result || typeof result !== "object") {
    return res.status(502).json({ success: false, error: "Resposta inválida do serviço." });
  }

  if (result.success === false) {
    return res.status(200).json({ success: false, error: result.error || "Não foi possível preparar o auxílio." });
  }

  const safeResultContent = typeof result.content === "string" ? result.content.trim() : "";
  if (!safeResultContent) {
    return res.status(502).json({ success: false, error: "Resposta inválida do serviço." });
  }

  return res.status(200).json({ success: true, content: safeResultContent });
}
