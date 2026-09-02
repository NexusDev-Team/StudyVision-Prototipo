import { newId, ID_PREFIX } from "../../utils/id.js";
import { nowIso } from "../../utils/date.js";

// correctAnswer é sempre um valor semântico, nunca um índice inferido da
// posição visual: número (índice da opção) para "mc", boolean para "vf".
export function createQuestion({ quizId, type, question, options, correctAnswer, explanation } = {}) {
  const normalizedType = type === "vf" ? "vf" : "mc";
  return {
    id: newId(ID_PREFIX.question),
    quizId: quizId || null,
    type: normalizedType,
    question: String(question || ""),
    options: normalizedType === "mc" ? (Array.isArray(options) ? options : []) : [],
    correctAnswer: normalizedType === "vf" ? Boolean(correctAnswer) : Number(correctAnswer) || 0,
    explanation: explanation || "",
  };
}

export function createQuiz({ contentId, source, createdAt, questions } = {}) {
  const id = newId(ID_PREFIX.quiz);
  return {
    id,
    contentId: contentId || null,
    source: source === "user" ? "user" : "ai",
    createdAt: createdAt || nowIso(),
    questions: (Array.isArray(questions) ? questions : []).map((q) => createQuestion({ ...q, quizId: id })),
  };
}

export function createQuizAttempt({ quizId, contentId, answers, answeredAt } = {}) {
  const normalizedAnswers = (Array.isArray(answers) ? answers : []).map((a) => ({
    questionId: a.questionId || null,
    selectedAnswer: a.selectedAnswer,
    correct: Boolean(a.correct),
  }));
  const totalQuestions = normalizedAnswers.length;
  const correctAnswers = normalizedAnswers.filter((a) => a.correct).length;
  const score = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;
  return {
    id: newId(ID_PREFIX.quizAttempt),
    quizId: quizId || null,
    contentId: contentId || null,
    score,
    correctAnswers,
    totalQuestions,
    answeredAt: answeredAt || nowIso(),
    answers: normalizedAnswers,
  };
}
