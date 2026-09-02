import { newId, ID_PREFIX } from "../../utils/id.js";
import { nowIso } from "../../utils/date.js";

export const EVENT_TYPES = ["exam", "assignment", "class", "deadline", "other"];

// Revisões NÃO são eventos acadêmicos — têm entidade própria (review.js).
export function createEvent({ type, title, date, time, reminders, contentIds, createdAt } = {}) {
  return {
    id: newId(ID_PREFIX.event),
    type: EVENT_TYPES.includes(type) ? type : "other",
    title: String(title || ""),
    date: date || null, // "YYYY-MM-DD"
    time: time || null, // "HH:MM"
    reminders: Array.isArray(reminders) ? reminders : [],
    contentIds: Array.isArray(contentIds) ? contentIds : [],
    createdAt: createdAt || nowIso(),
  };
}
