// Migração do formato legado (localStorage["sv_items"], um array plano de
// "items") para o modelo v2 (localStorage["sv_db"], entidades relacionadas).
//
// Não apaga o dado antigo: quem chamar migrate() é responsável por manter
// "sv_items" como backup (ver LEGACY_KEY / BACKUP_KEY em index.js).

import { newId, ID_PREFIX } from "../../utils/id.js";
import { nowIso, toIso, addDaysIso } from "../../utils/date.js";
import { createContent } from "../models/content.js";
import { createSubject } from "../models/subject.js";
import { createReview } from "../models/review.js";
import { createEvent } from "../models/event.js";

// PLANNING_TYPES legado (src/constants.js) → tipos canônicos de AcademicEvent.
// "Revisão" nunca vira evento acadêmico — revisões têm entidade própria.
const LEGACY_EVENT_TYPE_MAP = {
  Prova: "exam",
  Trabalho: "assignment",
  Apresentação: "class",
};

function resolveSubjectId(subjectName, subjectsByName) {
  const name = (subjectName || "").trim() || "Sem matéria";
  if (subjectsByName.has(name)) return subjectsByName.get(name).id;
  const subject = createSubject({ name });
  subjectsByName.set(name, subject);
  return subject.id;
}

function migrateQuizQuestion(q) {
  const type = q.type === "vf" ? "vf" : "mc";
  return {
    type,
    question: q.question || "",
    options: type === "mc" ? q.options || [] : [],
    correctAnswer: type === "vf" ? Boolean(q.answer) : Number(q.answer) || 0,
    explanation: q.explanation || "",
  };
}

function migrateReviewSchedule(reviewSchedule, contentId) {
  if (!Array.isArray(reviewSchedule)) return [];
  return reviewSchedule.map((stage) =>
    createReview({
      contentId,
      stage: stage.stage,
      scheduledFor: toIso(stage.dueAt) || nowIso(),
      status: stage.done ? "completed" : "pending",
      completedAt: stage.done ? toIso(stage.dueAt) : null,
      reason: "spaced_repetition",
    })
  );
}

function deriveCreatedAt(item) {
  const firstStage = Array.isArray(item.reviewSchedule) ? item.reviewSchedule[0] : null;
  if (firstStage?.dueAt) {
    // O primeiro estágio é D+1 a partir da captura — subtrai 1 dia.
    return addDaysIso(toIso(firstStage.dueAt), -1) || nowIso();
  }
  return nowIso();
}

// Converte um item legado em { content, reviews, event|null }.
function migrateItem(item, subjectsByName) {
  const subjectId = resolveSubjectId(item.subject, subjectsByName);
  const createdAt = deriveCreatedAt(item);

  const content = createContent({
    id: item.id ? `${ID_PREFIX.content}_legacy_${item.id}` : undefined,
    subjectId,
    subjectName: item.subject || "",
    topic: item.topic || "",
    title: item.concept || item.topic || "Conteúdo sem título",
    extractedText: item.extractedText || "",
    summary: item.summary || "",
    notes: "",
    keyConcepts: Array.isArray(item.concepts) ? item.concepts : [],
    keywords: Array.isArray(item.keywords) ? item.keywords : [],
    difficulty: item.difficulty || null,
    images: item.photo ? [{ dataUrl: item.photo, order: 0 }] : [],
    flashcards: Array.isArray(item.flashcards)
      ? item.flashcards.map((f) => ({ front: f.front || "", back: f.back || "", source: "ai" }))
      : [],
    quizzes: Array.isArray(item.quiz) && item.quiz.length > 0
      ? [{ source: "ai", questions: item.quiz.map(migrateQuizQuestion) }]
      : [],
    openQuestions: Array.isArray(item.questions) ? item.questions : [],
    isSample: false,
    createdAt,
  });

  const reviews = migrateReviewSchedule(item.reviewSchedule, content.id);

  let event = null;
  if (item.calendarEvent && item.calendarEvent.type !== "Revisão") {
    const type = LEGACY_EVENT_TYPE_MAP[item.calendarEvent.type] || "other";
    event = createEvent({
      type,
      title: content.title,
      date: item.calendarEvent.date || null,
      time: item.calendarEvent.time || null,
      reminders: item.calendarEvent.reminders || [],
      contentIds: [content.id],
      createdAt: toIso(item.calendarEvent.createdAt) || createdAt,
    });
  } else if (item.calendarEvent && item.calendarEvent.type === "Revisão") {
    // Vira uma revisão manual em vez de evento acadêmico.
    reviews.push(
      createReview({
        contentId: content.id,
        stage: reviews.length + 1,
        scheduledFor: item.calendarEvent.date ? `${item.calendarEvent.date}T12:00:00.000Z` : nowIso(),
        status: "pending",
        reason: "manual",
      })
    );
  }

  return { content, reviews, event };
}

// Recebe o array de items legados (já parseado) e devolve um db v2 completo.
export function migrateItems(legacyItems) {
  const subjectsByName = new Map();
  const contents = [];
  const reviews = [];
  const events = [];

  for (const item of Array.isArray(legacyItems) ? legacyItems : []) {
    const { content, reviews: itemReviews, event } = migrateItem(item, subjectsByName);
    contents.push(content);
    reviews.push(...itemReviews);
    if (event) events.push(event);
  }

  return {
    version: 2,
    subjects: [...subjectsByName.values()],
    contents,
    flashcardAttempts: [],
    quizAttempts: [],
    reviews,
    events,
  };
}

export function needsMigration({ hasDb, hasLegacyItems }) {
  return !hasDb && hasLegacyItems;
}
