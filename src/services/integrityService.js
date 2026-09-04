// Varredura de integridade — remove tentativas e revisões que sobraram
// apontando para um conteúdo inexistente (ex.: dado corrompido, migração
// incompleta). Não substitui o cascade de contentService.deleteContent, que
// já limpa tudo no momento da exclusão; isto é uma rede de segurança extra,
// rodada uma vez ao iniciar o app.

import { readDb, withDb } from "../data/storage/index.js";

export function sweepOrphans() {
  const removed = { reviews: 0, flashcardAttempts: 0, quizAttempts: 0 };
  withDb((db) => {
    const contentIds = new Set(db.contents.map((c) => c.id));

    const reviews = db.reviews.filter((r) => contentIds.has(r.contentId));
    removed.reviews = db.reviews.length - reviews.length;

    const flashcardAttempts = db.flashcardAttempts.filter((a) => contentIds.has(a.contentId) && a.flashcardId);
    removed.flashcardAttempts = db.flashcardAttempts.length - flashcardAttempts.length;

    const quizAttempts = db.quizAttempts.filter((a) => contentIds.has(a.contentId) && a.quizId);
    removed.quizAttempts = db.quizAttempts.length - quizAttempts.length;

    if (removed.reviews === 0 && removed.flashcardAttempts === 0 && removed.quizAttempts === 0) return db;
    return { ...db, reviews, flashcardAttempts, quizAttempts };
  });
  return removed;
}
