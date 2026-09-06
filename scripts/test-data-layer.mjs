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
const evolutionService = await import("../src/services/evolutionService.js");
const subscriptionService = await import("../src/services/subscriptionService.js");
const { readDb, withDb } = await import("../src/data/storage/index.js");
const validate = await import("../src/data/models/validate.js");
const integrityService = await import("../src/services/integrityService.js");
const { nowIso, startOfWeekKey, currentWeekStartKey, previousWeekKey, fromDayKey, addDaysIso } = await import("../src/utils/date.js");
const { createEvent } = await import("../src/data/models/event.js");
const { matchesQuery } = await import("../src/utils/search.js");
const knowledgeFlameService = await import("../src/services/knowledgeFlameService.js");
const { createQuizAttempt } = await import("../src/data/models/quiz.js");
const { createFlashcardAttempt } = await import("../src/data/models/flashcard.js");
const { createReview } = await import("../src/data/models/review.js");

// helper: cria um conteúdo mínimo já com matéria
// helper: gera `total` respostas de quiz com `correct` delas certas.
function buildAnswers(total, correct) {
  return Array.from({ length: total }, (_, i) => ({
    questionId: `qs_fake_${i}`,
    selectedAnswer: i < correct ? 1 : 0,
    correctAnswer: 1,
    correct: i < correct,
  }));
}

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

// helpers da Chama do Conhecimento (F8): weekKey da semana atual deslocada
// `weeksAgo` semanas para trás, e um ISO dentro dela em `dayOffset` dias após
// a segunda (0=segunda .. 6=domingo), sempre ao meio-dia local.
function weekKeyAgo(weeksAgo) {
  let key = currentWeekStartKey();
  for (let i = 0; i < weeksAgo; i++) key = previousWeekKey(key);
  return key;
}
function isoInWeek(weeksAgo, dayOffset = 0) {
  return addDaysIso(fromDayKey(weekKeyAgo(weeksAgo)), dayOffset);
}
function addQuizActivity(contentId, weeksAgo, dayOffset = 0) {
  withDb((db) => ({
    ...db,
    quizAttempts: [
      ...db.quizAttempts,
      createQuizAttempt({ quizId: "qz_fake", contentId, answers: buildAnswers(3, 2), answeredAt: isoInWeek(weeksAgo, dayOffset) }),
    ],
  }));
}
function addFlashcardActivity(contentId, weeksAgo, dayOffset = 0, hourOffsetMs = 0) {
  const at = new Date(new Date(isoInWeek(weeksAgo, dayOffset)).getTime() + hourOffsetMs).toISOString();
  withDb((db) => ({
    ...db,
    flashcardAttempts: [
      ...db.flashcardAttempts,
      createFlashcardAttempt({ flashcardId: "fc_fake", contentId, correct: true, answeredAt: at }),
    ],
  }));
}
function addReviewActivity(contentId, weeksAgo, dayOffset = 0, status = "completed") {
  withDb((db) => ({
    ...db,
    reviews: [
      ...db.reviews,
      createReview({ contentId, kind: "manual", status, completedAt: status === "completed" ? isoInWeek(weeksAgo, dayOffset) : null, scheduledFor: isoInWeek(weeksAgo, dayOffset) }),
    ],
  }));
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

test("13. applyReviewPlan cria uma única revisão de plano pendente em dia útil", () => {
  const { content } = seedContent();
  contentService.updateContent(content.id, { reviewPlan: "weekly" });
  const review = reviewService.applyReviewPlan(content.id);
  assert.equal(review.kind, "plan");
  assert.equal(reviewService.getReviewsForContent(content.id).filter((r) => r.status === "pending").length, 1);
  const day = new Date(review.scheduledFor).getDay();
  assert.ok(day !== 0 && day !== 6, "revisão de plano nunca cai em fim de semana");
  // idempotente: chamar de novo não cria uma segunda
  reviewService.applyReviewPlan(content.id);
  assert.equal(reviewService.getReviewsForContent(content.id).filter((r) => r.status === "pending").length, 1);
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
  reviewService.scheduleManualReview(content.id, nowIso());
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
  reviewService.scheduleManualReview(a.content.id, nowIso());
  reviewService.scheduleManualReview(b.content.id, nowIso());
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
  reviewService.scheduleManualReview(content.id, nowIso());
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

test("F3-3. dez atividades seguidas nao criam revisao alguma sem plano nem compromisso", () => {
  const { content } = seedContent();
  const quiz = contentService.getContent(content.id).quizzes[0];
  for (let i = 0; i < 10; i++) {
    studyService.recordQuizAttempt({ quizId: quiz.id, contentId: content.id, answers: buildAnswers(4, i % 2 === 0 ? 1 : 4) });
    studyService.registerActivity(content.id);
  }
  assert.equal(reviewService.getReviewsForContent(content.id).filter((r) => r.status === "pending").length, 0);
});

test("F3-3b. com plano semanal, dez atividades mantem exatamente uma revisao de plano pendente", () => {
  const { content } = seedContent();
  contentService.updateContent(content.id, { reviewPlan: "weekly" });
  reviewService.applyReviewPlan(content.id);
  const quiz = contentService.getContent(content.id).quizzes[0];
  for (let i = 0; i < 10; i++) {
    studyService.recordQuizAttempt({ quizId: quiz.id, contentId: content.id, answers: buildAnswers(4, i % 2 === 0 ? 1 : 4) });
    studyService.registerActivity(content.id);
  }
  const pending = reviewService.getReviewsForContent(content.id).filter((r) => r.status === "pending");
  assert.equal(pending.length, 1);
  assert.equal(pending[0].kind, "plan");
});

test("F3-4. revisao manual nao e tocada por advanceReviewsAfterActivity", () => {
  const { content } = seedContent();
  const manual = reviewService.scheduleManualReview(content.id, "2026-06-01T12:00:00.000Z");
  const result = reviewService.advanceReviewsAfterActivity(content.id, 20);
  assert.equal(result, null); // so mexe em revisao de compromisso
  const still = reviewService.getReviewsForContent(content.id).find((r) => r.id === manual.id);
  assert.equal(still.scheduledFor, "2026-06-01T12:00:00.000Z");
});

test("F3-5. markReviewDone de revisao de plano conclui e agenda a proxima", () => {
  const { content } = seedContent();
  contentService.updateContent(content.id, { reviewPlan: "weekly" });
  const first = reviewService.applyReviewPlan(content.id);
  const done = reviewService.markReviewDone(first.id);
  assert.equal(done.status, "completed");
  const next = reviewService.nextPendingReview(content.id);
  assert.ok(next);
  assert.equal(next.kind, "plan");
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

test("F3-13. registerActivity com desempenho baixo antecipa a revisao de compromisso", () => {
  const { content } = seedContent();
  // evento distante -> serie D-7/D-3/D-1 bem no futuro
  const future = new Date(Date.now() + 40 * 86400000).toISOString().slice(0, 10);
  eventService.createEventEntry({ type: "exam", title: "P1", date: future, contentIds: [content.id] });
  const nearestBefore = reviewService.getReviewsForContent(content.id)
    .filter((r) => r.status === "pending" && r.kind === "commitment")
    .sort((a, b) => new Date(a.scheduledFor) - new Date(b.scheduledFor))[0];

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
  assert.equal(result.review.kind, "commitment");
  assert.ok(new Date(result.review.scheduledFor) < new Date(nearestBefore.scheduledFor), "desempenho baixo antecipa a revisao");
  assert.equal(reviewService.getReviewsForContent(content.id).filter((r) => r.status === "pending").length, 3);
});

test("F3-15. sweepOrphans remove tentativas/revisoes sem conteudo, preserva o resto", () => {
  const { content } = seedContent();
  const fc = contentService.getContent(content.id).flashcards[0];
  studyService.recordFlashcardAttempt({ flashcardId: fc.id, contentId: content.id, correct: true });
  reviewService.scheduleManualReview(content.id, nowIso());

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
  contentService.updateContent(content.id, { reviewPlan: "weekly" });
  reviewService.applyReviewPlan(content.id);
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

// ─── Fase 4 — cobertura dos testes obrigatorios do briefing ───────────────────

test("F4-20. criar materia e recarregar preserva a materia (testes 1 e 2)", () => {
  const subject = subjectService.createSubjectEntry("Banco de Dados");
  const reloaded = JSON.parse(localStorage.getItem("sv_db"));
  assert.ok(reloaded.subjects.some((s) => s.id === subject.id && s.name === "Banco de Dados"));
});

test("F4-21. criar evento de cada tipo canonico e recarregar preserva todos (testes 9-13)", () => {
  const exam = eventService.createEventEntry({ type: "exam", title: "Prova", date: "2026-11-01" });
  const assignment = eventService.createEventEntry({ type: "assignment", title: "Trabalho", date: "2026-11-02" });
  const klass = eventService.createEventEntry({ type: "class", title: "Aula", date: "2026-11-03" });
  const deadline = eventService.createEventEntry({ type: "deadline", title: "Entrega", date: "2026-11-04" });

  const reloaded = JSON.parse(localStorage.getItem("sv_db"));
  const byId = new Map(reloaded.events.map((e) => [e.id, e]));
  assert.equal(byId.get(exam.id)?.type, "exam");
  assert.equal(byId.get(assignment.id)?.type, "assignment");
  assert.equal(byId.get(klass.id)?.type, "class");
  assert.equal(byId.get(deadline.id)?.type, "deadline");
  assert.equal(reloaded.events.length, 4);
});

test("F4-22. excluir evento nao exclui o conteudo relacionado (teste 17)", () => {
  const { content } = seedContent();
  const event = eventService.createEventEntry({ type: "exam", title: "P1", date: "2026-11-05", contentIds: [content.id] });
  eventService.deleteEvent(event.id);
  assert.ok(contentService.getContent(content.id));
  assert.equal(eventService.getEvent(event.id), null);
});

test("F4-23. eventos e revisoes permanecem em colecoes separadas apos fluxo completo (teste 23)", () => {
  const { content } = seedContent();
  reviewService.scheduleManualReview(content.id, nowIso());
  const event = eventService.createEventEntry({ type: "exam", title: "Prova", date: "2026-11-06", contentIds: [content.id] });
  studyService.registerActivity(content.id);

  const db = readDb();
  // uma revisão pendente (do seedContent + scheduleInitialReview) e nenhum
  // vazamento de tipo entre as coleções.
  assert.ok(db.reviews.length >= 1);
  assert.equal(db.events.length, 1);
  assert.equal(db.reviews.some((r) => r.id === event.id), false);
  assert.equal(db.events.some((e) => e.id === reviewService.getReviewsForContent(content.id)[0].id), false);
  // getEventsForContent só devolve o AcademicEvent; a revisão nunca aparece ali.
  const eventsForContent = eventService.getEventsForContent(content.id);
  assert.deepEqual(eventsForContent.map((e) => e.id), [event.id]);
});

// ─── Fase 4 — excluir conteudo (UI) com cascata segura ────────────────────────

test("F4-19. excluir conteudo com evento compartilhado preserva o evento para o outro conteudo", () => {
  const a = seedContent({ subjectName: "Matemática" });
  const b = seedContent({ subjectName: "Física" });
  const event = eventService.createEventEntry({
    type: "exam", title: "Prova conjunta", date: "2026-03-10",
    contentIds: [a.content.id, b.content.id],
  });
  reviewService.scheduleManualReview(a.content.id, nowIso());
  const fc = contentService.getContent(a.content.id).flashcards[0];
  studyService.recordFlashcardAttempt({ flashcardId: fc.id, contentId: a.content.id, correct: true });

  contentService.deleteContent(a.content.id);

  const stillThere = eventService.getEvent(event.id);
  assert.ok(stillThere);
  assert.deepEqual(stillThere.contentIds, [b.content.id]);
  assert.equal(reviewService.getReviewsForContent(a.content.id).length, 0);
  assert.equal(studyService.getAttemptsForContent(a.content.id).flashcardAttempts.length, 0);

  // nenhuma referência quebrada sobra para a varredura de integridade encontrar
  const removed = integrityService.sweepOrphans();
  assert.deepEqual(removed, { reviews: 0, flashcardAttempts: 0, quizAttempts: 0, eventContentRefs: 0, contentSubjectRefs: 0 });
});

// ─── Fase 4 — mover conteudo entre materias preserva tudo ─────────────────────

test("F4-18. mover conteudo preserva id, fotos, flashcards, quizzes, notas, tentativas, reviews e eventos", () => {
  const { content } = seedContent();
  contentService.addImageToContent(content.id, { dataUrl: "data:image/jpeg;base64,AAA" });
  contentService.updateNotes(content.id, "minha anotação");
  reviewService.scheduleManualReview(content.id, nowIso());
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

// ─── Fase 5 — evolutionService ───────────────────────────────────────────────

test("F5-1. banco vazio: resumo de evolucao sem atividade e taxas nulas", () => {
  const summary = evolutionService.getEvolutionSummary();
  assert.equal(summary.hasActivity, false);
  assert.equal(summary.totalContents, 0);
  assert.equal(summary.contentsStudied, 0);
  assert.equal(summary.quizAccuracy, null);
  assert.equal(summary.flashcardAccuracy, null);
  assert.equal(summary.overallAccuracy, null);
});

test("F5-2. conteudo criado e nunca estudado nao entra em contentsStudied", () => {
  seedContent();
  const summary = evolutionService.getEvolutionSummary();
  assert.equal(summary.totalContents, 1);
  assert.equal(summary.contentsStudied, 0);
  assert.equal(summary.hasActivity, false);
});

test("F5-3. um quiz de 2 questoes com 1 acerto atualiza resumo geral", () => {
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
  const summary = evolutionService.getEvolutionSummary();
  assert.equal(summary.questionsAnswered, 2);
  assert.equal(summary.correctAnswers, 1);
  assert.equal(summary.incorrectAnswers, 1);
  assert.equal(summary.quizAccuracy, 50);
  assert.equal(summary.hasActivity, true);
});

test("F5-4. desempenho de materia agrega so conteudos ativos, sem distorcer media", () => {
  const subject = subjectService.createSubjectEntry("Matemática");
  const a = contentService.createContentEntry({ subjectId: subject.id, subjectName: subject.name, title: "Derivadas" }).content;
  const b = contentService.createContentEntry({ subjectId: subject.id, subjectName: subject.name, title: "Limites" }).content;
  contentService.createContentEntry({ subjectId: subject.id, subjectName: subject.name, title: "Integrais" }); // sem atividade

  studyService.recordQuizAttempt({ quizId: "qz_a", contentId: a.id, answers: buildAnswers(20, 17) }); // 85%
  studyService.registerActivity(a.id);
  studyService.recordQuizAttempt({ quizId: "qz_b", contentId: b.id, answers: buildAnswers(100, 72) }); // 72%
  studyService.registerActivity(b.id);

  const perf = evolutionService.calculateSubjectPerformance(subject.id);
  assert.equal(perf.contentsCount, 3);
  assert.equal(perf.contentsWithActivity, 2);
  assert.equal(perf.hasActivity, true);
  // soma bruta: (17+72)/(20+100)*100 = 74 — nao a media aritmetica (85+72+0)/3 = 52
  assert.equal(perf.accuracy, Math.round(((17 + 72) / (20 + 100)) * 100));
  assert.notEqual(perf.accuracy, Math.round((85 + 72 + 0) / 3));
});

test("F5-5. materia sem nenhum conteudo ativo fica com accuracy nula", () => {
  const subject = subjectService.createSubjectEntry("Física");
  contentService.createContentEntry({ subjectId: subject.id, subjectName: subject.name, title: "Cinemática" });
  const perf = evolutionService.calculateSubjectPerformance(subject.id);
  assert.equal(perf.accuracy, null);
  assert.equal(perf.hasActivity, false);
  assert.equal(evolutionService.getSubjectPerformances().some((s) => s.subjectId === subject.id), false);
});

test("F5-6. conteudo com menos de 3 interacoes e 100% fica em developing, nao mastered", () => {
  const { content } = seedContent();
  const fc = contentService.getContent(content.id).flashcards[0];
  studyService.recordFlashcardAttempt({ flashcardId: fc.id, contentId: content.id, correct: true });
  studyService.registerActivity(content.id);
  const perf = evolutionService.calculateContentPerformance(content.id);
  assert.equal(perf.interactions, 1);
  assert.equal(perf.accuracy, 100);
  assert.equal(perf.masteryLevel, "developing");
});

test("F5-7. banco vazio: pontos fortes e conteudos para reforco ficam vazios", () => {
  assert.deepEqual(evolutionService.getStrongSubjects(), []);
  assert.deepEqual(evolutionService.getWeakContents(), []);
});

test("F5-8. materia sem atividade nunca aparece em getStrongSubjects", () => {
  const subject = subjectService.createSubjectEntry("Filosofia");
  contentService.createContentEntry({ subjectId: subject.id, subjectName: subject.name, title: "Ética" });
  assert.equal(evolutionService.getStrongSubjects().some((s) => s.subjectId === subject.id), false);
});

test("F5-9. conteudo com 58% aparece em getWeakContents com reason low_accuracy", () => {
  const { content } = seedContent();
  const quiz = contentService.getContent(content.id).quizzes[0];
  studyService.recordQuizAttempt({ quizId: quiz.id, contentId: content.id, answers: buildAnswers(100, 58) });
  studyService.registerActivity(content.id);
  const weak = evolutionService.getWeakContents();
  const found = weak.find((w) => w.contentId === content.id);
  assert.ok(found, "conteudo com 58% deveria aparecer em getWeakContents");
  assert.equal(found.reason, "low_accuracy");
  assert.equal(found.accuracy, 58);
});

test("F5-10. conteudo com review atrasada e sem tentativas aparece com reason overdue_review", () => {
  const { content } = seedContent();
  reviewService.scheduleManualReview(content.id, nowIso());
  const pending = reviewService.getPendingReviews().find((r) => r.contentId === content.id);
  withDb((db) => ({
    ...db,
    reviews: db.reviews.map((r) => (r.id === pending.id ? { ...r, scheduledFor: "2000-01-01T00:00:00.000Z" } : r)),
  }));
  const weak = evolutionService.getWeakContents();
  const found = weak.find((w) => w.contentId === content.id);
  assert.ok(found, "conteudo com review atrasada deveria aparecer em getWeakContents");
  assert.equal(found.reason, "overdue_review");
});

test("F5-11. banco vazio: historico semanal e delta ficam vazios", () => {
  assert.deepEqual(evolutionService.getProgressHistory(), []);
  assert.equal(evolutionService.getAccuracyDelta(), null);
});

test("F5-12. duas semanas com atividade separadas por semana vazia geram exatamente 2 pontos", () => {
  const { content } = seedContent();
  const quiz = contentService.getContent(content.id).quizzes[0];
  const attempt1 = studyService.recordQuizAttempt({ quizId: quiz.id, contentId: content.id, answers: buildAnswers(10, 6) });
  const attempt2 = studyService.recordQuizAttempt({ quizId: quiz.id, contentId: content.id, answers: buildAnswers(10, 8) });
  withDb((db) => ({
    ...db,
    quizAttempts: db.quizAttempts.map((a) => {
      if (a.id === attempt1.id) return { ...a, answeredAt: "2026-01-05T12:00:00.000Z" }; // segunda, semana 1
      if (a.id === attempt2.id) return { ...a, answeredAt: "2026-01-19T12:00:00.000Z" }; // segunda, semana 3 (pula semana 2)
      return a;
    }),
  }));
  const history = evolutionService.getProgressHistory();
  assert.equal(history.length, 2);
  assert.equal(history[0].answered, 10);
  assert.equal(history[0].accuracy, 60);
  assert.equal(history[1].accuracy, 80);
});

test("F5-13. domingo e a segunda seguinte caem em semanas diferentes", () => {
  const { content } = seedContent();
  const quiz = contentService.getContent(content.id).quizzes[0];
  const sunday = studyService.recordQuizAttempt({ quizId: quiz.id, contentId: content.id, answers: buildAnswers(4, 4) });
  const monday = studyService.recordQuizAttempt({ quizId: quiz.id, contentId: content.id, answers: buildAnswers(4, 2) });
  withDb((db) => ({
    ...db,
    quizAttempts: db.quizAttempts.map((a) => {
      if (a.id === sunday.id) return { ...a, answeredAt: "2026-01-04T12:00:00.000Z" };
      if (a.id === monday.id) return { ...a, answeredAt: "2026-01-05T12:00:00.000Z" };
      return a;
    }),
  }));
  assert.equal(evolutionService.getProgressHistory().length, 2);
});

test("F5-14. getAccuracyDelta retorna null com apenas 1 ponto no historico", () => {
  const { content } = seedContent();
  const quiz = contentService.getContent(content.id).quizzes[0];
  studyService.recordQuizAttempt({ quizId: quiz.id, contentId: content.id, answers: buildAnswers(10, 5) });
  assert.equal(evolutionService.getAccuracyDelta(), null);
});

test("F5-15. revisao de plano aparece como pendente na evolucao", () => {
  const { content } = seedContent();
  contentService.updateContent(content.id, { reviewPlan: "weekly" });
  reviewService.applyReviewPlan(content.id);
  const progress = evolutionService.getReviewProgress();
  assert.equal(progress.pending, 1);
  assert.equal(progress.completed, 0);
  assert.equal(progress.contentsInReview.length, 1);
  assert.equal(progress.contentsInReview[0].contentId, content.id);
  assert.equal(progress.contentsInReview[0].reasonLabel, "Revisão programada");
});

test("F5-16. concluir revisao de plano incrementa concluidas e agenda a proxima", () => {
  const { content } = seedContent();
  contentService.updateContent(content.id, { reviewPlan: "weekly" });
  const initial = reviewService.applyReviewPlan(content.id);
  reviewService.markReviewDone(initial.id);
  const progress = evolutionService.getReviewProgress();
  assert.equal(progress.completed, 1);
  assert.equal(progress.pending, 1);
  assert.equal(progress.contentsInReview[0].contentId, content.id);
});

test("F5-17. review com scheduledFor no passado conta em overdue", () => {
  const { content } = seedContent();
  const review = reviewService.scheduleManualReview(content.id, nowIso());
  withDb((db) => ({
    ...db,
    reviews: db.reviews.map((r) => (r.id === review.id ? { ...r, scheduledFor: "2000-01-01T00:00:00.000Z" } : r)),
  }));
  const progress = evolutionService.getReviewProgress();
  assert.equal(progress.overdue, 1);
});

test("F5-18. banco vazio: recomendacoes ficam vazias", () => {
  assert.deepEqual(evolutionService.getRecommendations(), []);
});

test("F5-19. conteudo com 58% gera recomendacao de atencao apontando para ele", () => {
  const { content } = seedContent();
  const quiz = contentService.getContent(content.id).quizzes[0];
  studyService.recordQuizAttempt({ quizId: quiz.id, contentId: content.id, answers: buildAnswers(100, 58) });
  studyService.registerActivity(content.id);
  const recs = evolutionService.getRecommendations();
  const found = recs.find((r) => r.action?.contentId === content.id);
  assert.ok(found, "deveria haver recomendacao para o conteudo fraco");
  assert.equal(found.tone, "attention");
});

test("F5-20. duas chamadas seguidas com o mesmo banco retornam recomendacoes identicas", () => {
  const { content } = seedContent();
  const quiz = contentService.getContent(content.id).quizzes[0];
  studyService.recordQuizAttempt({ quizId: quiz.id, contentId: content.id, answers: buildAnswers(100, 58) });
  studyService.registerActivity(content.id);
  const first = evolutionService.getRecommendations();
  const second = evolutionService.getRecommendations();
  assert.deepEqual(first, second);
});

test("F5-28. banco vazio: getSubjectsToReview fica vazio", () => {
  assert.deepEqual(evolutionService.getSubjectsToReview(), []);
});

test("F5-29. materia com conteudo a 58% aparece com reason 'acerto baixo'", () => {
  const { subject, content } = seedContent();
  const quiz = contentService.getContent(content.id).quizzes[0];
  studyService.recordQuizAttempt({ quizId: quiz.id, contentId: content.id, answers: buildAnswers(100, 58) });
  studyService.registerActivity(content.id);
  const rows = evolutionService.getSubjectsToReview();
  const found = rows.find((r) => r.subjectId === subject.id);
  assert.ok(found, "materia com conteudo fraco deveria aparecer");
  assert.equal(found.reason, "acerto baixo");
  assert.equal(found.count, 1);
});

test("F5-30. materia com revisao atrasada aparece com reason 'revisao atrasada'", () => {
  const { subject, content } = seedContent();
  const review = reviewService.scheduleManualReview(content.id, nowIso());
  withDb((db) => ({
    ...db,
    reviews: db.reviews.map((r) => (r.id === review.id ? { ...r, scheduledFor: "2000-01-01T00:00:00.000Z" } : r)),
  }));
  const found = evolutionService.getSubjectsToReview().find((r) => r.subjectId === subject.id);
  assert.ok(found, "materia com revisao atrasada deveria aparecer");
  assert.equal(found.reason, "revisão atrasada");
});

test("F5-31. materia saudavel nao aparece em getSubjectsToReview", () => {
  const { subject, content } = seedContent();
  const quiz = contentService.getContent(content.id).quizzes[0];
  studyService.recordQuizAttempt({ quizId: quiz.id, contentId: content.id, answers: buildAnswers(100, 95) });
  studyService.registerActivity(content.id);
  assert.equal(evolutionService.getSubjectsToReview().some((r) => r.subjectId === subject.id), false);
});

test("F5-32. acerto baixo + revisao atrasada no mesmo conteudo geram reason combinado", () => {
  const { subject, content } = seedContent();
  const quiz = contentService.getContent(content.id).quizzes[0];
  studyService.recordQuizAttempt({ quizId: quiz.id, contentId: content.id, answers: buildAnswers(100, 40) });
  studyService.registerActivity(content.id);
  const review = reviewService.scheduleManualReview(content.id, nowIso());
  withDb((db) => ({
    ...db,
    reviews: db.reviews.map((r) => (r.id === review.id ? { ...r, scheduledFor: "2000-01-01T00:00:00.000Z" } : r)),
  }));
  const found = evolutionService.getSubjectsToReview().find((r) => r.subjectId === subject.id);
  assert.equal(found.reason, "acerto baixo e revisão atrasada");
  assert.equal(found.count, 1);
});

test("F5-33. getSubjectsToReview ordena por contagem desc e respeita limit", () => {
  const a = subjectService.createSubjectEntry("Historia");
  const b = subjectService.createSubjectEntry("Geografia");
  for (const [subj, n] of [[a, 2], [b, 1]]) {
    for (let i = 0; i < n; i++) {
      const { content } = contentService.createContentEntry({
        subjectId: subj.id,
        subjectName: subj.name,
        title: `t${i}`,
        quizzes: [{ questions: [{ type: "vf", question: "?", correctAnswer: true }] }],
      });
      const quiz = contentService.getContent(content.id).quizzes[0];
      studyService.recordQuizAttempt({ quizId: quiz.id, contentId: content.id, answers: buildAnswers(100, 20) });
      studyService.registerActivity(content.id);
    }
  }
  const rows = evolutionService.getSubjectsToReview();
  assert.equal(rows[0].subjectId, a.id);
  assert.equal(rows[0].count, 2);
  assert.equal(evolutionService.getSubjectsToReview({ limit: 1 }).length, 1);
});

test("F5-21. banco novo: assinatura comeca free/active", () => {
  const sub = subscriptionService.getSubscription();
  assert.equal(sub.plan, "free");
  assert.equal(sub.status, "active");
  assert.equal(subscriptionService.isPremium(sub), false);
});

test("F5-22. startTrial ativa premium/trial com trialEndsAt 7 dias a frente", () => {
  const sub = subscriptionService.startTrial();
  assert.equal(sub.plan, "premium");
  assert.equal(sub.status, "trial");
  assert.equal(subscriptionService.isPremium(sub), true);
  const diffDays = Math.round((new Date(sub.trialEndsAt) - new Date(sub.trialStartedAt)) / (24 * 60 * 60 * 1000));
  assert.equal(diffDays, subscriptionService.TRIAL_DAYS);
});

test("F5-23. teste com trialEndsAt no passado expira ao ler getSubscription", () => {
  localStorage.setItem("sv_subscription", JSON.stringify({
    plan: "premium", status: "trial", trialStartedAt: "2020-01-01T00:00:00.000Z", trialEndsAt: "2020-01-08T00:00:00.000Z",
  }));
  const sub = subscriptionService.getSubscription();
  assert.equal(sub.status, "expired");
  assert.equal(sub.plan, "free");
  assert.equal(subscriptionService.isPremium(sub), false);
});

test("F5-24. formato antigo (status plus) migra sem perder trialStartedAt", () => {
  localStorage.setItem("sv_subscription", JSON.stringify({ status: "plus", trialStartedAt: "2026-01-01T00:00:00.000Z" }));
  const sub = subscriptionService.getSubscription();
  assert.equal(sub.trialStartedAt, "2026-01-01T00:00:00.000Z");
  assert.ok(sub.plan === "premium" || sub.plan === "free"); // pode já ter expirado dependendo da data atual
});

test("F5-25. resetToFree volta ao estado gratuito", () => {
  subscriptionService.startTrial();
  const sub = subscriptionService.resetToFree();
  assert.equal(sub.plan, "free");
  assert.equal(sub.status, "active");
  assert.equal(subscriptionService.isPremium(), false);
});

test("F5-26. assinatura persiste entre leituras independentes (simula reload)", () => {
  subscriptionService.startTrial();
  const reread = subscriptionService.getSubscription();
  assert.equal(reread.plan, "premium");
  assert.equal(reread.status, "trial");
});

test("F5-27. plano premium nao altera nenhum numero academico", () => {
  const { content } = seedContent();
  const quiz = contentService.getContent(content.id).quizzes[0];
  studyService.recordQuizAttempt({ quizId: quiz.id, contentId: content.id, answers: buildAnswers(20, 15) });
  studyService.registerActivity(content.id);
  const summaryFree = evolutionService.getEvolutionSummary();

  subscriptionService.startTrial();
  const summaryPremium = evolutionService.getEvolutionSummary();

  assert.deepEqual(summaryFree, summaryPremium);
});

// ─── Fase 6 — exclusao e integridade ────────────────────────────────────────

test("F6-1. excluir conteudo remove reviews tentativas e o contentId dos eventos", () => {
  const { content } = seedContent();
  const quiz = contentService.getContent(content.id).quizzes[0];
  const fc = contentService.getContent(content.id).flashcards[0];
  reviewService.scheduleManualReview(content.id, nowIso());
  studyService.recordFlashcardAttempt({ flashcardId: fc.id, contentId: content.id, correct: true });
  studyService.recordQuizAttempt({ quizId: quiz.id, contentId: content.id, answers: buildAnswers(2, 2) });
  const event = eventService.createEventEntry({ type: "exam", title: "Prova", date: "2026-12-01", contentIds: [content.id] });

  contentService.deleteContent(content.id);

  const db = readDb();
  assert.equal(db.reviews.some((r) => r.contentId === content.id), false);
  assert.equal(db.flashcardAttempts.some((a) => a.contentId === content.id), false);
  assert.equal(db.quizAttempts.some((a) => a.contentId === content.id), false);
  assert.equal(eventService.getEvent(event.id), null); // ficou sem nenhum content vinculado -> evento removido
});

test("F6-2. excluir conteudo preserva evento que ainda tem outro conteudo vinculado", () => {
  const { content: c1 } = seedContent();
  const { content: c2 } = seedContent({ title: "Outro conteudo" });
  const event = eventService.createEventEntry({ type: "exam", title: "Prova", date: "2026-12-01", contentIds: [c1.id, c2.id] });

  contentService.deleteContent(c1.id);

  const stillThere = eventService.getEvent(event.id);
  assert.ok(stillThere);
  assert.deepEqual(stillThere.contentIds, [c2.id]);
});

test("F6-3. sweepOrphans limpa contentIds fantasmas do evento sem apagar o evento", () => {
  const { content } = seedContent();
  const event = eventService.createEventEntry({ type: "class", title: "Aula", date: "2026-12-01", contentIds: [content.id] });
  withDb((db) => ({ ...db, contents: [] })); // simula conteudo removido por fora do fluxo normal

  integrityService.sweepOrphans();

  const swept = eventService.getEvent(event.id);
  assert.ok(swept);
  assert.deepEqual(swept.contentIds, []);
});

test("F6-4. excluir conteudo inexistente nao quebra e retorna false", () => {
  assert.equal(contentService.deleteContent("cnt_never_existed"), false);
});

test("F6-5. ciclo completo: editar titulo resumo nota foto materia e registrar atividades mantem todas as relacoes", () => {
  const { content, subject: subjectA } = seedContent();
  const subjectB = subjectService.createSubjectEntry("Historia");

  contentService.updateContent(content.id, { title: "Novo titulo", summary: "Novo resumo", reviewPlan: "weekly" });
  reviewService.applyReviewPlan(content.id);
  contentService.updateNotes(content.id, "Minha nota de estudo");
  const { image } = contentService.addImageToContent(content.id, { dataUrl: "data:image/jpeg;base64,BBB" });
  contentService.moveContentToSubject(content.id, subjectB.id, subjectB.name);

  const quiz = contentService.getContent(content.id).quizzes[0];
  const fc = contentService.getContent(content.id).flashcards[0];
  studyService.recordQuizAttempt({ quizId: quiz.id, contentId: content.id, answers: buildAnswers(2, 2) });
  studyService.recordFlashcardAttempt({ flashcardId: fc.id, contentId: content.id, correct: true });
  studyService.registerActivity(content.id);

  const review = reviewService.nextPendingReview(content.id);
  reviewService.markReviewDone(review.id);

  const event = eventService.createEventEntry({ type: "exam", title: "Prova final", date: "2026-12-15", contentIds: [content.id] });

  const final = contentService.getContent(content.id);
  assert.equal(final.title, "Novo titulo");
  assert.equal(final.summary, "Novo resumo");
  assert.equal(final.notes, "Minha nota de estudo");
  assert.equal(final.images.some((i) => i.id === image.id), true);
  assert.equal(final.subjectId, subjectB.id);
  assert.equal(final.flashcards.length, 2); // nenhum flashcard novo gerado
  assert.equal(final.quizzes.length, 1); // nenhum quiz novo gerado
  assert.ok(final.mastery.level !== "not_started");
  assert.equal(reviewService.getReviewsForContent(content.id).some((r) => r.id === review.id && r.status === "completed"), true);
  assert.equal(eventService.getEventsForContent(content.id).some((e) => e.id === event.id), true);
  assert.notEqual(subjectA.id, subjectB.id);
});

test("F6-6. banco vazio nao quebra leituras de content evento e review inexistentes", () => {
  assert.equal(contentService.getContent("cnt_x"), null);
  assert.equal(eventService.getEvent("evt_x"), null);
  assert.equal(reviewService.nextPendingReview("cnt_x"), null);
  assert.deepEqual(performanceService.getContentPerformance("cnt_x").hasActivity, false);
});

test("F6-7. sv_db corrompido no localStorage e tratado como banco vazio", () => {
  localStorage.setItem("sv_db", "{ isso nao e json valido");
  assert.deepEqual(contentService.getContents(), []);
  assert.deepEqual(subjectService.getSubjects(), []);
});

test("F6-8. conteudo sem flashcards quiz reviews ou eventos nao quebra desempenho nem evolucao", () => {
  const { content } = contentService.createContentEntry({
    subjectId: null, subjectName: "", title: "Conteudo vazio", summary: "s",
    flashcards: [], quizzes: [], openQuestions: [],
  });
  const performance = performanceService.getContentPerformance(content.id);
  assert.equal(performance.hasActivity, false);
  assert.equal(performance.overall, null);
  assert.equal(reviewService.getReviewsForContent(content.id).length, 0);
  assert.equal(eventService.getEventsForContent(content.id).length, 0);
  const summary = evolutionService.getEvolutionSummary();
  assert.equal(summary.overallAccuracy, null);
  assert.equal(summary.totalContents, 1);
});

// ─── Fase 7 — revisões atreladas a plano/compromisso ────────────────────────

function futureDateKey(days) {
  return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
}

test("F7-1. syncCommitmentReviews monta a serie D-7/D-3/D-1 para um evento distante", () => {
  const { content } = seedContent();
  eventService.createEventEntry({ type: "exam", title: "Prova", date: futureDateKey(30), contentIds: [content.id] });
  const pending = reviewService.getReviewsForContent(content.id).filter((r) => r.status === "pending" && r.kind === "commitment");
  assert.equal(pending.length, 3);
  assert.ok(pending.every((r) => r.eventId));
});

test("F7-2. marcos ja passados sao descartados (evento em 2 dias -> so D-1)", () => {
  const { content } = seedContent();
  eventService.createEventEntry({ type: "assignment", title: "Trabalho", date: futureDateKey(2), contentIds: [content.id] });
  const pending = reviewService.getReviewsForContent(content.id).filter((r) => r.status === "pending" && r.kind === "commitment");
  assert.equal(pending.length, 1);
});

test("F7-3. excluir o evento cancela as revisoes de compromisso pendentes", () => {
  const { content } = seedContent();
  const ev = eventService.createEventEntry({ type: "exam", title: "P1", date: futureDateKey(20), contentIds: [content.id] });
  assert.ok(reviewService.getReviewsForContent(content.id).some((r) => r.kind === "commitment"));
  eventService.deleteEvent(ev.id);
  assert.equal(reviewService.getReviewsForContent(content.id).filter((r) => r.status === "pending" && r.kind === "commitment").length, 0);
});

test("F7-4. serie migra para o evento futuro mais proximo", () => {
  const { content } = seedContent();
  eventService.createEventEntry({ type: "exam", title: "Longe", date: futureDateKey(40), contentIds: [content.id] });
  eventService.createEventEntry({ type: "exam", title: "Perto", date: futureDateKey(10), contentIds: [content.id] });
  const pending = reviewService.getReviewsForContent(content.id).filter((r) => r.status === "pending" && r.kind === "commitment");
  const eventIds = new Set(pending.map((r) => r.eventId));
  assert.equal(eventIds.size, 1);
});

test("F7-5. tipo 'class' e 'other' nao geram revisao de compromisso", () => {
  const { content } = seedContent();
  eventService.createEventEntry({ type: "class", title: "Aula", date: futureDateKey(20), contentIds: [content.id] });
  assert.equal(reviewService.getReviewsForContent(content.id).filter((r) => r.kind === "commitment").length, 0);
});

test("F7-6. reconcileReviews limpa revisoes pendentes sem intencao e e idempotente", () => {
  const { content } = seedContent();
  withDb((db) => ({
    ...db,
    reviews: [
      ...db.reviews,
      { id: "rev_legacy", contentId: content.id, stage: 1, scheduledFor: nowIso(), status: "pending", reason: "consolidation", completedAt: null, updatedAt: nowIso(), skippedAt: null },
    ],
  }));
  reviewService.reconcileReviews();
  assert.equal(readDb().reviews.some((r) => r.id === "rev_legacy"), false);
  const after1 = readDb().reviews.length;
  reviewService.reconcileReviews();
  assert.equal(readDb().reviews.length, after1);
});

test("F7-7. reconcileReviews rola revisao vencida para hoje e marca overdue", () => {
  const { content } = seedContent();
  const manual = reviewService.scheduleManualReview(content.id, "2000-01-01T12:00:00.000Z");
  reviewService.reconcileReviews();
  const rolled = readDb().reviews.find((r) => r.id === manual.id);
  assert.equal(rolled.overdue, true);
  assert.ok(new Date(rolled.scheduledFor).getTime() >= new Date(new Date().setHours(0, 0, 0, 0)).getTime());
  assert.equal(reviewService.reviewLabel(rolled), "Atrasada");
});

test("F7-8. reviewLabel distingue plano, compromisso e atrasada", () => {
  const { content } = seedContent();
  contentService.updateContent(content.id, { reviewPlan: "weekly" });
  const plan = reviewService.applyReviewPlan(content.id);
  assert.equal(reviewService.reviewLabel(plan), "Revisão programada");
  eventService.createEventEntry({ type: "exam", title: "Prova", date: futureDateKey(20), contentIds: [content.id] });
  const commit = reviewService.getReviewsForContent(content.id).find((r) => r.kind === "commitment");
  assert.equal(reviewService.reviewLabel(commit), "Revisão para prova");
});

test("F7-9. carga: revisoes de plano nao empilham alem do teto no mesmo dia", () => {
  const day = new Set();
  for (let i = 0; i < 8; i++) {
    const { content } = seedContent({ subjectName: `M${i}` });
    contentService.updateContent(content.id, { reviewPlan: "weekly" });
    const r = reviewService.applyReviewPlan(content.id);
    day.add(r.scheduledFor.slice(0, 10));
  }
  // 8 revisoes, teto 3/dia -> pelo menos 3 dias distintos
  assert.ok(day.size >= 3, `esperado >=3 dias distintos, veio ${day.size}`);
});

test("F7-10. trocar a cadencia reagenda a revisao de plano pendente para o novo periodo", () => {
  const { content } = seedContent();
  contentService.updateContent(content.id, { reviewPlan: "weekly" });
  const weekly = reviewService.applyReviewPlan(content.id);

  contentService.updateContent(content.id, { reviewPlan: "monthly" });
  const monthly = reviewService.applyReviewPlan(content.id, undefined, { reschedule: true });

  assert.equal(monthly.id, weekly.id); // mesma revisao, so mudou a data
  assert.ok(new Date(monthly.scheduledFor) > new Date(weekly.scheduledFor), "mensal cai bem depois de semanal");
  const daysOut = (new Date(monthly.scheduledFor) - Date.now()) / 86400000;
  assert.ok(daysOut >= 27 && daysOut <= 34, `esperado ~30 dias, veio ${Math.round(daysOut)}`);
  assert.equal(reviewService.getReviewsForContent(content.id).filter((r) => r.status === "pending").length, 1);
});

test("F7-11. sem reschedule, applyReviewPlan nao empurra a revisao ja agendada", () => {
  const { content } = seedContent();
  contentService.updateContent(content.id, { reviewPlan: "weekly" });
  const first = reviewService.applyReviewPlan(content.id);
  const again = reviewService.applyReviewPlan(content.id); // boot / idempotente
  assert.equal(again.id, first.id);
  assert.equal(again.scheduledFor, first.scheduledFor);
});

// ─── Fase 8: Chama do Conhecimento ────────────────────────────────────────────

test("F8-1. usuario novo: 0 semanas, 0/3, isFirstTime", () => {
  const state = knowledgeFlameService.getKnowledgeFlameState();
  assert.equal(state.streakWeeks, 0);
  assert.equal(state.completed, 0);
  assert.equal(state.isFirstTime, true);
  assert.equal(state.weekCompleted, false);
});

test("F8-2. revisao concluida nesta semana conta 1/3", () => {
  const { content } = seedContent();
  addReviewActivity(content.id, 0, 0);
  const state = knowledgeFlameService.getKnowledgeFlameState();
  assert.equal(state.completed, 1);
  assert.equal(state.isFirstTime, false);
});

test("F8-3. + quiz concluido conta 2/3", () => {
  const { content } = seedContent();
  addReviewActivity(content.id, 0, 0);
  addQuizActivity(content.id, 0, 1);
  const state = knowledgeFlameService.getKnowledgeFlameState();
  assert.equal(state.completed, 2);
  assert.equal(state.weekCompleted, false);
});

test("F8-4. + flashcards de outro conteudo fecha 3/3 e conclui a semana", () => {
  const { content: c1 } = seedContent();
  const { content: c2 } = seedContent({ subjectName: "Outra" });
  addReviewActivity(c1.id, 0, 0);
  addQuizActivity(c1.id, 0, 1);
  addFlashcardActivity(c2.id, 0, 2);
  const state = knowledgeFlameService.getKnowledgeFlameState();
  assert.equal(state.completed, 3);
  assert.equal(state.weekCompleted, true);
  assert.equal(state.remaining, 0);
});

test("F8-5. reload (novo readDb) mantem o mesmo estado", () => {
  const { content } = seedContent();
  addReviewActivity(content.id, 0, 0);
  addQuizActivity(content.id, 0, 1);
  const before = knowledgeFlameService.getKnowledgeFlameState();
  readDb(); // simula reload lendo o storage de novo
  const after = knowledgeFlameService.getKnowledgeFlameState();
  assert.deepEqual(after, before);
});

test("F8-6. um quiz com varias respostas internas conta 1 atividade, nao N", () => {
  const { content } = seedContent();
  withDb((db) => ({
    ...db,
    quizAttempts: [
      ...db.quizAttempts,
      createQuizAttempt({ quizId: "qz_fake", contentId: content.id, answers: buildAnswers(10, 7), answeredAt: isoInWeek(0, 0) }),
    ],
  }));
  const state = knowledgeFlameService.getKnowledgeFlameState();
  assert.equal(state.completed, 1);
});

test("F8-7. duas conclusoes validas do mesmo tipo contam separadamente", () => {
  const { content: c1 } = seedContent();
  const { content: c2 } = seedContent({ subjectName: "Outra" });
  withDb((db) => ({
    ...db,
    quizAttempts: [
      ...db.quizAttempts,
      createQuizAttempt({ quizId: "qz_a", contentId: c1.id, answers: buildAnswers(2, 1), answeredAt: isoInWeek(0, 0) }),
      createQuizAttempt({ quizId: "qz_b", contentId: c2.id, answers: buildAnswers(2, 2), answeredAt: isoInWeek(0, 1) }),
    ],
  }));
  const state = knowledgeFlameService.getKnowledgeFlameState();
  assert.equal(state.completed, 2);
});

test("F8-8. atividades so na semana anterior deixam a semana atual em 0/3", () => {
  const { content } = seedContent();
  addReviewActivity(content.id, 1, 0);
  addQuizActivity(content.id, 1, 1);
  addFlashcardActivity(content.id, 1, 2);
  const state = knowledgeFlameService.getKnowledgeFlameState();
  assert.equal(state.completed, 0);
  assert.equal(state.weekCompleted, false);
});

test("F8-9. 3 semanas consecutivas completas -> streakWeeks 3", () => {
  const { content } = seedContent();
  for (const weeksAgo of [2, 1, 0]) {
    addReviewActivity(content.id, weeksAgo, 0);
    addQuizActivity(content.id, weeksAgo, 1);
    addFlashcardActivity(content.id, weeksAgo, 2);
  }
  const state = knowledgeFlameService.getKnowledgeFlameState();
  assert.equal(state.streakWeeks, 3);
  assert.equal(state.weekCompleted, true);
});

test("F8-10. semana intermediaria incompleta reinicia a sequencia em 1", () => {
  const { content } = seedContent();
  // semana -3: completa; semana -2: so 1/3 (quebra a sequencia); semana -1: completa; atual: vazia
  addReviewActivity(content.id, 3, 0);
  addQuizActivity(content.id, 3, 1);
  addFlashcardActivity(content.id, 3, 2);
  addReviewActivity(content.id, 2, 0);
  addReviewActivity(content.id, 1, 0);
  addQuizActivity(content.id, 1, 1);
  addFlashcardActivity(content.id, 1, 2);
  const state = knowledgeFlameService.getKnowledgeFlameState();
  assert.equal(state.streakWeeks, 1);
  assert.equal(state.completed, 0); // semana atual sem atividade
});

test("F8-11. flashcards do mesmo conteudo no mesmo dia em 2 blocos contam 1", () => {
  const { content } = seedContent();
  addFlashcardActivity(content.id, 0, 0, 0);
  addFlashcardActivity(content.id, 0, 0, 4 * 60 * 60 * 1000); // 4h depois, mesmo dia
  const state = knowledgeFlameService.getKnowledgeFlameState();
  assert.equal(state.completed, 1);
});

test("F8-12. review pendente ou pulada nao conta como atividade", () => {
  const { content } = seedContent();
  addReviewActivity(content.id, 0, 0, "pending");
  addReviewActivity(content.id, 0, 1, "skipped");
  const state = knowledgeFlameService.getKnowledgeFlameState();
  assert.equal(state.completed, 0);
});

test("F8-13. timestamps invalidos sao ignorados sem lancar excecao", () => {
  const { content } = seedContent();
  withDb((db) => ({
    ...db,
    quizAttempts: [...db.quizAttempts, { ...createQuizAttempt({ quizId: "qz_bad", contentId: content.id, answers: buildAnswers(1, 1) }), answeredAt: "nao-e-uma-data" }],
    flashcardAttempts: [...db.flashcardAttempts, { ...createFlashcardAttempt({ flashcardId: "fc_bad", contentId: content.id, correct: true }), answeredAt: null }],
  }));
  assert.doesNotThrow(() => knowledgeFlameService.getKnowledgeFlameState());
  const state = knowledgeFlameService.getKnowledgeFlameState();
  assert.equal(state.completed, 0);
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
