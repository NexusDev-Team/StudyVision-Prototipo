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
const { readDb } = await import("../src/data/storage/index.js");

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

test("13. agendar revisões gera o ciclo D+1..D+30", () => {
  const { content } = seedContent();
  const reviews = reviewService.scheduleReviewsForContent(content.id, "2026-01-01T12:00:00.000Z");
  assert.equal(reviews.length, 5);
  assert.deepEqual(reviews.map((r) => r.stage), [1, 2, 3, 4, 5]);
  assert.equal(reviewService.getReviewsForContent(content.id).length, 5);
  assert.equal(reviews[0].scheduledFor, "2026-01-02T12:00:00.000Z");
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
  reviewService.scheduleReviewsForContent(content.id);
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
  reviewService.scheduleReviewsForContent(a.content.id);
  reviewService.scheduleReviewsForContent(b.content.id);
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
  reviewService.scheduleReviewsForContent(content.id);
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

test("T4. quiz 100% -> mastered", () => {
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
