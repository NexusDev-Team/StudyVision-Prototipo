// Re-exportação de conveniência — as tentativas vivem junto do modelo a que
// se referem (flashcard.js / quiz.js) para manter cada arquivo autocontido,
// mas a Fase 1 do PLANO-FASE-1-DADOS.md lista "attempt.js" como arquivo
// próprio, então este módulo apenas agrega os dois construtores.
export { createFlashcardAttempt } from "./flashcard.js";
export { createQuizAttempt } from "./quiz.js";
