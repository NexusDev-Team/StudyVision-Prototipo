// POST /api/rephrase — "Outro jeito" (Etapa 2 do Modo Foco). Reexplica APENAS
// o step atual em tela. Payload mínimo, nunca imagem, nunca o Content
// inteiro, nunca histórico de conversa — não gera nova FocusSession, não
// inicia conversa persistente. Mesmo padrão de api/focus.js: Serverless
// Function na Vercel, plugin do Vite em dev.

import { generateRephrase, isConfigured, GeminiError } from "../lib/gemini.js";
import { sanitizePreferences } from "../lib/prompts.js";
import { buildRephrasePrompt } from "../lib/rephrasePrompts.js";

const MAX_TITLE_CHARS = 80;
const MAX_CONTENT_CHARS = 1200;

function badRequest(res, message) {
  return res.status(400).json({ success: false, error: message });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Método não permitido." });
  }

  const { title, content, preferences } = req.body || {};
  const safeTitle = typeof title === "string" ? title.slice(0, MAX_TITLE_CHARS) : "";
  const safeContent = typeof content === "string" ? content.slice(0, MAX_CONTENT_CHARS) : "";

  if (!safeContent.trim()) {
    return badRequest(res, "Nada para reexplicar.");
  }

  const safePreferences = sanitizePreferences(preferences);

  if (!isConfigured()) {
    console.error("[api/rephrase] GEMINI_API_KEY ausente.");
    return res.status(500).json({ success: false, error: "Serviço indisponível no momento." });
  }

  const prompt = buildRephrasePrompt({ title: safeTitle, content: safeContent, preferences: safePreferences });

  let result;
  try {
    result = await generateRephrase({ prompt });
  } catch (err) {
    if (err instanceof GeminiError) {
      console.error(`[api/rephrase] ${err.code}: ${err.message}`);
      return res.status(502).json({ success: false, error: "Não foi possível reexplicar esta etapa agora. Tente novamente." });
    }
    console.error("[api/rephrase] erro inesperado:", err);
    return res.status(500).json({ success: false, error: "Erro interno ao reexplicar esta etapa." });
  }

  if (!result || typeof result !== "object") {
    return res.status(502).json({ success: false, error: "Resposta inválida do serviço." });
  }

  if (result.success === false) {
    return res.status(200).json({ success: false, error: result.error || "Não foi possível reexplicar esta etapa." });
  }

  const safeResultContent = typeof result.content === "string" ? result.content.trim() : "";
  if (!safeResultContent) {
    return res.status(502).json({ success: false, error: "Resposta inválida do serviço." });
  }

  return res.status(200).json({ success: true, content: safeResultContent });
}
