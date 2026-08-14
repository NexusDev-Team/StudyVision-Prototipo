import { SAMPLE_ITEMS } from "../data/sampleContent";
import { isDueForReview } from "./reviewEngine";

export function getStoredItems() {
  try {
    const stored = JSON.parse(localStorage.getItem("sv_items") || "[]");
    const storedIds = new Set(stored.map(s => s.id));
    // Stored (possibly updated) items win over the hardcoded seed data for the same id.
    return [...stored, ...SAMPLE_ITEMS.filter(s => !storedIds.has(s.id))];
  } catch { return SAMPLE_ITEMS; }
}

export function saveItem(item) {
  try {
    const stored = JSON.parse(localStorage.getItem("sv_items") || "[]");
    const filtered = stored.filter(s => s.id !== item.id);
    localStorage.setItem("sv_items", JSON.stringify([item, ...filtered]));
  } catch {}
}

export function getDueItems() {
  return getStoredItems().filter(isDueForReview);
}
