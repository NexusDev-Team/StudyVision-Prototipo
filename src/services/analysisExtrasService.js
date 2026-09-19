// Comunicação do frontend com /api/analyze-extras (completa quiz/flashcards/
// openQuestions que ficaram vazios na análise inicial, ver
// lib/analysisSanitize.js). Espelha analyzeImage/AnalysisError, mas falhas
// aqui nunca chegam à tela de erro — o usuário já tem o núcleo (resumo,
// tópico, conceitos); o pior caso é o material de apoio continuar incompleto
// (ver useAnalysisExtras.js).
import { createContent } from "../data/models/content.js";
import { mapFlashcards, mapQuizzes, mapOpenQuestions } from "./studyVisionService.js";

export class AnalysisExtrasError extends Error {
  constructor(message, kind = "technical") {
    super(message);
    this.kind = kind;
  }
}

const GENERIC_ERROR = "Não foi possível completar o material agora.";
// Complemento é só texto (sem imagem) — bem mais rápido que a análise
// principal; um teto menor evita segurar a UI de fundo por muito tempo.
const CLIENT_TIMEOUT_MS = 45000;

function withClientTimeout(callerSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  const onCallerAbort = () => controller.abort();
  callerSignal?.addEventListener("abort", onCallerAbort);
  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timer);
      callerSignal?.removeEventListener("abort", onCallerAbort);
    },
  };
}

/**
 * @param {{ topic: string, summary: string, extractedText?: string, missing: string[], preferences?: object, signal?: AbortSignal }} params
 * @returns {Promise<object>} body de /api/analyze-extras ({ success, quiz?, flashcards?, openQuestions?, partial })
 */
export async function requestExtras({ topic, summary, extractedText, missing, preferences, signal }) {
  const { signal: fetchSignal, cleanup } = withClientTimeout(signal);
  let response;
  try {
    response = await fetch("/api/analyze-extras", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, summary, extractedText, missing, preferences: preferences || null }),
      signal: fetchSignal,
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new AnalysisExtrasError("Sem conexão com a internet.", "network");
  } finally {
    cleanup();
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new AnalysisExtrasError(GENERIC_ERROR, "technical");
  }

  if (!response.ok || body.success === false) {
    throw new AnalysisExtrasError(body?.error || GENERIC_ERROR, "server");
  }

  return body;
}

// Aplica só as seções que vieram com conteúdo de verdade — nunca sobrescreve
// com vazio (uma falha parcial do complemento não pode apagar o que já
// existia). Reusa createContent para gerar ids/contentId consistentes com o
// resto do Content, exatamente como a análise inicial faz.
export function mergeExtrasIntoContent(content, extrasResult) {
  if (!content || !extrasResult) return content;

  const patch = {};
  if (Array.isArray(extrasResult.flashcards) && extrasResult.flashcards.length > 0) {
    patch.flashcards = mapFlashcards(extrasResult.flashcards);
  }
  if (Array.isArray(extrasResult.quiz) && extrasResult.quiz.length > 0) {
    patch.quizzes = mapQuizzes(extrasResult.quiz);
  }
  if (Array.isArray(extrasResult.openQuestions) && extrasResult.openQuestions.length > 0) {
    patch.openQuestions = mapOpenQuestions(extrasResult.openQuestions);
  }
  if (Object.keys(patch).length === 0) return content;

  return createContent({ ...content, ...patch });
}
