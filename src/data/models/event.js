import { newId, ID_PREFIX } from "../../utils/id.js";
import { nowIso } from "../../utils/date.js";

export const EVENT_TYPES = ["exam", "assignment", "class", "deadline", "other"];

// Metadados de apresentação por tipo — nunca depender só de cor para
// distinguir tipos (acessibilidade). shape é usado como marcador textual
// simples (legenda, badges) sem precisar de biblioteca de ícones.
export const EVENT_TYPE_META = {
  exam: { label: "Prova", shortLabel: "Prova", icon: "GraduationCap", shape: "●", color: "#DC2626" },
  assignment: { label: "Trabalho", shortLabel: "Trabalho", icon: "FileText", shape: "◆", color: "#D97706" },
  class: { label: "Aula", shortLabel: "Aula", icon: "Presentation", shape: "▲", color: "#2563EB" },
  deadline: { label: "Entrega", shortLabel: "Entrega", icon: "Clock", shape: "■", color: "#7C3AED" },
  other: { label: "Outro", shortLabel: "Outro", icon: "CalendarDays", shape: "○", color: "#64748B" },
};

export function getEventTypeMeta(type) {
  return EVENT_TYPE_META[type] || EVENT_TYPE_META.other;
}

// Revisões NÃO são eventos acadêmicos — têm entidade própria (review.js).
export function createEvent({ type, title, date, time, notes, reminders, contentIds, createdAt, updatedAt } = {}) {
  return {
    id: newId(ID_PREFIX.event),
    type: EVENT_TYPES.includes(type) ? type : "other",
    title: String(title || "").trim(),
    date: date || null, // "YYYY-MM-DD"
    time: time || null, // "HH:MM"
    notes: String(notes || ""),
    reminders: Array.isArray(reminders) ? reminders : [],
    contentIds: Array.isArray(contentIds) ? contentIds : [],
    createdAt: createdAt || nowIso(),
    updatedAt: updatedAt || null,
  };
}
