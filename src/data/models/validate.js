// Validação antes de persistir — nunca confiar cegamente em dados vindos da
// IA ou de uma migração. Retorna { valid, errors[] } em vez de lançar, para
// que o chamador decida (aplicar defaults, rejeitar, logar) sem quebrar o app.

import { EVENT_TYPES } from "./event.js";

export function validateContent(content) {
  const errors = [];

  if (!content || typeof content !== "object") {
    return { valid: false, errors: ["conteúdo ausente ou inválido"] };
  }
  if (!content.id || typeof content.id !== "string") {
    errors.push("id ausente");
  }
  if (!content.title || !String(content.title).trim()) {
    errors.push("título ausente");
  }
  if (!content.subjectId && !content.subjectName) {
    errors.push("matéria ausente (subjectId ou subjectName)");
  }
  if (content.recommendedDifficulty != null && !["easy", "medium", "hard"].includes(content.recommendedDifficulty)) {
    errors.push("recommendedDifficulty inválido");
  }
  for (const field of ["images", "flashcards", "quizzes", "openQuestions", "keyConcepts", "keywords"]) {
    if (!Array.isArray(content[field])) {
      errors.push(`${field} deveria ser um array`);
    }
  }

  (content.images || []).forEach((img, i) => {
    if (!img.id) errors.push(`imagem[${i}] sem id`);
    if (img.contentId !== content.id) errors.push(`imagem[${i}] não referencia o content correto`);
  });

  (content.flashcards || []).forEach((fc, i) => {
    if (!fc.id) errors.push(`flashcard[${i}] sem id`);
    if (fc.contentId !== content.id) errors.push(`flashcard[${i}] não referencia o content correto`);
  });

  (content.quizzes || []).forEach((qz, i) => {
    if (!qz.id) errors.push(`quiz[${i}] sem id`);
    if (qz.contentId !== content.id) errors.push(`quiz[${i}] não referencia o content correto`);
    (qz.questions || []).forEach((q, j) => {
      if (!q.id) errors.push(`quiz[${i}].questions[${j}] sem id`);
      if (q.type === "mc" && !Number.isInteger(q.correctAnswer)) {
        errors.push(`quiz[${i}].questions[${j}] (mc) precisa de correctAnswer inteiro`);
      }
      if (q.type === "vf" && typeof q.correctAnswer !== "boolean") {
        errors.push(`quiz[${i}].questions[${j}] (vf) precisa de correctAnswer booleano`);
      }
      if (q.type === "mc" && (!Array.isArray(q.options) || q.options.length === 0)) {
        errors.push(`quiz[${i}].questions[${j}] (mc) precisa de options`);
      }
    });
  });

  return { valid: errors.length === 0, errors };
}

export function validateSubject(subject) {
  const errors = [];
  if (!subject || typeof subject !== "object") return { valid: false, errors: ["matéria ausente ou inválida"] };
  if (!subject.id) errors.push("id ausente");
  if (!subject.name || !String(subject.name).trim()) errors.push("nome ausente");
  return { valid: errors.length === 0, errors };
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validateEvent(event) {
  const errors = [];
  if (!event || typeof event !== "object") return { valid: false, errors: ["evento ausente ou inválido"] };
  if (!event.id) errors.push("id ausente");
  if (!event.title || !String(event.title).trim()) errors.push("título ausente");
  if (!EVENT_TYPES.includes(event.type)) errors.push("tipo inválido");
  if (!event.date || !DATE_RE.test(event.date)) errors.push("data ausente ou em formato inválido (esperado YYYY-MM-DD)");
  if (!Array.isArray(event.contentIds)) errors.push("contentIds deveria ser um array");
  return { valid: errors.length === 0, errors };
}
