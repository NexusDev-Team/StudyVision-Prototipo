// CRUD de AcademicEvent. Um evento pode referenciar N conteúdos, e um
// conteúdo pode aparecer em N eventos — sem o limite de "um evento por item"
// que existia no modelo legado.

import { readDb, withDb } from "../data/storage/index.js";
import { createEvent } from "../data/models/event.js";
import { validateEvent } from "../data/models/validate.js";
import { nowIso } from "../utils/date.js";

// Normaliza um evento lido do db para o formato atual — cobre eventos criados
// antes da Fase 4 (sem notes/updatedAt).
function normalizeEvent(event) {
  if (!event) return event;
  return { notes: "", updatedAt: null, ...event };
}

export function getEvents() {
  return readDb().events.map(normalizeEvent);
}

export function getEvent(id) {
  const event = readDb().events.find((e) => e.id === id);
  return event ? normalizeEvent(event) : null;
}

export function getEventsForContent(contentId) {
  return readDb().events.filter((e) => e.contentIds.includes(contentId)).map(normalizeEvent);
}

export class EventValidationError extends Error {
  constructor(message, errors) {
    super(message);
    this.name = "EventValidationError";
    this.errors = errors;
  }
}

export function createEventEntry(input) {
  const event = createEvent(input);
  const { valid, errors } = validateEvent(event);
  if (!valid) throw new EventValidationError(`Evento inválido: ${errors.join(", ")}`, errors);
  withDb((db) => ({ ...db, events: [...db.events, event] }));
  return event;
}

// Preserva id e createdAt; grava updatedAt. Valida o resultado antes de
// persistir, para uma edição não deixar o evento num estado inconsistente.
export function updateEvent(id, patch = {}) {
  const { id: _ignored, createdAt: _ignoredCreatedAt, ...safePatch } = patch;
  let updated = null;
  let validationError = null;
  withDb((db) => {
    const events = db.events.map((e) => {
      if (e.id !== id) return e;
      const candidate = { ...normalizeEvent(e), ...safePatch, id: e.id, createdAt: e.createdAt, updatedAt: nowIso() };
      const { valid, errors } = validateEvent(candidate);
      if (!valid) {
        validationError = new EventValidationError(`Evento inválido: ${errors.join(", ")}`, errors);
        return e;
      }
      updated = candidate;
      return candidate;
    });
    return validationError ? db : { ...db, events };
  });
  if (validationError) throw validationError;
  return updated;
}

// Retorna true se um evento existia e foi removido, false caso contrário.
export function deleteEvent(id) {
  let removed = false;
  withDb((db) => {
    removed = db.events.some((e) => e.id === id);
    return { ...db, events: db.events.filter((e) => e.id !== id) };
  });
  return removed;
}

export function linkContentToEvent(eventId, contentId) {
  let updated = null;
  withDb((db) => ({
    ...db,
    events: db.events.map((e) => {
      if (e.id !== eventId) return e;
      if (e.contentIds.includes(contentId)) {
        updated = e;
        return e;
      }
      updated = { ...e, contentIds: [...e.contentIds, contentId] };
      return updated;
    }),
  }));
  return updated;
}

export function unlinkContentFromEvent(eventId, contentId) {
  let updated = null;
  withDb((db) => ({
    ...db,
    events: db.events.map((e) => {
      if (e.id !== eventId) return e;
      updated = { ...e, contentIds: e.contentIds.filter((cid) => cid !== contentId) };
      return updated;
    }),
  }));
  return updated;
}

// nowIso reexportado por conveniência — evita import redundante em quem só
// precisa de createdAt ao montar um evento fora deste service.
export { nowIso };
