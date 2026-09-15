// Centraliza configuração e comunicação com a Gemini API.
// Único ponto do backend que conhece o SDK do Gemini — troca de modelo/provedor
// futuramente não deve exigir mudanças em api/analyze.js.

import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION, buildAnalysisPrompt } from "./prompts.js";
import { FOCUS_SYSTEM_INSTRUCTION } from "./focusPrompts.js";
import { REPHRASE_SYSTEM_INSTRUCTION } from "./rephrasePrompts.js";

const DEFAULT_MODEL = "gemini-flash-lite-latest";
// Prompts do Modo Inclusão com várias necessidades ativas geram saída maior e
// mais lenta (observado: até ~25s). 55s deixa margem sob o maxDuration=60 da
// Vercel (vercel.json) sem estourar a função.
const REQUEST_TIMEOUT_MS = 55000;

export class GeminiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code; // "MISSING_KEY" | "UPSTREAM" | "BAD_JSON"
  }
}

export function isConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

// Recuperação de JSON quase-válido. Duas classes de defeito observadas com o
// modelo lite quando o prompt do Modo Inclusão pede "summary" multi-linha:
//  1. marcador de lista "- " vazando para dentro de um array JSON (tipicamente
//     "openQuestions") logo antes de uma string — "No number after minus sign";
//  2. quebras de linha / tabs CRUAS dentro de uma string (proibidas em JSON).
// Só é chamado DEPOIS de um JSON.parse ter falhado; nunca no caminho feliz.
// Como só roda sobre entrada já inválida, remover "-" antes de aspas em posição
// de elemento de array nunca pode corromper um JSON que era válido.
// Faz o JSON.parse do texto bruto do modelo, com uma segunda tentativa via
// repairJson() antes de desistir. Extraído de generateAnalysis para ser
// reutilizado por qualquer chamada ao Gemini que espere JSON (análise de
// imagem e Modo Foco) — mesma tolerância a defeito, um só lugar.
export function parseModelJson(text) {
  if (!text) {
    throw new GeminiError("BAD_JSON", "Resposta vazia do serviço de análise.");
  }
  try {
    return JSON.parse(text);
  } catch {
    try {
      return JSON.parse(repairJson(text));
    } catch {
      throw new GeminiError("BAD_JSON", "Resposta do serviço de análise em formato inválido.");
    }
  }
}

export function repairJson(input) {
  // 1) "[ - "x"" ou ", - "x"" -> remove o marcador de lista
  const text = String(input).replace(/([[,]\s*)-\s+(?=")/g, "$1");

  // 2) escapa controles crus dentro de strings
  let out = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (!inString) {
      out += ch;
      if (ch === '"') inString = true;
      continue;
    }
    if (escaped) {
      out += ch;
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      out += ch;
      escaped = true;
      continue;
    }
    if (ch === '"') {
      out += ch;
      inString = false;
      continue;
    }
    if (ch === "\n") { out += "\\n"; continue; }
    if (ch === "\r") { out += "\\r"; continue; }
    if (ch === "\t") { out += "\\t"; continue; }
    out += ch;
  }
  return out;
}

let client = null;
function getClient() {
  if (!isConfigured()) {
    throw new GeminiError("MISSING_KEY", "GEMINI_API_KEY não configurada.");
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

// Chamada de baixo nível ao Gemini, comum a qualquer fluxo que precise de uma
// resposta em texto (JSON ou não) — extraído de generateAnalysis para ser
// reutilizado pelo Modo Foco sem duplicar abort/timeout/config. Mantém o
// `config` idêntico ao original: SEM responseSchema (decisão documentada
// abaixo), mesmo timeout de 55s.
// @param {{ systemInstruction: string, parts: object[], model?: string }} params
// @returns {Promise<string>} texto bruto da resposta
async function requestJson({ systemInstruction, parts, model }) {
  const ai = getClient();
  const resolvedModel = model || process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await ai.models.generateContent({
      model: resolvedModel,
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction,
        // Sem responseSchema por design: com o schema completo do Study Vision,
        // a geração com saída restrita ficou instável (observado em teste: 503/timeout
        // recorrentes, >130s). O formato exato de campos já vai no próprio prompt
        // e é validado depois pelo endpoint que chamou.
        responseMimeType: "application/json",
        abortSignal: controller.signal,
      },
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new GeminiError("UPSTREAM", "Tempo limite ao contatar o serviço de análise.");
    }
    throw new GeminiError("UPSTREAM", err?.message || "Falha ao contatar o serviço de análise.");
  } finally {
    clearTimeout(timer);
  }

  return response?.text;
}

/**
 * Envia a imagem para o Gemini e retorna o objeto de análise já parseado.
 * `preferences` (Modo Inclusão) só muda a APRESENTAÇÃO do conteúdo — ver
 * buildAnalysisPrompt. Ausente ou vazio => prompt idêntico ao legado.
 * @param {{ mimeType: string, base64Data: string, preferences?: object }} params
 * @returns {Promise<object>}
 */
export async function generateAnalysis({ mimeType, base64Data, preferences }) {
  const prompt = buildAnalysisPrompt(preferences);
  const text = await requestJson({
    systemInstruction: SYSTEM_INSTRUCTION,
    parts: [
      { text: prompt },
      { inlineData: { mimeType, data: base64Data } },
    ],
  });
  return parseModelJson(text);
}

/**
 * Envia o prompt do Modo Foco (já montado por buildFocusPrompt) ao Gemini e
 * retorna o plano de sessão já parseado. Nunca recebe imagem — o material
 * acadêmico já foi extraído anteriormente pela análise da câmera.
 * @param {{ prompt: string }} params
 * @returns {Promise<object>}
 */
export async function generateFocusPlan({ prompt }) {
  const text = await requestJson({
    systemInstruction: FOCUS_SYSTEM_INSTRUCTION,
    parts: [{ text: prompt }],
  });
  return parseModelJson(text);
}

/**
 * "Outro jeito" (Etapa 2) — reexplica um único step já em tela. Payload
 * mínimo (título + conteúdo do step + preferências), nunca imagem, nunca o
 * Content inteiro, nunca histórico — não é um chat.
 * @param {{ prompt: string }} params
 * @returns {Promise<object>}
 */
export async function generateRephrase({ prompt }) {
  const text = await requestJson({
    systemInstruction: REPHRASE_SYSTEM_INSTRUCTION,
    parts: [{ text: prompt }],
  });
  return parseModelJson(text);
}
