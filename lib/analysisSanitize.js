// Validação e saneamento em dois níveis da resposta bruta do Gemini para
// /api/analyze — separado de api/analyze.js para ser reutilizável pelo
// endpoint de complemento em segundo plano (api/analyze-extras.js).
//
// Núcleo (subject/topic/title/summary/keyConcepts/extractedText): não aceita
// degradação. Se topic ou summary vierem vazios, validateCore reprova a
// resposta inteira para que o laço de retry de lib/gemini.js gere de novo —
// bem diferente do comportamento antigo, que já mandava um 502 de primeira.
//
// Secundário (flashcards/quiz/openQuestions): degradável. sanitizeExtras
// filtra só os itens inválidos em vez de descartar a resposta inteira; o que
// sobrar vazio entra em `partial` para ser completado depois (ver Bloco 8).

// `result.success === false` é um resultado VÁLIDO (a IA decidiu que a
// imagem não tem conteúdo acadêmico) — nunca deve disparar retry.
export function validateCore(result) {
  if (!result || typeof result !== "object") {
    return "Resposta do serviço de análise não é um objeto.";
  }
  if (result.success === false) return true;

  const hasTopic = typeof result.topic === "string" && result.topic.trim().length > 0;
  const hasSummary = typeof result.summary === "string" && result.summary.trim().length > 0;
  if (!hasTopic || !hasSummary) {
    return "Resposta da IA sem os campos essenciais (tópico/resumo).";
  }
  return true;
}

// Converte uma resposta de quiz variante ("answer" como string numérica,
// letra "B", ou só "correct") no índice inteiro esperado. Retorna null
// quando a questão não tem como ser aproveitada (sem options, índice fora
// do range) — o item é então descartado por sanitizeExtras, não a resposta
// inteira.
function sanitizeQuizQuestion(q) {
  if (!q || typeof q !== "object" || !Array.isArray(q.options) || q.options.length === 0) return null;

  let answer = q.answer;
  if (typeof answer === "string") {
    const trimmed = answer.trim();
    if (/^\d+$/.test(trimmed)) {
      answer = Number(trimmed);
    } else if (/^[a-zA-Z]$/.test(trimmed)) {
      answer = trimmed.toUpperCase().charCodeAt(0) - 65; // "A" -> 0, "B" -> 1, ...
    } else {
      answer = undefined;
    }
  }
  if (!Number.isInteger(answer) && Number.isInteger(q.correct)) {
    answer = q.correct;
  }
  if (!Number.isInteger(answer) || answer < 0 || answer >= q.options.length) return null;

  return { ...q, answer };
}

function sanitizeFlashcard(f) {
  if (!f || typeof f !== "object") return null;
  const question = typeof f.question === "string" ? f.question.trim() : "";
  const answer = typeof f.answer === "string" ? f.answer.trim() : "";
  if (!question || !answer) return null;
  return { ...f, question, answer };
}

function sanitizeOpenQuestion(q) {
  const text = typeof q === "string" ? q : q?.question;
  return typeof text === "string" && text.trim() ? text : null;
}

// Aplica defaults ao núcleo (subject/title/keyConcepts — já garantidos não
// vazios em topic/summary por validateCore) e filtra o secundário item a
// item. Nunca lança: itens ruins somem, não derrubam a resposta.
// @returns {{ result: object, partial: string[] }}
export function sanitizeExtras(result) {
  const out = { ...result };

  out.subject = typeof result.subject === "string" && result.subject.trim() ? result.subject.trim() : "Geral";
  out.title = typeof result.title === "string" && result.title.trim() ? result.title.trim() : out.topic;
  out.keyConcepts = Array.isArray(result.keyConcepts) ? result.keyConcepts : [];

  out.flashcards = Array.isArray(result.flashcards) ? result.flashcards.map(sanitizeFlashcard).filter(Boolean) : [];
  out.openQuestions = Array.isArray(result.openQuestions) ? result.openQuestions.map(sanitizeOpenQuestion).filter(Boolean) : [];
  out.quiz = Array.isArray(result.quiz) ? result.quiz.map(sanitizeQuizQuestion).filter(Boolean) : [];

  const partial = [];
  if (out.quiz.length === 0) partial.push("quiz");
  if (out.flashcards.length === 0) partial.push("flashcards");
  if (out.openQuestions.length === 0) partial.push("openQuestions");

  return { result: out, partial };
}
