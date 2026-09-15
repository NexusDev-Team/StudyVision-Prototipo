// Orquestração do Modo Foco: pega um Content já existente, soma tempo
// disponível + preferências do Modo Inclusão, pede ao backend uma sessão
// guiada, normaliza a resposta e persiste. Espelha o desenho de
// studyVisionService.js (mesma separação rede/normalização/erro), mas nunca
// envia imagem — o material acadêmico já foi extraído antes.

import { getContent } from "./contentService.js";
import { getActiveFocusSession, persistFocusSession } from "./focusSessionService.js";
import { getPreferenceOptions } from "./learningPreferencesService.js";
import { createFocusSession } from "../data/models/focusSession.js";
import { validateFocusSession } from "../data/models/validate.js";
import { FOCUS_DURATIONS, FOCUS_STEP_TYPES, FOCUS_STEP_BOUNDS } from "../constants.js";

// kind: "not_found" (content inexistente) | "insufficient_content" (content
// sem informação acadêmica suficiente) | "invalid_duration" (fora de
// FOCUS_DURATIONS) | "network" (falha de conexão) | "upstream" (erro HTTP do
// endpoint) | "invalid_plan" (resposta do Gemini não normalizável).
export class FocusError extends Error {
  constructor(message, kind = "technical") {
    super(message);
    this.kind = kind;
  }
}

export function isDurationSupported(durationMinutes) {
  return FOCUS_DURATIONS.includes(durationMinutes);
}

// Payload acadêmico ENXUTO enviado ao backend — exatamente estes 8 campos.
// Nunca imagens, attempts, mastery, reviews, notes ou qualquer outro dado do
// Content: o Gemini só precisa do que é relevante para montar a sessão.
export function buildFocusPayload(content) {
  return {
    title: content?.title || "",
    subject: content?.subjectName || "",
    topic: content?.topic || "",
    summary: content?.summary || "",
    keyConcepts: Array.isArray(content?.keyConcepts) ? content.keyConcepts : [],
    keywords: Array.isArray(content?.keywords) ? content.keywords : [],
    extractedText: content?.extractedText || "",
    difficulty: content?.difficulty || null,
  };
}

// Barreira "conteúdo sem informação suficiente" — roda ANTES do fetch, para
// nunca gastar uma chamada ao Gemini com um Content vazio.
export function hasEnoughContent(payload) {
  return Boolean(
    (payload?.title && payload.title.trim()) ||
      (payload?.summary && payload.summary.trim()) ||
      (payload?.extractedText && payload.extractedText.trim())
  );
}

const GENERIC_ERROR = "Não foi possível gerar a sessão de foco agora. Tente novamente.";

// Transporte padrão de produção — fetch para o backend (que fala com o
// Gemini). Injetável em startFocusSession para testes offline.
export async function requestFocusPlan(payload, { durationMinutes, preferences, signal } = {}) {
  let response;
  try {
    response = await fetch("/api/focus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload, durationMinutes, preferences: preferences || null }),
      signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new FocusError("Sem conexão com a internet. Verifique sua rede e tente novamente.", "network");
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new FocusError(GENERIC_ERROR, "upstream");
  }

  if (!response.ok) {
    throw new FocusError(body?.error || GENERIC_ERROR, "upstream");
  }

  if (body.success === false) {
    throw new FocusError(body.error || "Não foi possível gerar uma sessão de foco útil a partir deste conteúdo.", "invalid_plan");
  }

  return body;
}

const MAX_TITLE_CHARS = 80;
const MAX_CONTENT_CHARS = 1200;

function normalizeRawStep(raw) {
  if (!raw || typeof raw !== "object") return null;
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const content = typeof raw.content === "string" ? raw.content.trim() : "";
  if (!title || !content) return null;
  return {
    type: FOCUS_STEP_TYPES.includes(raw.type) ? raw.type : "explanation",
    title: title.length > MAX_TITLE_CHARS ? title.slice(0, MAX_TITLE_CHARS) : title,
    content: content.length > MAX_CONTENT_CHARS ? content.slice(0, MAX_CONTENT_CHARS) : content,
  };
}

// Pura: transforma a resposta bruta do Gemini (já com success:true) numa
// FocusSession pronta para persistir. Gera TODOS os ids — nunca confia em id
// vindo do modelo. Lança FocusError("invalid_plan") em vez de devolver uma
// sessão inválida; quem chama nunca deve persistir o resultado sem passar
// por aqui.
export function normalizeFocusPlan(rawPlan, { contentId, durationMinutes, preferences } = {}) {
  if (!isDurationSupported(durationMinutes)) {
    throw new FocusError("Duração inválida.", "invalid_duration");
  }

  const rawSteps = Array.isArray(rawPlan?.steps) ? rawPlan.steps : null;
  if (!rawSteps) {
    throw new FocusError("Resposta inválida do serviço de foco.", "invalid_plan");
  }

  const steps = rawSteps.map(normalizeRawStep).filter(Boolean);
  const bound = FOCUS_STEP_BOUNDS[durationMinutes];

  if (steps.length < bound.min) {
    throw new FocusError("A sessão de foco gerada ficou incompleta.", "invalid_plan");
  }
  const trimmedSteps = steps.length > bound.max ? steps.slice(0, bound.max) : steps;

  const session = createFocusSession({
    contentId,
    durationMinutes,
    steps: trimmedSteps,
    inclusionPreferencesSnapshot: preferences,
  });

  const { valid, errors } = validateFocusSession(session);
  if (!valid) {
    throw new FocusError(`Sessão de foco inválida: ${errors.join("; ")}`, "invalid_plan");
  }

  return session;
}

// "Existe uma FocusSession em andamento para este Content?" — NUNCA chama
// Gemini. Usado tanto pela retomada dentro de startFocusSession quanto pela
// futura UI (Etapa 2) para decidir se mostra "continuar" ou "começar".
export function getOrResumeFocusSession(contentId) {
  return getActiveFocusSession(contentId);
}

// Protege contra duplo clique / geração simultânea para o mesmo content+duração:
// enquanto uma geração está em voo, uma segunda chamada devolve a MESMA
// Promise em vez de disparar uma nova requisição.
const inFlight = new Map();

// Ponto de entrada único da UI. opts.transport (default requestFocusPlan) é
// injetável para testes offline. Nunca chama o transporte se já existir uma
// sessão em andamento para o content — regra crítica de retomada.
export async function startFocusSession(contentId, durationMinutes, opts = {}) {
  const active = getActiveFocusSession(contentId);
  if (active) {
    return { session: active, resumed: true };
  }

  const key = `${contentId}:${durationMinutes}`;
  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const transport = opts.transport || requestFocusPlan;

  const promise = (async () => {
    if (!isDurationSupported(durationMinutes)) {
      throw new FocusError("Duração inválida.", "invalid_duration");
    }

    const content = getContent(contentId);
    if (!content) {
      throw new FocusError("Conteúdo não encontrado.", "not_found");
    }

    const payload = buildFocusPayload(content);
    if (!hasEnoughContent(payload)) {
      throw new FocusError("Este conteúdo ainda não tem informação suficiente para gerar uma sessão de foco.", "insufficient_content");
    }

    const preferences = getPreferenceOptions();

    const rawPlan = await transport(payload, { durationMinutes, preferences, signal: opts.signal });
    const session = normalizeFocusPlan(rawPlan, { contentId, durationMinutes, preferences });
    persistFocusSession(session);

    return { session, resumed: false };
  })();

  inFlight.set(key, promise);
  try {
    return await promise;
  } finally {
    inFlight.delete(key);
  }
}
