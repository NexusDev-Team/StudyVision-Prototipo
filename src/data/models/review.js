import { newId, ID_PREFIX } from "../../utils/id.js";
import { nowIso } from "../../utils/date.js";

// Estados possíveis: pending | completed | skipped.
// kind: "plan" (cadência escolhida no conteúdo) | "commitment" (contagem
// regressiva rumo a um evento acadêmico) | "manual" (evento tipo "Revisão").
// Nenhuma revisão nasce sem um kind — some a repetição espaçada infinita.
export const REVIEW_KINDS = ["plan", "commitment", "manual"];

export function createReview({
  contentId,
  stage,
  scheduledFor,
  status,
  completedAt,
  reason,
  updatedAt,
  skippedAt,
  kind,
  eventId,
  overdue,
} = {}) {
  const now = nowIso();
  return {
    id: newId(ID_PREFIX.review),
    contentId: contentId || null,
    stage: Number(stage) || 1,
    scheduledFor: scheduledFor || now,
    status: ["pending", "completed", "skipped"].includes(status) ? status : "pending",
    completedAt: completedAt || null,
    reason: reason || kind || "plan",
    kind: REVIEW_KINDS.includes(kind) ? kind : "plan",
    eventId: eventId || null,
    overdue: overdue === true,
    updatedAt: updatedAt || now,
    skippedAt: skippedAt || null,
  };
}
