// Centraliza configuração e comunicação com a Gemini API.
// Único ponto do backend que conhece o SDK do Gemini — troca de modelo/provedor
// futuramente não deve exigir mudanças em api/analyze.js.

import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION, ANALYSIS_PROMPT } from "./prompts.js";

const DEFAULT_MODEL = "gemini-flash-lite-latest";
const REQUEST_TIMEOUT_MS = 45000;

export class GeminiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code; // "MISSING_KEY" | "UPSTREAM" | "BAD_JSON"
  }
}

export function isConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
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

/**
 * Envia a imagem para o Gemini e retorna o objeto de análise já parseado.
 * @param {{ mimeType: string, base64Data: string }} params
 * @returns {Promise<object>}
 */
export async function generateAnalysis({ mimeType, base64Data }) {
  const ai = getClient();
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await ai.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { text: ANALYSIS_PROMPT },
            { inlineData: { mimeType, data: base64Data } },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        // Sem responseSchema por design: com o schema completo do Study Vision,
        // a geração com saída restrita ficou instável (observado em teste: 503/timeout
        // recorrentes, >130s). O formato exato de campos já vai no próprio prompt
        // (ver ANALYSIS_PROMPT) e é validado depois em api/analyze.js.
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

  const text = response?.text;
  if (!text) {
    throw new GeminiError("BAD_JSON", "Resposta vazia do serviço de análise.");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new GeminiError("BAD_JSON", "Resposta do serviço de análise em formato inválido.");
  }
}
