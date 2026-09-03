// Adaptador de compatibilidade: projeta um Content (+ suas reviews e eventos)
// no shape "item" que as telas legadas já esperam (mesmo formato de
// src/data/sampleContent.js), para reaproveitar toda a UI existente sem
// redesenho nesta fase.

import { getSubjectMeta, getSubjectEmoji } from "../../constants.js";
import { relativeLabel } from "../../utils/date.js";
import { REVIEW_OFFSETS } from "../../services/reviewService.js";
import { CANONICAL_TO_LEGACY_EVENT_TYPE } from "./legacyEventType.js";

const STAGE_LABELS = Object.fromEntries(REVIEW_OFFSETS.map((o) => [o.stage, o.label]));

function toLegacyReviewSchedule(reviews) {
  return [...reviews]
    .sort((a, b) => a.stage - b.stage)
    .map((r) => ({
      id: r.id, // usado só internamente pelo shim de storage.js para persistir avanços
      stage: r.stage,
      label: STAGE_LABELS[r.stage] || `Estágio ${r.stage}`,
      dueAt: new Date(r.scheduledFor).getTime(),
      done: r.status !== "pending",
    }));
}

function toLegacyCalendarEvent(event) {
  if (!event) return undefined;
  return {
    id: event.id,
    type: CANONICAL_TO_LEGACY_EVENT_TYPE[event.type] || "Trabalho",
    date: event.date,
    time: event.time,
    createdAt: new Date(event.createdAt).getTime(),
    reminders: event.reminders,
  };
}

export function toLegacyItem(content, { reviews = [], events = [] } = {}) {
  const meta = getSubjectMeta(content.subjectName);
  const primaryQuiz = content.quizzes[0];

  return {
    id: content.id,
    subject: content.subjectName,
    subjectIcon: getSubjectEmoji(content.subjectName),
    subjectColor: meta.color,
    subjectBg: meta.bg,
    topic: content.topic,
    concept: content.title,
    time: relativeLabel(content.createdAt),
    photo: content.images[0]?.dataUrl,
    extractedText: content.extractedText,
    summary: content.summary,
    notes: content.notes,
    concepts: content.keyConcepts,
    keywords: content.keywords,
    flashcards: content.flashcards.map((fc) => ({ id: fc.id, front: fc.front, back: fc.back })),
    questions: content.openQuestions.map((oq) => oq.question),
    quiz: primaryQuiz
      ? primaryQuiz.questions.map((q) => ({
          id: q.id,
          type: q.type,
          question: q.question,
          options: q.options,
          answer: q.correctAnswer,
          explanation: q.explanation,
        }))
      : [],
    difficulty: content.difficulty,
    isSample: content.isSample,
    reviewSchedule: toLegacyReviewSchedule(reviews),
    calendarEvent: toLegacyCalendarEvent(events[0]),
  };
}
