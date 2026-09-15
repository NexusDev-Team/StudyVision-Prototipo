// Validação antes de persistir — nunca confiar cegamente em dados vindos da
// IA ou de uma migração. Retorna { valid, errors[] } em vez de lançar, para
// que o chamador decida (aplicar defaults, rejeitar, logar) sem quebrar o app.

import { EVENT_TYPES, LEGACY_EVENT_TYPES } from "./event.js";
import { FOCUS_SESSION_STATUSES } from "./focusSession.js";
import { READING_PROGRESS_STATUSES } from "./readingProgress.js";
import { FOCUS_DURATIONS, FOCUS_STEP_TYPES, LEARNING_PREFERENCE_KEYS, READING_RATES } from "../../constants.js";

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
  // Conteúdo sem matéria é um estado válido (captura recém-feita, IA sem
  // classificação, usuário ainda não organizou) — vira "Sem matéria" na UI.
  // O que não pode acontecer é subjectId sem o cache subjectName correspondente.
  if (content.subjectId && !content.subjectName) {
    errors.push("subjectId presente sem subjectName (cache desatualizado)");
  }
  if (content.recommendedDifficulty != null && !["easy", "medium", "hard"].includes(content.recommendedDifficulty)) {
    errors.push("recommendedDifficulty inválido");
  }
  // learningPreferences é opcional (null = conteúdo sem Modo Inclusão). Quando
  // presente, precisa ser um objeto plano de booleanos.
  if (content.learningPreferences != null) {
    const lp = content.learningPreferences;
    if (typeof lp !== "object" || Array.isArray(lp)) {
      errors.push("learningPreferences deveria ser um objeto ou null");
    } else if (Object.values(lp).some((v) => typeof v !== "boolean")) {
      errors.push("learningPreferences só aceita valores booleanos");
    }
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

// Modo Foco — a geração NUNCA é considerada válida (e portanto nunca é
// persistida) se qualquer uma destas regras falhar. Sem exceção silenciosa.
export function validateFocusSession(session) {
  const errors = [];
  if (!session || typeof session !== "object") {
    return { valid: false, errors: ["sessão de foco ausente ou inválida"] };
  }
  if (!session.id || typeof session.id !== "string") errors.push("id ausente");
  if (!session.contentId || typeof session.contentId !== "string") errors.push("contentId ausente");
  if (!FOCUS_DURATIONS.includes(session.durationMinutes)) errors.push("durationMinutes inválido");
  if (!FOCUS_SESSION_STATUSES.includes(session.status)) errors.push("status inválido");

  if (!Array.isArray(session.steps) || session.steps.length === 0) {
    errors.push("steps deveria ser um array não vazio");
  } else {
    session.steps.forEach((step, i) => {
      if (!step || typeof step !== "object") { errors.push(`steps[${i}] inválido`); return; }
      if (!step.id) errors.push(`steps[${i}] sem id`);
      if (step.sessionId !== session.id) errors.push(`steps[${i}] não referencia a sessão correta`);
      if (!FOCUS_STEP_TYPES.includes(step.type)) errors.push(`steps[${i}] com type inválido`);
      if (!step.title || !String(step.title).trim()) errors.push(`steps[${i}] sem title`);
      if (!step.content || !String(step.content).trim()) errors.push(`steps[${i}] sem content`);
    });
  }

  const maxIndex = Array.isArray(session.steps) ? Math.max(0, session.steps.length - 1) : 0;
  if (!Number.isInteger(session.currentStepIndex) || session.currentStepIndex < 0 || session.currentStepIndex > maxIndex) {
    errors.push("currentStepIndex fora da faixa");
  }

  const snapshot = session.inclusionPreferencesSnapshot;
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    errors.push("inclusionPreferencesSnapshot ausente ou inválido");
  } else {
    for (const key of LEARNING_PREFERENCE_KEYS) {
      if (typeof snapshot[key] !== "boolean") errors.push(`inclusionPreferencesSnapshot.${key} deveria ser booleano`);
    }
  }

  if (session.status === "completed" && !session.completedAt) {
    errors.push("sessão completed sem completedAt");
  }

  // Timer (Etapa 2) — campos opcionais: ausência (undefined/null) é válida
  // porque sessões geradas antes desta etapa não os possuem. Só invalida
  // quando presentes com o tipo errado.
  if (session.timerStartedAt != null && typeof session.timerStartedAt !== "string") {
    errors.push("timerStartedAt deveria ser string ISO ou null");
  }
  if (session.elapsedMs != null && (!Number.isInteger(session.elapsedMs) || session.elapsedMs < 0)) {
    errors.push("elapsedMs deveria ser um inteiro não negativo");
  }
  if (session.pausedAt != null && typeof session.pausedAt !== "string") {
    errors.push("pausedAt deveria ser string ISO ou null");
  }

  return { valid: errors.length === 0, errors };
}

// Ler Comigo — tolerante a campos ausentes por natureza (índice/rate/status
// sempre têm default na fábrica), mas nunca aceita tipos errados nem um
// "completed" sem completedAt real.
export function validateReadingProgress(progress) {
  const errors = [];
  if (!progress || typeof progress !== "object") {
    return { valid: false, errors: ["progresso de leitura ausente ou inválido"] };
  }
  if (!progress.id || typeof progress.id !== "string") errors.push("id ausente");
  if (!progress.contentId || typeof progress.contentId !== "string") errors.push("contentId ausente");
  if (!READING_PROGRESS_STATUSES.includes(progress.status)) errors.push("status inválido");
  if (!Number.isInteger(progress.currentSegmentIndex) || progress.currentSegmentIndex < 0) {
    errors.push("currentSegmentIndex inválido");
  }
  if (!Number.isInteger(progress.segmentCount) || progress.segmentCount < 0) {
    errors.push("segmentCount inválido");
  }
  if (!READING_RATES.includes(progress.playbackRate)) errors.push("playbackRate inválido");
  if (progress.sourceFingerprint != null && typeof progress.sourceFingerprint !== "string") {
    errors.push("sourceFingerprint deveria ser string ou null");
  }
  if (progress.status === "completed" && !progress.completedAt) {
    errors.push("progresso completed sem completedAt");
  }
  return { valid: errors.length === 0, errors };
}

export function validateEvent(event) {
  const errors = [];
  if (!event || typeof event !== "object") return { valid: false, errors: ["evento ausente ou inválido"] };
  if (!event.id) errors.push("id ausente");
  if (!event.title || !String(event.title).trim()) errors.push("título ausente");
  if (!EVENT_TYPES.includes(event.type) && !LEGACY_EVENT_TYPES.includes(event.type)) errors.push("tipo inválido");
  if (!event.date || !DATE_RE.test(event.date)) errors.push("data ausente ou em formato inválido (esperado YYYY-MM-DD)");
  if (!Array.isArray(event.contentIds)) errors.push("contentIds deveria ser um array");
  return { valid: errors.length === 0, errors };
}
