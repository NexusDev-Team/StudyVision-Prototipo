import { newId, ID_PREFIX } from "../../utils/id.js";
import { nowIso } from "../../utils/date.js";

// Estados possíveis: pending | completed | skipped.
export function createReview({ contentId, stage, scheduledFor, status, completedAt, reason, updatedAt, skippedAt } = {}) {
  const now = nowIso();
  return {
    id: newId(ID_PREFIX.review),
    contentId: contentId || null,
    stage: Number(stage) || 1,
    scheduledFor: scheduledFor || now,
    status: ["pending", "completed", "skipped"].includes(status) ? status : "pending",
    completedAt: completedAt || null,
    reason: reason || "spaced_repetition",
    updatedAt: updatedAt || now,
    skippedAt: skippedAt || null,
  };
}
