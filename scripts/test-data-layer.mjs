// Cenários da camada de dados do Study Vision — roda com `node`, sem framework.
//
//   node scripts/test-data-layer.mjs
//
// Usa um shim de localStorage em memória e exercita os serviços reais
// (contentService/subjectService/studyService/reviewService/eventService/
// performanceService) sobre sv_db. Cobre os 20 cenários do PLANO-FASE-1-DADOS
// mais migração-antes-de-escrita (B1) e propagação de erro de cota em imagem (B3).

import assert from "node:assert/strict";

// ─── shim de localStorage ────────────────────────────────────────────────────
class MemoryStorage {
  #map = new Map();
  failNextWrites = false; // simula QuotaExceededError

  getItem(key) {
    return this.#map.has(key) ? this.#map.get(key) : null;
  }
  setItem(key, value) {
    if (this.failNextWrites) {
      const err = new Error("simulated quota");
      err.name = "QuotaExceededError";
      throw err;
    }
    this.#map.set(key, String(value));
  }
  removeItem(key) {
    this.#map.delete(key);
  }
  clear() {
    this.#map.clear();
  }
  key(i) {
    return [...this.#map.keys()][i] ?? null;
  }
  get length() {
    return this.#map.size;
  }
}

const storage = new MemoryStorage();
globalThis.localStorage = storage;

function resetDb() {
  storage.clear();
  storage.failNextWrites = false;
}

// ─── mini runner ─────────────────────────────────────────────────────────────
let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    resetDb();
    fn();
    passed += 1;
    console.log(`  ok  ${name}`);
  } catch (err) {
    failed += 1;
    failures.push({ name, err });
    console.log(`FAIL  ${name}`);
    console.log(`      ${err.message}`);
  }
}

// ─── imports dos serviços (após o shim estar no lugar) ───────────────────────
const contentService = await import("../src/services/contentService.js");
const subjectService = await import("../src/services/subjectService.js");
const studyService = await import("../src/services/studyService.js");
const reviewService = await import("../src/services/reviewService.js");
const eventService = await import("../src/services/eventService.js");
const performanceService = await import("../src/services/performanceService.js");
const { readDb, withDb } = await import("../src/data/storage/index.js");
const validate = await import("../src/data/models/validate.js");
const integrityService = await import("../src/services/integrityService.js");
const { nowIso } = await import("../src/utils/date.js");
const { createEvent } = await import("../src/data/models/event.js");
const { matchesQuery } = await import("../src/utils/search.js");

// helper: cria um conteúdo mínimo já com matéria
function seedContent(overrides = {}) {
  const subject = subjectService.createSubjectEntry(overrides.subjectName || "Matemática");
  const { content } = contentService.createContentEntry({
    subjectId: subject.id,
    subjectName: subject.name,
    title: "Derivadas",
    summary: "Resumo inicial",
    keyConcepts: ["taxa de variação"],
    flashcards: [{ front: "f1", back: "b1" }, { front: "f2", back: "b2" }],
    quizzes: [
      {
        questions: [
          { type: "mc", question: "2+2?", options: ["3", "4"], correctAnswer: 1 },
          { type: "vf", question: "Verdadeiro?", correctAnswer: true },
        ],
      },
    ],
    openQuestions: ["O que é uma derivada?"],
    ...overrides,
  });
  return { subject, content };
}

// ─── cenários ────────────────────────────────────────────────────────────────

test("1. criar conteúdo persiste em sv_db", () => {
  const { content } = seedContent();
  assert.equal(contentService.getContents().length, 1);
  assert.equal(contentService.getContent(content.id).title, "Derivadas");
});

test("2. adicionar 1ª foto ao conteúdo", () => {
  const { content } = seedContent();
  const { image } = contentService.addImageToContent(content.id, { dataUrl: "data:image/jpeg;base64,AAA" });
  assert.ok(image.id);
  assert.equal(contentService.getContent(content.id).images.length, 1);
});

test("3. adicionar 2ª foto NÃO cria conteúdo novo", () => {
  const { content } = seedContent();
  contentService.addImageToContent(content.id, { dataUrl: "data:image/jpeg;base64,AAA" });
  contentService.addImageToContent(content.id, { dataUrl: "data:image/jpeg;base64,BBB" });
  assert.equal(contentService.getContents().length, 1);
  assert.equal(contentService.getContent(content.id).images.length, 2);
  assert.deepEqual(
    contentService.getContent(content.id).images.map((i) => i.order),
    [0, 1]
  );
});

test("4. editar título mantém o mesmo id", () => {
  const { content } = seedContent();
  const updated = contentService.updateContent(content.id, { title: "Integrais" });
  assert.equal(updated.id, content.id);
  assert.equal(contentService.getContent(content.id).title, "Integrais");
});

test("5. editar resumo não altera flashcards/quiz/imagens", () => {
  const { content } = seedContent();
  contentService.addImageToContent(content.id, { dataUrl: "data:image/jpeg;base64,AAA" });
  const before = contentService.getContent(content.id);
  contentService.updateContent(content.id, { summary: "Resumo revisado" });
  const after = contentService.getContent(content.id);
  assert.equal(after.summary, "Resumo revisado");
  assert.deepEqual(after.flashcards, before.flashcards);
  assert.deepEqual(after.quizzes, before.quizzes);
  assert.deepEqual(after.images, before.images);
});

test("6. anotações do usuário são gravadas separadas do resumo", () => {
  const { content } = seedContent();
  contentService.updateNotes(content.id, "minha anotação");
  const after = contentService.getContent(content.id);
  assert.equal(after.notes, "minha anotação");
  assert.equal(after.summary, "Resumo inicial");
});

test("7. flashcards do conteúdo têm id estável", () => {
  const { content } = seedContent();
  const fcs = contentService.getContent(content.id).flashcards;
  assert.equal(fcs.length, 2);
  assert.ok(fcs.every((fc) => fc.id && fc.contentId === content.id));
});

test("8. registrar acerto de flashcard (append)", () => {
  const { content } = seedContent();
  const fc = contentService.getContent(content.id).flashcards[0];
  studyService.recordFlashcardAttempt({ flashcardId: fc.id, contentId: content.id, correct: true });
  const { flashcardAttempts } = studyService.getAttemptsForContent(content.id);
  assert.equal(flashcardAttempts.length, 1);
  assert.equal(flashcardAttempts[0].correct, true);
});

test("9. acerto + erro = 2 tentativas, nada sobrescrito", () => {
  const { content } = seedContent();
  const fc = contentService.getContent(content.id).flashcards[0];
  studyService.recordFlashcardAttempt({ flashcardId: fc.id, contentId: content.id, correct: true });
  studyService.recordFlashcardAttempt({ flashcardId: fc.id, contentId: content.id, correct: false });
  const { flashcardAttempts } = studyService.getAttemptsForContent(content.id);
  assert.equal(flashcardAttempts.length, 2);
  assert.deepEqual(flashcardAttempts.map((a) => a.correct), [true, false]);
  assert.notEqual(flashcardAttempts[0].id, flashcardAttempts[1].id);
});

test("10. quiz do conteúdo tem id e questões identificadas", () => {
  const { content } = seedContent();
  const quiz = contentService.getContent(content.id).quizzes[0];
  assert.ok(quiz.id);
  assert.equal(quiz.questions.length, 2);
  assert.ok(quiz.questions.every((q) => q.id && q.quizId === quiz.id));
  assert.equal(quiz.questions[0].correctAnswer, 1); // valor semântico, não posição
  assert.equal(quiz.questions[1].correctAnswer, true);
});

test("11. registrar tentativa de quiz deriva score", () => {
  const { content } = seedContent();
  const quiz = contentService.getContent(content.id).quizzes[0];
  const attempt = studyService.recordQuizAttempt({
    quizId: quiz.id,
    contentId: content.id,
    answers: [
      { questionId: quiz.questions[0].id, selectedAnswer: 1, correct: true },
      { questionId: quiz.questions[1].id, selectedAnswer: false, correct: false },
    ],
  });
  assert.equal(attempt.totalQuestions, 2);
  assert.equal(attempt.correctAnswers, 1);
  assert.equal(attempt.score, 50);
  assert.equal(studyService.getAttemptsForContent(content.id).quizAttempts.length, 1);
});

test("12. desempenho agrega tentativas reais", () => {
  const { content } = seedContent();
  const quiz = contentService.getContent(content.id).quizzes[0];
  studyService.recordQuizAttempt({
    quizId: quiz.id,
    contentId: content.id,
    answers: [
      { questionId: quiz.questions[0].id, selectedAnswer: 1, correct: true },
      { questionId: quiz.questions[1].id, selectedAnswer: true, correct: true },
    ],
  });
  const fc = contentService.getContent(content.id).flashcards[0];
  studyService.recordFlashcardAttempt({ flashcardId: fc.id, contentId: content.id, correct: true });
  const summary = performanceService.getPerformanceSummary();
  assert.equal(summary.contentsCreated, 1);
  assert.equal(summary.questionsAnswered, 2);
  assert.equal(summary.questionsCorrect, 2);
  assert.equal(summary.quizAccuracyRate, 100);
  assert.equal(summary.flashcardsReviewed, 1);
  assert.equal(summary.flashcardAccuracyRate, 100);
});

test("13. agendar revisão inicial cria uma única pendente em D+1", () => {
  const { content } = seedContent();
  const review = reviewService.scheduleInitialReview(content.id, "2026-01-01T12:00:00.000Z");
  assert.equal(review.stage, 1);
  assert.equal(review.reason, "first_study");
  assert.equal(reviewService.getReviewsForContent(content.id).length, 1);
  assert.equal(review.scheduledFor, "2026-01-02T12:00:00.000Z");
});

test("14. criar evento acadêmico", () => {
  const { content } = seedContent();
  const event = eventService.createEventEntry({
    type: "exam",
    title: "Prova de Cálculo",
    date: "2026-03-10",
    contentIds: [content.id],
  });
  assert.ok(event.id);
  assert.equal(event.type, "exam");
  assert.equal(eventService.getEvents().length, 1);
});

test("15. vincular e desvincular conteúdo de evento", () => {
  const { content } = seedContent();
  const event = eventService.createEventEntry({ type: "class", title: "Aula", date: "2026-03-10" });
  eventService.linkContentToEvent(event.id, content.id);
  assert.deepEqual(eventService.getEventsForContent(content.id).map((e) => e.id), [event.id]);
  eventService.unlinkContentFromEvent(event.id, content.id);
  assert.equal(eventService.getEventsForContent(content.id).length, 0);
});

test("16. renomear matéria mantém id e sincroniza cache nos conteúdos", () => {
  const { subject, content } = seedContent();
  const renamed = subjectService.renameSubject(subject.id, "Cálculo I");
  assert.equal(renamed.id, subject.id);
  assert.equal(contentService.getContent(content.id).subjectName, "Cálculo I");
});

test("17. mover conteúdo de matéria mantém o mesmo id", () => {
  const { content } = seedContent();
  const outra = subjectService.createSubjectEntry("Física");
  const moved = contentService.moveContentToSubject(content.id, outra.id, outra.name);
  assert.equal(moved.id, content.id);
  assert.equal(contentService.getContent(content.id).subjectId, outra.id);
  assert.equal(contentService.getContent(content.id).subjectName, "Física");
});

test("18. excluir conteúdo faz cascade em revisões/tentativas/eventos", () => {
  const { content } = seedContent();
  reviewService.scheduleInitialReview(content.id);
  const fc = contentService.getContent(content.id).flashcards[0];
  studyService.recordFlashcardAttempt({ flashcardId: fc.id, contentId: content.id, correct: true });
  const event = eventService.createEventEntry({ type: "exam", title: "P1", date: "2026-03-10", contentIds: [content.id] });

  const removed = contentService.deleteContent(content.id);
  assert.equal(removed, true);
  const db = readDb();
  assert.equal(db.contents.length, 0);
  assert.equal(db.reviews.filter((r) => r.contentId === content.id).length, 0);
  assert.equal(db.flashcardAttempts.filter((a) => a.contentId === content.id).length, 0);
  // evento ficou sem nenhum conteúdo → removido
  assert.equal(db.events.find((e) => e.id === event.id), undefined);
});

test("19. varredura de referências órfãs volta vazia após exclusão", () => {
  const a = seedContent({ subjectName: "Matemática" });
  const b = seedContent({ subjectName: "História" });
  reviewService.scheduleInitialReview(a.content.id);
  reviewService.scheduleInitialReview(b.content.id);
  const evt = eventService.createEventEntry({
    type: "exam",
    title: "Prova conjunta",
    date: "2026-03-10",
    contentIds: [a.content.id, b.content.id],
  });
  const fc = contentService.getContent(a.content.id).flashcards[0];
  studyService.recordFlashcardAttempt({ flashcardId: fc.id, contentId: a.content.id, correct: true });

  contentService.deleteContent(a.content.id);

  const db = readDb();
  const contentIds = new Set(db.contents.map((c) => c.id));
  const orphans = [];
  for (const r of db.reviews) if (!contentIds.has(r.contentId)) orphans.push(`review ${r.id}`);
  for (const at of db.flashcardAttempts) if (!contentIds.has(at.contentId)) orphans.push(`flashcardAttempt ${at.id}`);
  for (const at of db.quizAttempts) if (!contentIds.has(at.contentId)) orphans.push(`quizAttempt ${at.id}`);
  for (const e of db.events)
    for (const cid of e.contentIds) if (!contentIds.has(cid)) orphans.push(`event ${e.id} -> ${cid}`);
  assert.deepEqual(orphans, []);
  // o evento sobrevive porque ainda tem o conteúdo B
  assert.deepEqual(
    db.events.find((e) => e.id === evt.id).contentIds,
    [b.content.id]
  );
});

test("20. round-trip de persistência (JSON estável)", () => {
  const { content } = seedContent();
  reviewService.scheduleInitialReview(content.id);
  const raw = localStorage.getItem("sv_db");
  const roundTripped = JSON.parse(raw);
  assert.deepEqual(roundTripped, readDb());
  // e uma segunda leitura não muda nada
  assert.equal(localStorage.getItem("sv_db"), raw);
});

// ─── T0.3: bugs corrigidos ──────────────────────────────────────────────────

test("B1. escrita antes de qualquer leitura ainda migra o sv_items legado", () => {
  // formato legado pré-existente, nenhum sv_db, nenhuma leitura antes
  const legacy = [
    {
      id: "old1",
      subject: "Biologia",
      concept: "Fotossíntese",
      summary: "resumo antigo",
      concepts: ["clorofila"],
      flashcards: [{ front: "fa", back: "ba" }],
      quiz: [{ type: "mc", question: "q?", options: ["a", "b"], answer: 0 }],
      questions: ["por quê?"],
      reviewSchedule: [{ stage: 1, label: "D+1", dueAt: Date.now() + 86400000, done: false }],
    },
  ];
  localStorage.setItem("sv_items", JSON.stringify(legacy));

  // primeira operação da sessão é uma ESCRITA
  subjectService.createSubjectEntry("Química");

  const db = readDb();
  const migrated = db.contents.find((c) => c.title === "Fotossíntese");
  assert.ok(migrated, "conteúdo legado deveria ter sido migrado");
  assert.equal(migrated.subjectName, "Biologia");
  assert.ok(db.subjects.some((s) => s.name === "Química"), "matéria nova também deve estar lá");
  assert.ok(localStorage.getItem("sv_items_backup_v1"), "backup do sv_items deve existir");
  assert.ok(localStorage.getItem("sv_items"), "sv_items original é preservado");
});

test("B3. addImageToContent propaga falha de cota em vez de engolir", () => {
  const { content } = seedContent();
  storage.failNextWrites = true;
  const { result } = contentService.addImageToContent(content.id, { dataUrl: "data:image/jpeg;base64,ZZZ" });
  storage.failNextWrites = false;
  assert.ok(result, "deve retornar o result de writeDb");
  assert.equal(result.ok, false);
  assert.equal(result.reason, "quota");
});

// ─── T4: transições de domínio (mastery) ────────────────────────────────────

test("T4. not_started sem tentativa; updateMastery persiste content.mastery", () => {
  const { content } = seedContent();
  assert.equal(studyService.updateMastery(content.id).level, "not_started");
  assert.equal(contentService.getContent(content.id).mastery.level, "not_started");
});

test("T4. quiz 100% com >=3 interações -> mastered", () => {
  const { content } = seedContent();
  const quiz = contentService.getContent(content.id).quizzes[0];
  studyService.recordQuizAttempt({
    quizId: quiz.id,
    contentId: content.id,
    answers: [
      { questionId: quiz.questions[0].id, selectedAnswer: 1, correct: true },
      { questionId: quiz.questions[1].id, selectedAnswer: true, correct: true },
    ],
  });
  const fc = contentService.getContent(content.id).flashcards[0];
  studyService.recordFlashcardAttempt({ flashcardId: fc.id, contentId: content.id, correct: true });
  assert.equal(studyService.updateMastery(content.id).level, "mastered");
  assert.equal(contentService.getContent(content.id).mastery.level, "mastered");
});

test("T4. quiz 40% -> needs_review", () => {
  const { content } = seedContent();
  const quiz = contentService.getContent(content.id).quizzes[0];
  studyService.recordQuizAttempt({
    quizId: quiz.id,
    contentId: content.id,
    answers: [
      { questionId: "q1", selectedAnswer: 0, correct: true },
      { questionId: "q2", selectedAnswer: 0, correct: true },
      { questionId: "q3", selectedAnswer: 0, correct: false },
      { questionId: "q4", selectedAnswer: 0, correct: false },
      { questionId: "q5", selectedAnswer: 0, correct: false },
    ],
  });
  assert.equal(studyService.updateMastery(content.id).level, "needs_review");
});

test("T4b. masteryBreakdown não tem mais o nível morto 'learning'", () => {
  const summary = performanceService.getPerformanceSummary();
  assert.deepEqual(Object.keys(summary.masteryBreakdown).sort(), ["developing", "mastered", "needs_review", "not_started"]);
});

// ─── FASE 3: aprendizado, desempenho e revisões ─────────────────────────────

test("F3-1. round-trip preserva campos novos (review/content/quizAttempt)", () => {
  const { content } = seedContent();
  const review = reviewService.scheduleManualReview(content.id, "2026-01-01T12:00:00.000Z");
  assert.ok("updatedAt" in review);
  assert.ok("skippedAt" in review);

  const updated = contentService.updateContent(content.id, { recommendedDifficulty: "hard" });
  assert.equal(updated.recommendedDifficulty, "hard");

  const quiz = contentService.getContent(content.id).quizzes[0];
  const attempt = studyService.recordQuizAttempt({
    quizId: quiz.id,
    contentId: content.id,
    answers: [{ questionId: quiz.questions[0].id, selectedAnswer: 1, correctAnswer: 1, correct: true }],
  });
  assert.equal(attempt.answers[0].correctAnswer, 1);

  const db = readDb();
  const roundTripped = JSON.parse(localStorage.getItem("sv_db"));
  assert.deepEqual(roundTripped, db);
  assert.equal(roundTripped.reviews.find((r) => r.id === review.id).skippedAt, null);
  assert.equal(roundTripped.contents.find((c) => c.id === content.id).recommendedDifficulty, "hard");
});

test("F3-1b. validateContent rejeita recommendedDifficulty inválido", () => {
  const { content } = seedContent();
  const bad = { ...content, recommendedDifficulty: "impossível" };
  const { valid, errors } = validate.validateContent(bad);
  assert.equal(valid, false);
  assert.ok(errors.includes("recommendedDifficulty inválido"));
});

test("F3-2. intervalo de revisão por faixa de desempenho", () => {
  assert.deepEqual(reviewService.resolveReviewInterval(null), { days: 1, reason: "first_study" });
  assert.deepEqual(reviewService.resolveReviewInterval(45), { days: 1, reason: "low_performance" });
  assert.deepEqual(reviewService.resolveReviewInterval(70), { days: 3, reason: "reinforcement" });
  assert.deepEqual(reviewService.resolveReviewInterval(85), { days: 7, reason: "consolidation" });
  assert.deepEqual(reviewService.resolveReviewInterval(95), { days: 14, reason: "long_term" });
});

test("F3-3. dez atividades seguidas -> exatamente uma revisão pendente", () => {
  const { content } = seedContent();
  reviewService.scheduleInitialReview(content.id);
  for (let i = 0; i < 10; i++) {
    reviewService.scheduleReviewFromPerformance(content.id, i % 2 === 0 ? 40 : 90);
  }
  const pending = reviewService.getReviewsForContent(content.id).filter((r) => r.status === "pending");
  assert.equal(pending.length, 1);
  assert.equal(pending[0].reason, "long_term");
});

test("F3-4. revisão manual não é sobrescrita pelo desempenho", () => {
  const { content } = seedContent();
  const manual = reviewService.scheduleManualReview(content.id, "2026-06-01T12:00:00.000Z");
  const result = reviewService.scheduleReviewFromPerformance(content.id, 20);
  assert.equal(result.id, manual.id);
  assert.equal(result.reason, "manual");
  assert.equal(result.scheduledFor, "2026-06-01T12:00:00.000Z");
});

test("F3-5. markReviewDone conclui e agenda a próxima com stage incrementado", () => {
  const { content } = seedContent();
  const first = reviewService.scheduleInitialReview(content.id);
  const done = reviewService.markReviewDone(first.id);
  assert.equal(done.status, "completed");
  const next = reviewService.nextPendingReview(content.id);
  assert.ok(next);
  assert.equal(next.stage, 2);
  assert.equal(reviewService.getReviewsForContent(content.id).filter((r) => r.status === "pending").length, 1);
});

test("F3-6. dominio exige minimo de interacoes antes de 'mastered'", () => {
  const { content } = seedContent();
  const fc = contentService.getContent(content.id).flashcards[0];
  studyService.recordFlashcardAttempt({ flashcardId: fc.id, contentId: content.id, correct: true });
  const oneInteraction = studyService.calculateMastery(content.id);
  assert.equal(oneInteraction.score, 100);
  assert.equal(oneInteraction.interactions, 1);
  assert.equal(oneInteraction.level, "developing");

  const fc2 = contentService.getContent(content.id).flashcards[1];
  studyService.recordFlashcardAttempt({ flashcardId: fc2.id, contentId: content.id, correct: true });
  studyService.recordFlashcardAttempt({ flashcardId: fc2.id, contentId: content.id, correct: true });
  const threeInteractions = studyService.calculateMastery(content.id);
  assert.equal(threeInteractions.interactions, 3);
  assert.equal(threeInteractions.level, "mastered");
});

test("F3-7. quiz 4/5 -> desempenho geral do conteudo = 80", () => {
  const { content } = seedContent({
    quizzes: [
      {
        questions: [
          { type: "mc", question: "1", options: ["a", "b"], correctAnswer: 0 },
          { type: "mc", question: "2", options: ["a", "b"], correctAnswer: 0 },
          { type: "mc", question: "3", options: ["a", "b"], correctAnswer: 0 },
          { type: "mc", question: "4", options: ["a", "b"], correctAnswer: 0 },
          { type: "mc", question: "5", options: ["a", "b"], correctAnswer: 0 },
        ],
      },
    ],
  });
  const quiz = contentService.getContent(content.id).quizzes[0];
  studyService.recordQuizAttempt({
    quizId: quiz.id,
    contentId: content.id,
    answers: quiz.questions.map((q, i) => ({ questionId: q.id, selectedAnswer: 0, correct: i < 4 })),
  });
  const perf = performanceService.getContentPerformance(content.id);
  assert.equal(perf.quiz.accuracyRate, 80);
  assert.equal(perf.overall, 80);
  assert.equal(perf.hasActivity, true);
});

test("F3-8. 10 flashcards com 8 acertos -> 80", () => {
  const { content } = seedContent();
  const fc = contentService.getContent(content.id).flashcards[0];
  for (let i = 0; i < 10; i++) {
    studyService.recordFlashcardAttempt({ flashcardId: fc.id, contentId: content.id, correct: i < 8 });
  }
  const perf = performanceService.getFlashcardPerformance(content.id);
  assert.equal(perf.reviewed, 10);
  assert.equal(perf.correct, 8);
  assert.equal(perf.accuracyRate, 80);
});

test("F3-9. so quiz -> overall = quiz; sem atividade -> overall null", () => {
  const { content } = seedContent();
  const empty = performanceService.getContentPerformance(content.id);
  assert.equal(empty.overall, null);
  assert.equal(empty.hasActivity, false);

  const quiz = contentService.getContent(content.id).quizzes[0];
  studyService.recordQuizAttempt({
    quizId: quiz.id,
    contentId: content.id,
    answers: [
      { questionId: quiz.questions[0].id, selectedAnswer: 1, correct: true },
      { questionId: quiz.questions[1].id, selectedAnswer: false, correct: false },
    ],
  });
  const onlyQuiz = performanceService.getContentPerformance(content.id);
  assert.equal(onlyQuiz.flashcards.accuracyRate, null);
  assert.equal(onlyQuiz.overall, onlyQuiz.quiz.accuracyRate);
});

test("F3-10. historico de quiz preserva todas as tentativas, sem sobrescrever", () => {
  const { content } = seedContent();
  const quiz = contentService.getContent(content.id).quizzes[0];
  studyService.recordQuizAttempt({
    quizId: quiz.id,
    contentId: content.id,
    answers: [
      { questionId: quiz.questions[0].id, selectedAnswer: 1, correct: true },
      { questionId: quiz.questions[1].id, selectedAnswer: false, correct: false },
    ],
  });
  studyService.recordQuizAttempt({
    quizId: quiz.id,
    contentId: content.id,
    answers: [
      { questionId: quiz.questions[0].id, selectedAnswer: 1, correct: true },
      { questionId: quiz.questions[1].id, selectedAnswer: true, correct: true },
    ],
  });
  const perf = performanceService.getQuizPerformance(content.id);
  assert.equal(perf.history.length, 2);
  assert.deepEqual(perf.history.map((h) => h.score), [50, 100]);
  assert.equal(perf.bestScore, 100);
  assert.equal(perf.lastScore, 100);
});

test("F3-11. conteudos de materias diferentes nao se contaminam", () => {
  const math = seedContent({ subjectName: "Matemática", title: "Derivadas" });
  const history = seedContent({ subjectName: "História", title: "Revolução Francesa" });

  const quiz = contentService.getContent(math.content.id).quizzes[0];
  studyService.recordQuizAttempt({
    quizId: quiz.id,
    contentId: math.content.id,
    answers: [
      { questionId: quiz.questions[0].id, selectedAnswer: 1, correct: true },
      { questionId: quiz.questions[1].id, selectedAnswer: true, correct: true },
    ],
  });

  const historyPerf = performanceService.getContentPerformance(history.content.id);
  assert.equal(historyPerf.overall, null);
  assert.equal(historyPerf.hasActivity, false);

  const mathSubjectPerf = performanceService.getSubjectPerformance(math.subject.id);
  assert.equal(mathSubjectPerf.contentsCount, 1);
  assert.equal(mathSubjectPerf.averageOverall, 100);

  const historySubjectPerf = performanceService.getSubjectPerformance(history.subject.id);
  assert.equal(historySubjectPerf.contentsCount, 1);
  assert.equal(historySubjectPerf.averageOverall, null);
});

test("F3-12. dificuldade recomendada deriva do desempenho e persiste", () => {
  const { content } = seedContent();
  assert.equal(studyService.getRecommendedDifficulty(content.id), null);

  const quiz = contentService.getContent(content.id).quizzes[0];
  studyService.recordQuizAttempt({
    quizId: quiz.id,
    contentId: content.id,
    answers: [
      { questionId: quiz.questions[0].id, selectedAnswer: 1, correct: false },
      { questionId: quiz.questions[1].id, selectedAnswer: false, correct: false },
    ],
  });
  const persisted = studyService.updateRecommendedDifficulty(content.id);
  assert.equal(persisted, "easy");
  assert.equal(contentService.getContent(content.id).recommendedDifficulty, "easy");
});

test("F3-13. registerActivity com desempenho baixo -> needs_review, easy e revisao em D+1", () => {
  const { content } = seedContent();
  const quiz = contentService.getContent(content.id).quizzes[0];
  studyService.recordQuizAttempt({
    quizId: quiz.id,
    contentId: content.id,
    answers: [
      { questionId: quiz.questions[0].id, selectedAnswer: 1, correct: false },
      { questionId: quiz.questions[1].id, selectedAnswer: false, correct: false },
    ],
  });
  const result = studyService.registerActivity(content.id);
  assert.equal(result.performance.overall, 0);
  assert.equal(result.mastery.level, "needs_review");
  assert.equal(result.recommendedDifficulty, "easy");
  assert.equal(result.review.status, "pending");
  assert.equal(result.review.reason, "low_performance");
  assert.equal(reviewService.getReviewsForContent(content.id).filter((r) => r.status === "pending").length, 1);
});

test("F3-15. sweepOrphans remove tentativas/revisoes sem conteudo, preserva o resto", () => {
  const { content } = seedContent();
  const fc = contentService.getContent(content.id).flashcards[0];
  studyService.recordFlashcardAttempt({ flashcardId: fc.id, contentId: content.id, correct: true });
  reviewService.scheduleInitialReview(content.id);

  withDb((db) => ({
    ...db,
    reviews: [...db.reviews, { id: "rev_orphan", contentId: "cnt_missing", stage: 1, scheduledFor: nowIso(), status: "pending", completedAt: null, reason: "manual", updatedAt: nowIso(), skippedAt: null }],
    flashcardAttempts: [...db.flashcardAttempts, { id: "fa_orphan", flashcardId: "fc_missing", contentId: "cnt_missing", correct: true, answeredAt: nowIso(), responseTimeMs: null }],
    quizAttempts: [...db.quizAttempts, { id: "qa_orphan", quizId: "qz_missing", contentId: "cnt_missing", score: 0, correctAnswers: 0, totalQuestions: 0, answeredAt: nowIso(), answers: [] }],
  }));

  const removed = integrityService.sweepOrphans();
  assert.equal(removed.reviews, 1);
  assert.equal(removed.flashcardAttempts, 1);
  assert.equal(removed.quizAttempts, 1);

  const db = readDb();
  assert.equal(db.reviews.some((r) => r.id === "rev_orphan"), false);
  assert.equal(db.flashcardAttempts.some((a) => a.id === "fa_orphan"), false);
  assert.equal(db.quizAttempts.some((a) => a.id === "qa_orphan"), false);
  // registros válidos preservados
  assert.equal(reviewService.getReviewsForContent(content.id).length, 1);
  assert.equal(studyService.getAttemptsForContent(content.id).flashcardAttempts.length, 1);
});

test("F3-16. reload (nova leitura do localStorage) preserva todo o historico", () => {
  const { content } = seedContent();
  const quiz = contentService.getContent(content.id).quizzes[0];
  studyService.recordQuizAttempt({
    quizId: quiz.id,
    contentId: content.id,
    answers: [
      { questionId: quiz.questions[0].id, selectedAnswer: 1, correct: true },
      { questionId: quiz.questions[1].id, selectedAnswer: true, correct: true },
    ],
  });
  const fc = contentService.getContent(content.id).flashcards[0];
  for (let i = 0; i < 10; i++) {
    studyService.recordFlashcardAttempt({ flashcardId: fc.id, contentId: content.id, correct: i < 8 });
  }
  studyService.registerActivity(content.id);

  // Simula reload: relê exatamente como o app faria ao abrir de novo, direto
  // do que está gravado em localStorage — sem depender de estado em memória.
  const reloaded = JSON.parse(localStorage.getItem("sv_db"));
  assert.equal(reloaded.quizAttempts.filter((a) => a.contentId === content.id).length, 1);
  assert.equal(reloaded.flashcardAttempts.filter((a) => a.contentId === content.id).length, 10);
  const reloadedContent = reloaded.contents.find((c) => c.id === content.id);
  assert.equal(reloadedContent.mastery.level, "mastered");
  assert.equal(reloaded.reviews.filter((r) => r.contentId === content.id && r.status === "pending").length, 1);
});

// ─── Fase 4 — integridade referencial ampliada ────────────────────────────────

test("F4-12. sweepOrphans limpa contentId orfao de evento sem apagar o evento", () => {
  const { content } = seedContent();
  const event = eventService.createEventEntry({ type: "exam", title: "Prova conjunta", date: "2026-03-10", contentIds: [content.id] });
  // Simula conteúdo removido sem passar pelo cascade normal (dado corrompido).
  withDb((db) => ({ ...db, contents: db.contents.filter((c) => c.id !== content.id) }));

  const removed = integrityService.sweepOrphans();
  assert.equal(removed.eventContentRefs, 1);
  const stillThere = eventService.getEvent(event.id);
  assert.ok(stillThere);
  assert.deepEqual(stillThere.contentIds, []);
});

test("F4-13. sweepOrphans move conteudo com materia fantasma para Sem materia", () => {
  const { content } = seedContent();
  // Simula matéria removida sem passar por deleteSubject/reassignTo.
  withDb((db) => ({ ...db, subjects: db.subjects.filter((s) => s.id !== content.subjectId) }));

  const removed = integrityService.sweepOrphans();
  assert.equal(removed.contentSubjectRefs, 1);
  const after = contentService.getContent(content.id);
  assert.equal(after.subjectId, null);
  assert.equal(after.subjectName, "");
});

// ─── Fase 4 — eventService endurecido ──────────────────────────────────────────

test("F4-7. updateEvent preserva eventId e createdAt, nao cria evento novo", () => {
  const { content } = seedContent();
  const event = eventService.createEventEntry({ type: "exam", title: "P1", date: "2026-03-10", contentIds: [content.id] });
  const updated = eventService.updateEvent(event.id, { title: "P1 remarcada", date: "2026-03-15" });
  assert.equal(updated.id, event.id);
  assert.equal(updated.createdAt, event.createdAt);
  assert.equal(updated.title, "P1 remarcada");
  assert.ok(updated.updatedAt);
  assert.equal(eventService.getEvents().length, 1);
});

test("F4-8. deleteEvent retorna false para id inexistente e true ao remover", () => {
  const event = eventService.createEventEntry({ type: "class", title: "Aula", date: "2026-03-10" });
  assert.equal(eventService.deleteEvent("evt_inexistente"), false);
  assert.equal(eventService.deleteEvent(event.id), true);
  assert.equal(eventService.getEvents().length, 0);
});

test("F4-9. evento sem conteudo (contentIds vazio) pode existir e ser lido", () => {
  const event = eventService.createEventEntry({ type: "other", title: "Aula inaugural", date: "2026-03-01" });
  assert.deepEqual(event.contentIds, []);
  const read = eventService.getEvent(event.id);
  assert.equal(read.title, "Aula inaugural");
});

test("F4-10. unlink nao apaga evento que fica sem nenhum conteudo", () => {
  const { content } = seedContent();
  const event = eventService.createEventEntry({ type: "exam", title: "Prova", date: "2026-03-10", contentIds: [content.id] });
  eventService.unlinkContentFromEvent(event.id, content.id);
  const stillThere = eventService.getEvent(event.id);
  assert.ok(stillThere);
  assert.deepEqual(stillThere.contentIds, []);
});

test("F4-11. createEventEntry rejeita evento invalido", () => {
  assert.throws(() => eventService.createEventEntry({ type: "exam", title: "", date: "2026-03-10" }), eventService.EventValidationError);
  assert.throws(() => eventService.createEventEntry({ type: "exam", title: "Prova", date: "" }), eventService.EventValidationError);
});

// ─── Fase 4 — mover conteudo entre materias preserva tudo ─────────────────────

test("F4-18. mover conteudo preserva id, fotos, flashcards, quizzes, notas, tentativas, reviews e eventos", () => {
  const { content } = seedContent();
  contentService.addImageToContent(content.id, { dataUrl: "data:image/jpeg;base64,AAA" });
  contentService.updateNotes(content.id, "minha anotação");
  reviewService.scheduleInitialReview(content.id);
  const fc = contentService.getContent(content.id).flashcards[0];
  studyService.recordFlashcardAttempt({ flashcardId: fc.id, contentId: content.id, correct: true });
  const event = eventService.createEventEntry({ type: "exam", title: "Prova", date: "2026-03-10", contentIds: [content.id] });

  const before = contentService.getContent(content.id);
  const outra = subjectService.createSubjectEntry("Cálculo");
  const moved = contentService.moveContentToSubject(content.id, outra.id, outra.name);

  assert.equal(moved.id, before.id);
  assert.equal(moved.subjectId, outra.id);
  assert.equal(moved.subjectName, "Cálculo");
  assert.deepEqual(moved.images, before.images);
  assert.deepEqual(moved.flashcards, before.flashcards);
  assert.deepEqual(moved.quizzes, before.quizzes);
  assert.equal(moved.notes, before.notes);
  assert.deepEqual(reviewService.getReviewsForContent(content.id).map((r) => r.id), reviewService.getReviewsForContent(before.id).map((r) => r.id));
  assert.equal(studyService.getAttemptsForContent(content.id).flashcardAttempts.length, 1);
  assert.deepEqual(eventService.getEventsForContent(content.id).map((e) => e.id), [event.id]);
});

// ─── Fase 4 — gerenciar materias (criar/renomear/excluir) ─────────────────────

test("F4-15. deleteSubject com unassign deixa conteudo sem materia", () => {
  const { subject, content } = seedContent();
  const { movedContentIds } = subjectService.deleteSubject(subject.id, { unassign: true });
  assert.deepEqual(movedContentIds, [content.id]);
  const after = contentService.getContent(content.id);
  assert.equal(after.subjectId, null);
  assert.equal(after.subjectName, "");
  assert.equal(subjectService.getSubject(subject.id), null);
});

test("F4-16. deleteSubject sem reassignTo nem unassign exige decisao", () => {
  const { subject } = seedContent();
  assert.throws(() => subjectService.deleteSubject(subject.id), subjectService.SubjectDeletionError);
  assert.equal(subjectService.getSubjects().length, 1); // nada foi excluído
});

test("F4-17. deleteSubject de materia vazia nao exige decisao", () => {
  const subject = subjectService.createSubjectEntry("Filosofia");
  const { movedContentIds } = subjectService.deleteSubject(subject.id);
  assert.deepEqual(movedContentIds, []);
  assert.equal(subjectService.getSubjects().length, 0);
});

// ─── Fase 4 — busca real multi-campo ──────────────────────────────────────────

test("F4-14. matchesQuery encontra por titulo, materia, topico, conceitos e keywords", () => {
  const content = {
    title: "Introdução às Derivadas",
    subjectName: "Matemática",
    topic: "Cálculo Diferencial",
    keyConcepts: ["taxa de variação instantânea"],
    keywords: ["limite"],
    extractedText: "f(x) = x^2, derivada aponta inclinação da reta tangente",
  };
  assert.equal(matchesQuery(content, "derivada"), true); // no título e no texto extraído
  assert.equal(matchesQuery(content, "MATEMATICA"), true); // acento/caixa insensível
  assert.equal(matchesQuery(content, "cálculo"), true); // no tópico
  assert.equal(matchesQuery(content, "variação"), true); // só nos conceitos
  assert.equal(matchesQuery(content, "limite"), true); // só nas keywords
  assert.equal(matchesQuery(content, "biologia"), false);
  assert.equal(matchesQuery(content, ""), true); // sem query, tudo passa
});

// ─── Fase 4 — subjectService à prova de duplicata ─────────────────────────────

test("F4-4. nomes equivalentes de materia nao duplicam", () => {
  const a = subjectService.createSubjectEntry("Química");
  const b = subjectService.ensureSubject(" quimica ");
  const c = subjectService.ensureSubject("QUÍMICA");
  assert.equal(b.id, a.id);
  assert.equal(c.id, a.id);
  assert.equal(subjectService.getSubjects().length, 1);
});

test("F4-5. nome vazio nao cria materia", () => {
  assert.equal(subjectService.createSubjectEntry("   "), null);
  assert.equal(subjectService.ensureSubject(""), null);
  assert.equal(subjectService.getSubjects().length, 0);
});

test("F4-6. ensureSubject normaliza espacos internos", () => {
  const s = subjectService.ensureSubject("  Banco   de   Dados  ");
  assert.equal(s.name, "Banco de Dados");
});

// ─── Fase 4 — conteúdo sem matéria é estado válido ────────────────────────────

test("F4-0. conteudo sem materia e valido; subjectId sem subjectName nao e", () => {
  const semMateria = { ...seedContent().content, subjectId: null, subjectName: "" };
  assert.equal(validate.validateContent(semMateria).valid, true);

  const cacheDesatualizado = { ...seedContent().content, subjectId: "sub_x", subjectName: "" };
  const { valid, errors } = validate.validateContent(cacheDesatualizado);
  assert.equal(valid, false);
  assert.ok(errors.includes("subjectId presente sem subjectName (cache desatualizado)"));
});

// ─── Fase 4 — evento acadêmico (modelo/validação) ─────────────────────────────

test("F4-1. evento com tipo deadline/other sobrevive a round-trip", () => {
  const deadline = eventService.createEventEntry({ type: "deadline", title: "Entrega TCC", date: "2026-04-01" });
  const other = eventService.createEventEntry({ type: "other", title: "Reunião", date: "2026-04-02" });
  const reloaded = JSON.parse(localStorage.getItem("sv_db"));
  assert.equal(reloaded.events.find((e) => e.id === deadline.id).type, "deadline");
  assert.equal(reloaded.events.find((e) => e.id === other.id).type, "other");
});

test("F4-2. validateEvent reprova titulo vazio, tipo invalido e data malformada", () => {
  const semTitulo = createEvent({ type: "exam", title: "  ", date: "2026-03-10" });
  assert.equal(validate.validateEvent(semTitulo).valid, false);

  const tipoInvalido = { ...createEvent({ type: "exam", title: "Prova", date: "2026-03-10" }), type: "invalido" };
  assert.equal(validate.validateEvent(tipoInvalido).valid, false);

  const dataInvalida = createEvent({ type: "exam", title: "Prova", date: "10/03/2026" });
  assert.equal(validate.validateEvent(dataInvalida).valid, false);

  const valido = createEvent({ type: "exam", title: "Prova", date: "2026-03-10" });
  assert.equal(validate.validateEvent(valido).valid, true);
});

test("F4-3. evento antigo sem notes/updatedAt nao quebra ao ser lido", () => {
  withDb((db) => ({
    ...db,
    events: [...db.events, {
      id: "evt_legacy", type: "exam", title: "Prova legada", date: "2026-05-01", time: null,
      reminders: [], contentIds: [], createdAt: nowIso(),
      // sem notes, sem updatedAt — formato pré-Fase 4
    }],
  }));
  const event = eventService.getEvent("evt_legacy");
  assert.equal(event.title, "Prova legada");
  assert.deepEqual(eventService.getEvents().map((e) => e.id), ["evt_legacy"]);
});

// ─── relatório ───────────────────────────────────────────────────────────────
console.log(`\n${passed} passaram, ${failed} falharam`);
if (failed > 0) {
  console.log("\nFalhas:");
  for (const { name, err } of failures) {
    console.log(`\n• ${name}`);
    console.log(err.stack || err.message);
  }
  process.exit(1);
}
