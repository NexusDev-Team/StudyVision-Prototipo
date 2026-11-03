// Comunicação do frontend com o backend de análise (Gemini fica atrás de /api/analyze).
// Nunca guarda nem conhece nenhuma chave de API — só fala com nosso próprio endpoint.
import { createContent } from "../data/models/content.js";
import { validateContent } from "../data/models/validate.js";
import { hasActivePreference, normalizePreferenceOptions } from "./learningPreferencesService.js";
import { newId } from "../utils/id.js";

// kind: "network" (fetch rejeitou — sem conexão), "timeout" (nosso próprio
// teto de cliente estourou), "server" (HTTP não-ok: 4xx/5xx do backend),
// "technical" (resposta OK mas ilegível — JSON quebrado) ou "not_academic"
// (a IA rodou e concluiu que a imagem não tem conteúdo de estudo).
export class AnalysisError extends Error {
  constructor(message, kind = "technical") {
    super(message);
    this.kind = kind;
  }
}

const GENERIC_ERROR = "Não foi possível analisar a imagem agora. Tente novamente.";
const NOT_ACADEMIC_FALLBACK = "Não foi possível identificar o conteúdo da imagem com segurança.";

// Acima do orçamento do servidor (TOTAL_BUDGET_MS=52s em lib/gemini.js, sob o
// maxDuration=60s da Vercel) — o cliente nunca desiste antes do backend ter
// chance de terminar suas próprias retentativas.
const CLIENT_TIMEOUT_MS = 70000;

const ERROR_MESSAGES = {
  network: "Sem conexão com a internet. Verifique sua rede e tente novamente.",
  timeout: "A análise está demorando mais do que o esperado. Tente novamente.",
  server: GENERIC_ERROR,
  technical: GENERIC_ERROR,
};

// Pura — nunca expõe err.message cru de uma exceção interna para a UI; o
// caso "server" é a exceção deliberada, porque ali err.message já é uma
// string curada pelo próprio backend (ex.: "Imagem muito grande."), não um
// erro de runtime — mesmo espírito de focusErrorMessage/readingHelpErrorMessage,
// adaptado a um fluxo cujo servidor já devolve mensagens prontas para o usuário.
export function analysisErrorMessage(err) {
  const kind = err instanceof AnalysisError ? err.kind : "technical";
  if (kind === "not_academic") return err?.message || NOT_ACADEMIC_FALLBACK;
  if (kind === "server" && err?.message) return err.message;
  return ERROR_MESSAGES[kind] || GENERIC_ERROR;
}

// Combina o AbortSignal do chamador (cancelamento explícito) com um teto de
// tempo próprio do cliente — sem isso, um /api/analyze pendurado nunca solta
// a tela de carregamento. `didTimeout()` só é confiável depois do signal
// combinado abortar: se o signal do chamador não abortou, foi o timeout.
function withClientTimeout(callerSignal) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  const onCallerAbort = () => controller.abort();
  callerSignal?.addEventListener("abort", onCallerAbort);
  return {
    signal: controller.signal,
    didTimeout: () => !callerSignal?.aborted,
    cleanup() {
      clearTimeout(timer);
      callerSignal?.removeEventListener("abort", onCallerAbort);
    },
  };
}

/**
 * Envia a foto capturada para /api/analyze e retorna o resultado bruto da IA
 * (sempre com `partial: string[]`, mesmo que o servidor não o inclua).
 * @param {string} imageDataUrl - data:image/jpeg;base64,...
 * @param {{ signal?: AbortSignal, preferences?: object }} [opts] - preferences
 *   são as preferências de aprendizagem (Modo Inclusão) desta captura; o
 *   servidor as sanitiza de novo. Ausente => análise padrão.
 */
export async function analyzeImage(imageDataUrl, opts = {}) {
  const { signal, didTimeout, cleanup } = withClientTimeout(opts.signal);
  // Correlaciona esta requisição com o log do servidor (Bloco 11) — o
  // requestId viaja no header, o servidor só o ecoa nos seus console.error.
  // Anexado a toda AnalysisError abaixo para aparecer, discreto, na tela de
  // erro (ver AnalysisScreen) quando o usuário precisar reportar uma falha.
  const requestId = newId("req");
  const withRequestId = (err) => {
    err.requestId = requestId;
    return err;
  };

  let response;
  try {
    response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-sv-request-id": requestId },
      body: JSON.stringify({ image: imageDataUrl, preferences: opts.preferences || null }),
      signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      // Cancelamento explícito do chamador (ex.: analysis.reset()) propaga
      // cru — não é uma AnalysisError, é o contrato de abort padrão.
      if (!didTimeout()) throw err;
      throw withRequestId(new AnalysisError(ERROR_MESSAGES.timeout, "timeout"));
    }
    throw withRequestId(new AnalysisError(ERROR_MESSAGES.network, "network"));
  } finally {
    cleanup();
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw withRequestId(new AnalysisError(GENERIC_ERROR, "technical"));
  }

  if (!response.ok) {
    throw withRequestId(new AnalysisError(body?.error || GENERIC_ERROR, "server"));
  }

  // success:false com HTTP 200 = a IA rodou e decidiu que não há conteúdo
  // acadêmico legível na imagem — não é uma falha técnica.
  if (body.success === false) {
    throw withRequestId(new AnalysisError(body.error || NOT_ACADEMIC_FALLBACK, "not_academic"));
  }

  return { ...body, partial: Array.isArray(body.partial) ? body.partial : [] };
}

/**
 * Converte o resultado bruto da API (`/api/analyze`, atrás dele o Gemini) num
 * Content válido do modelo de dados interno — gera todos os IDs, aplica
 * defaults para campos ausentes/parciais e nunca deixa a aplicação depender
 * da estrutura bruta da resposta da IA.
 *
 * Não resolve/gera Subject nem grava nada no storage: subjectId fica null e
 * subjectName carrega o nome cru vindo da IA — quem persiste (contentService
 * + subjectService) decide como resolver a matéria.
 *
 * @param {object} geminiResponse - body retornado por analyzeImage()
 * @param {string} [thumbnailDataUrl] - versão reduzida da foto, já pronta p/ persistir
 * @param {object} [preferences] - preferências de aprendizagem usadas nesta
 *   captura; gravadas no Content como rastro (null quando nenhuma ativa).
 * @returns {{ content: object, validation: { valid: boolean, errors: string[] } }}
 */
// Mapeamentos reaproveitados também pelo complemento em segundo plano
// (analysisExtrasService.js, Bloco 8): mesma conversão de "quiz"/"flashcards"
// crus da IA para o shape que createContent (flashcard.js/quiz.js) espera,
// não importa se vieram da análise inicial ou de /api/analyze-extras.
export function mapFlashcards(rawFlashcards) {
  return Array.isArray(rawFlashcards)
    ? rawFlashcards.map((f) => ({ front: f.question || "", back: f.answer || "", source: "ai" }))
    : [];
}

export function mapQuizzes(rawQuiz) {
  return Array.isArray(rawQuiz) && rawQuiz.length > 0
    ? [
        {
          source: "ai",
          questions: rawQuiz.map((q) => ({
            type: q.type === "vf" ? "vf" : "mc",
            question: q.question || "",
            options: Array.isArray(q.options) ? q.options : [],
            correctAnswer: q.answer,
            explanation: q.explanation || "",
          })),
        },
      ]
    : [];
}

export function mapOpenQuestions(rawOpenQuestions) {
  return Array.isArray(rawOpenQuestions) ? rawOpenQuestions : [];
}

export function normalizeAnalysisResult(geminiResponse, thumbnailDataUrl, preferences) {
  const result = geminiResponse && typeof geminiResponse === "object" ? geminiResponse : {};
  const learningPreferences = hasActivePreference(preferences)
    ? normalizePreferenceOptions(preferences)
    : null;

  const content = createContent({
    subjectId: null,
    subjectName: result.subject || "",
    topic: result.topic || "",
    title: result.title || result.topic || "Conteúdo sem título",
    extractedText: result.extractedText || "",
    summary: result.summary || "",
    keyConcepts: Array.isArray(result.keyConcepts) ? result.keyConcepts : [],
    keywords: Array.isArray(result.keywords) ? result.keywords : [],
    difficulty: result.difficulty || null,
    images: thumbnailDataUrl ? [{ dataUrl: thumbnailDataUrl, order: 0 }] : [],
    flashcards: mapFlashcards(result.flashcards),
    quizzes: mapQuizzes(result.quiz),
    openQuestions: mapOpenQuestions(result.openQuestions),
    learningPreferences,
  });

  return { content, validation: validateContent(content) };
}
