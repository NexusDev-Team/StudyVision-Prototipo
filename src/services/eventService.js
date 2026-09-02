// CRUD de AcademicEvent. Um evento pode referenciar N conteúdos, e um
// conteúdo pode aparecer em N eventos — sem o limite de "um evento por item"
// que existia no modelo legado.

import { readDb, withDb } from "../data/storage/index.js";
import { createEvent } from "../data/models/event.js";
import { nowIso } from "../utils/date.js";

export function getEvents() {
  return readDb().events;
}

export function getEvent(id) {
  return readDb().events.find((e) => e.id === id) || null;
}

export function getEventsForContent(contentId) {
  return readDb().events.filter((e) => e.contentIds.includes(contentId));
}

export function createEventEntry(input) {
  const event = createEvent(input);
  withDb((db) => ({ ...db, events: [...db.events, event] }));
  return event;
}

export function updateEvent(id, patch = {}) {
  const { id: _ignored, ...safePatch } = patch;
  let updated = null;
  withDb((db) => ({
    ...db,
    events: db.events.map((e) => {
      if (e.id !== id) return e;
      updated = { ...e, ...safePatch, id: e.id };
      return updated;
    }),
  }));
  return updated;
}

export function deleteEvent(id) {
  withDb((db) => ({ ...db, events: db.events.filter((e) => e.id !== id) }));
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
