// Agendamento real de compromissos do modal de planejamento — persiste em
// sv_db via eventService / reviewService. (Antes era um setTimeout que não
// gravava nada.)

import { createEventEntry } from "./eventService";
import { scheduleManualReview } from "./reviewService";
import { nowIso } from "../utils/date";
import { LEGACY_TO_CANONICAL_EVENT_TYPE } from "../data/adapters/legacyEventType";

// type vem do PlanningModal em português ("Prova" | "Trabalho" | "Apresentação"
// | "Revisão"). "Revisão" cria uma Review avulsa; os demais criam um
// AcademicEvent ligado ao conteúdo. Nunca sobrescreve — cada chamada agenda um
// compromisso novo (um conteúdo pode ter N eventos).
export function scheduleCommitment({ contentId, title, type, date, time, reminders = [] }) {
  if (type === "Revisão") {
    const review = scheduleManualReview(contentId, date ? `${date}T12:00:00.000Z` : nowIso());
    return { kind: "review", id: review.id };
  }

  const event = createEventEntry({
    type: LEGACY_TO_CANONICAL_EVENT_TYPE[type] || "other",
    title,
    date: date || null,
    time: time || null,
    reminders,
    contentIds: [contentId],
  });
  return { kind: "event", id: event.id };
}
