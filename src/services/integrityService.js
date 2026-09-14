// Varredura de integridade — remove tentativas e revisões que sobraram
// apontando para um conteúdo inexistente (ex.: dado corrompido, migração
// incompleta). Não substitui o cascade de contentService.deleteContent, que
// já limpa tudo no momento da exclusão; isto é uma rede de segurança extra,
// rodada uma vez ao iniciar o app.

import { withDb } from "../data/storage/index.js";

export function sweepOrphans() {
  const removed = { reviews: 0, flashcardAttempts: 0, quizAttempts: 0, eventContentRefs: 0, contentSubjectRefs: 0, focusSessions: 0 };
  withDb((db) => {
    const contentIds = new Set(db.contents.map((c) => c.id));
    const subjectIds = new Set(db.subjects.map((s) => s.id));

    const reviews = db.reviews.filter((r) => contentIds.has(r.contentId));
    removed.reviews = db.reviews.length - reviews.length;

    const flashcardAttempts = db.flashcardAttempts.filter((a) => contentIds.has(a.contentId) && a.flashcardId);
    removed.flashcardAttempts = db.flashcardAttempts.length - flashcardAttempts.length;

    const quizAttempts = db.quizAttempts.filter((a) => contentIds.has(a.contentId) && a.quizId);
    removed.quizAttempts = db.quizAttempts.length - quizAttempts.length;

    // Eventos podem existir sem nenhum conteúdo — aqui só tira o contentId
    // que não existe mais, sem apagar o evento em si.
    let eventContentRefs = 0;
    const events = db.events.map((e) => {
      const kept = e.contentIds.filter((cid) => contentIds.has(cid));
      if (kept.length === e.contentIds.length) return e;
      eventContentRefs += e.contentIds.length - kept.length;
      return { ...e, contentIds: kept };
    });
    removed.eventContentRefs = eventContentRefs;

    // Conteúdo cujo subjectId aponta para matéria inexistente cai no bucket
    // "Sem matéria" em vez de ficar com referência quebrada.
    let contentSubjectRefs = 0;
    const contents = db.contents.map((c) => {
      if (!c.subjectId || subjectIds.has(c.subjectId)) return c;
      contentSubjectRefs += 1;
      return { ...c, subjectId: null, subjectName: "" };
    });
    removed.contentSubjectRefs = contentSubjectRefs;

    const focusSessions = db.focusSessions.filter((s) => contentIds.has(s.contentId));
    removed.focusSessions = db.focusSessions.length - focusSessions.length;

    const nothingChanged =
      removed.reviews === 0 &&
      removed.flashcardAttempts === 0 &&
      removed.quizAttempts === 0 &&
      removed.eventContentRefs === 0 &&
      removed.contentSubjectRefs === 0 &&
      removed.focusSessions === 0;
    if (nothingChanged) return db;
    return { ...db, reviews, flashcardAttempts, quizAttempts, events, contents, focusSessions };
  });
  return removed;
}
