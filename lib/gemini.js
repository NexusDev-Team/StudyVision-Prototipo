// Centraliza configuração e comunicação com a Gemini API.
// Único ponto do backend que conhece o SDK do Gemini — troca de modelo/provedor
// futuramente não deve exigir mudanças em api/analyze.js.

import { GoogleGenAI } from "@google/genai";
import { SYSTEM_INSTRUCTION, buildAnalysisPrompt } from "./prompts.js";
import { FOCUS_SYSTEM_INSTRUCTION } from "./focusPrompts.js";
import { REPHRASE_SYSTEM_INSTRUCTION } from "./rephrasePrompts.js";
import { READING_HELP_SYSTEM_INSTRUCTION } from "./readingHelpPrompts.js";
import { PHOTO_TEXT_SYSTEM_INSTRUCTION, PHOTO_TEXT_PROMPT } from "./photoTextPrompts.js";

const DEFAULT_MODEL = "gemini-flash-lite-latest";
// Prompts do Modo Inclusão com várias necessidades ativas geram saída maior e
// mais lenta (observado: até ~25s). Cada tentativa individual usa esse teto;
// o orçamento TOTAL_BUDGET_MS abaixo governa quantas tentativas cabem sob o
// maxDuration=60 da Vercel (vercel.json) sem estourar a função.
const ATTEMPT_TIMEOUT_MS = 26000;
const TOTAL_BUDGET_MS = 52000;
const MAX_ATTEMPTS = 3;
const BACKOFF_BASE_MS = 600;
const BACKOFF_STEP_MS = 1500;

export class GeminiError extends Error {
  constructor(code, message, { attempts, failureKind } = {}) {
    super(message);
    this.code = code; // "MISSING_KEY" | "UPSTREAM" | "BAD_JSON"
    this.attempts = attempts || 1;
    this.failureKind = failureKind || "permanent"; // "transient" | "permanent"
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Classifica uma falha do SDK do Gemini (ou do timeout local) como transitória
// (vale a pena retentar) ou permanente (retentar não muda o resultado — chave
// inválida, requisição malformada). Sem responseSchema, o modelo lite emite
// 429/503/UNAVAILABLE com frequência sob carga — é exatamente o caso em que o
// retry manual do usuário "funciona, e rápido" hoje.
const TRANSIENT_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const TRANSIENT_MESSAGE_RE = /unavailable|resource_exhausted|deadline_exceeded|fetch failed|econnreset|socket hang up|network/i;

export function classifyFailure(err) {
  if (err?.name === "AbortError") return "transient"; // timeout da tentativa
  const status = typeof err?.status === "number" ? err.status : typeof err?.statusCode === "number" ? err.statusCode : null;
  if (status != null) return TRANSIENT_STATUS_CODES.has(status) ? "transient" : "permanent";
  if (TRANSIENT_MESSAGE_RE.test(err?.message || "")) return "transient";
  return "permanent";
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

// Uma única tentativa de chamada ao Gemini, com timeout próprio. Extraída do
// laço de retentativa de requestJson para manter cada tentativa isolada (seu
// próprio AbortController, seu próprio timer).
async function attemptRequest({ ai, resolvedModel, systemInstruction, parts, externalSignal }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);
  const onExternalAbort = () => controller.abort();
  externalSignal?.addEventListener("abort", onExternalAbort);

  try {
    const response = await ai.models.generateContent({
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
    return response;
  } finally {
    clearTimeout(timer);
    externalSignal?.removeEventListener("abort", onExternalAbort);
  }
}

// Chamada ao Gemini, comum a qualquer fluxo que precise de uma resposta em
// texto (JSON ou não) — extraído de generateAnalysis para ser reutilizado
// pelo Modo Foco, Ler Comigo e Extrair Texto sem duplicar abort/timeout/retry.
//
// Retenta até MAX_ATTEMPTS vezes, só em falha classificada como transitória
// (classifyFailure) e só enquanto sobrar orçamento (TOTAL_BUDGET_MS) — é o
// que hoje o usuário faz manualmente ao clicar "Tentar novamente" e a análise
// "funcionar, e rápido": a maioria das falhas do modelo lite é passageira.
// @param {{ systemInstruction: string, parts: object[], model?: string, signal?: AbortSignal }} params
// @returns {Promise<string>} texto bruto da resposta
async function requestJson({ systemInstruction, parts, model, signal }) {
  const ai = getClient();
  const resolvedModel = model || process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const startedAt = Date.now();

  let lastErr = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (signal?.aborted) {
      throw new GeminiError("UPSTREAM", "Análise cancelada.", { attempts: attempt - 1, failureKind: "permanent" });
    }

    let response;
    try {
      response = await attemptRequest({ ai, resolvedModel, systemInstruction, parts, externalSignal: signal });
    } catch (err) {
      const failureKind = signal?.aborted ? "permanent" : classifyFailure(err);
      lastErr = err;
      const isTimeout = err?.name === "AbortError" && !signal?.aborted;
      const message = signal?.aborted
        ? "Análise cancelada."
        : isTimeout
          ? "Tempo limite ao contatar o serviço de análise."
          : err?.message || "Falha ao contatar o serviço de análise.";

      const elapsed = Date.now() - startedAt;
      const remaining = TOTAL_BUDGET_MS - elapsed;
      const canRetry = failureKind === "transient" && attempt < MAX_ATTEMPTS && remaining > ATTEMPT_TIMEOUT_MS / 2;
      if (!canRetry) {
        throw new GeminiError("UPSTREAM", message, { attempts: attempt, failureKind });
      }
      const backoff = BACKOFF_BASE_MS * attempt + Math.random() * BACKOFF_STEP_MS;
      await sleep(Math.min(backoff, Math.max(remaining - ATTEMPT_TIMEOUT_MS, 0)));
      continue;
    }

    return response?.text;
  }

  // Só alcançável se MAX_ATTEMPTS === 0 (não é o caso) — guarda defensiva.
  throw new GeminiError("UPSTREAM", lastErr?.message || "Falha ao contatar o serviço de análise.", { attempts: MAX_ATTEMPTS, failureKind: "transient" });
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

/**
 * Auxílio contextual do Ler Comigo (Etapa 3) — "Me perdi" (mode: "lost") e
 * "Outro jeito" (mode: "rephrase") em uma única operação. Payload sempre
 * pequeno (trecho atual + até 2 trechos anteriores de contexto), nunca
 * imagem, nunca o Content inteiro, nunca histórico — não é um chat.
 * @param {{ prompt: string }} params
 * @returns {Promise<object>}
 */
export async function generateReadingHelp({ prompt }) {
  const text = await requestJson({
    systemInstruction: READING_HELP_SYSTEM_INSTRUCTION,
    parts: [{ text: prompt }],
  });
  return parseModelJson(text);
}

/**
 * Extração de texto de UMA foto (feature "Extrair texto" no visualizador).
 * Chamada separada de generateAnalysis: prompt de transcrição fiel, sem Modo
 * Inclusão (o texto extraído representa o conteúdo original da imagem, não
 * uma versão adaptada — ver PHOTO_TEXT_PROMPT). Sob demanda, nunca automática.
 * @param {{ mimeType: string, base64Data: string }} params
 * @returns {Promise<object>}
 */
export async function extractPhotoText({ mimeType, base64Data }) {
  const text = await requestJson({
    systemInstruction: PHOTO_TEXT_SYSTEM_INSTRUCTION,
    parts: [
      { text: PHOTO_TEXT_PROMPT },
      { inlineData: { mimeType, data: base64Data } },
    ],
  });
  return parseModelJson(text);
}
