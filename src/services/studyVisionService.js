// Comunicação do frontend com o backend de análise (Gemini fica atrás de /api/analyze).
// Nunca guarda nem conhece nenhuma chave de API — só fala com nosso próprio endpoint.
import { createContent } from "../data/models/content.js";
import { validateContent } from "../data/models/validate.js";

// kind: "technical" (rede, timeout, erro do servidor, resposta malformada) ou
// "not_academic" (a IA rodou e concluiu que a imagem não tem conteúdo de estudo).
export class AnalysisError extends Error {
  constructor(message, kind = "technical") {
    super(message);
    this.kind = kind;
  }
}

const GENERIC_ERROR = "Não foi possível analisar a imagem agora. Tente novamente.";

/**
 * Envia a foto capturada para /api/analyze e retorna o resultado bruto da IA.
 * @param {string} imageDataUrl - data:image/jpeg;base64,...
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function analyzeImage(imageDataUrl, opts = {}) {
  let response;
  try {
    response = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ image: imageDataUrl }),
      signal: opts.signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new AnalysisError("Sem conexão com a internet. Verifique sua rede e tente novamente.", "technical");
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new AnalysisError(GENERIC_ERROR, "technical");
  }

  if (!response.ok) {
    throw new AnalysisError(body?.error || GENERIC_ERROR, "technical");
  }

  // success:false com HTTP 200 = a IA rodou e decidiu que não há conteúdo
  // acadêmico legível na imagem — não é uma falha técnica.
  if (body.success === false) {
    throw new AnalysisError(body.error || "Não foi possível identificar o conteúdo da imagem com segurança.", "not_academic");
  }

  return body;
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
 * @returns {{ content: object, validation: { valid: boolean, errors: string[] } }}
 */
export function normalizeAnalysisResult(geminiResponse, thumbnailDataUrl) {
  const result = geminiResponse && typeof geminiResponse === "object" ? geminiResponse : {};

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
    flashcards: Array.isArray(result.flashcards)
      ? result.flashcards.map((f) => ({ front: f.question || "", back: f.answer || "", source: "ai" }))
      : [],
    quizzes:
      Array.isArray(result.quiz) && result.quiz.length > 0
        ? [
            {
              source: "ai",
              questions: result.quiz.map((q) => ({
                type: q.type === "vf" ? "vf" : "mc",
                question: q.question || "",
                options: Array.isArray(q.options) ? q.options : [],
                correctAnswer: q.answer,
                explanation: q.explanation || "",
              })),
            },
          ]
        : [],
    openQuestions: Array.isArray(result.openQuestions) ? result.openQuestions : [],
  });

  return { content, validation: validateContent(content) };
}
