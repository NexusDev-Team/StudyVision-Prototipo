// Recebe um `calendarEvent` no shape legado (vindo de PlanningSection/PlanningModal,
// que continuam sem mudanças) e grava a entidade correta no modelo novo:
// "Revisão" vira uma Review avulsa; os demais tipos viram/atualizam um AcademicEvent.
import { nowIso } from "../../utils/date.js";
import { getEventsForContent, createEventEntry, updateEvent } from "../../services/eventService.js";
import { scheduleManualReview } from "../../services/reviewService.js";
import { LEGACY_TO_CANONICAL_EVENT_TYPE } from "./legacyEventType.js";

export function applyLegacyCalendarEvent(contentId, contentTitle, legacyEvent) {
  if (!legacyEvent) return;

  if (legacyEvent.type === "Revisão") {
    scheduleManualReview(contentId, legacyEvent.date ? `${legacyEvent.date}T12:00:00.000Z` : nowIso());
    return;
  }

  const canonicalType = LEGACY_TO_CANONICAL_EVENT_TYPE[legacyEvent.type] || "other";
  const payload = {
    type: canonicalType,
    title: contentTitle,
    date: legacyEvent.date || null,
    time: legacyEvent.time || null,
    reminders: legacyEvent.reminders || [],
    contentIds: [contentId],
  };

  const existing = getEventsForContent(contentId)[0];
  if (existing) updateEvent(existing.id, payload);
  else createEventEntry(payload);
}
