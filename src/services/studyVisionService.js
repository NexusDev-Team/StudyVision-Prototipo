// Comunicação do frontend com o backend de análise (Gemini fica atrás de /api/analyze).
// Nunca guarda nem conhece nenhuma chave de API — só fala com nosso próprio endpoint.
import { getSubjectMeta, getSubjectEmoji } from "../constants";

export class AnalysisError extends Error {}

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
    throw new AnalysisError("Sem conexão com a internet. Verifique sua rede e tente novamente.");
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new AnalysisError(GENERIC_ERROR);
  }

  if (!response.ok) {
    throw new AnalysisError(body?.error || GENERIC_ERROR);
  }

  if (body.success === false) {
    throw new AnalysisError(body.error || "Não foi possível identificar o conteúdo da imagem com segurança.");
  }

  return body;
}

/**
 * Converte o resultado da API no formato de item já usado pelo restante do app
 * (mesma forma de src/data/sampleContent.js), para reaproveitar todas as telas existentes.
 */
export function toStudyItem(result, thumbnailDataUrl) {
  const meta = getSubjectMeta(result.subject);
  return {
    subject: result.subject,
    subjectIcon: getSubjectEmoji(result.subject),
    subjectColor: meta.color,
    subjectBg: meta.bg,
    topic: result.topic,
    concept: result.title || result.topic,
    time: "Agora",
    photo: thumbnailDataUrl,
    extractedText: result.extractedText || "",
    summary: result.summary,
    concepts: result.keyConcepts || [],
    keywords: result.keywords || [],
    flashcards: (result.flashcards || []).map(f => ({ front: f.question, back: f.answer })),
    questions: result.openQuestions || [],
    quiz: (result.quiz || []).map(q => ({
      type: "mc",
      question: q.question,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
    })),
    difficulty: result.difficulty,
  };
}
