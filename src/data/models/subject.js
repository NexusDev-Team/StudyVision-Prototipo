import { newId, ID_PREFIX } from "../../utils/id.js";
import { nowIso } from "../../utils/date.js";

export function createSubject({ name, createdAt } = {}) {
  const now = nowIso();
  return {
    id: newId(ID_PREFIX.subject),
    name: String(name || "").trim() || "Sem matéria",
    createdAt: createdAt || now,
    updatedAt: now,
  };
}
