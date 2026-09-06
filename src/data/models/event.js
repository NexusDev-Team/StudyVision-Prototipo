import { newId, ID_PREFIX } from "../../utils/id.js";
import { nowIso } from "../../utils/date.js";

export const EVENT_TYPES = ["exam", "assignment", "deadline", "other"];

// Tipo legado ("Aula"/"Apresentação"), removido dos compromissos mas ainda
// aceito na validação para não invalidar dados já persistidos — renderiza
// como "Outro" via getEventTypeMeta.
export const LEGACY_EVENT_TYPES = ["class"];

// Metadados de apresentação por tipo. No calendário a cor do dia vem da
// matéria, então o tipo é distinguido pela FORMA do marcador (shape), não
// pela cor: prova ● / trabalho ▲ / entrega ✕ / outro ✱.
export const EVENT_TYPE_META = {
  exam: { label: "Prova", shortLabel: "Prova", icon: "GraduationCap", shape: "●", color: "#DC2626" },
  assignment: { label: "Trabalho", shortLabel: "Trabalho", icon: "FileText", shape: "▲", color: "#D97706" },
  deadline: { label: "Entrega", shortLabel: "Entrega", icon: "Clock", shape: "✕", color: "#7C3AED" },
  other: { label: "Outro", shortLabel: "Outro", icon: "CalendarDays", shape: "✱", color: "#64748B" },
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
