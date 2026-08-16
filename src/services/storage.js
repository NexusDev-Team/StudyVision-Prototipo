import { SAMPLE_ITEMS } from "../data/sampleContent";
import { isDueForReview } from "./reviewEngine";

export function getStoredItems() {
  try {
    const stored = JSON.parse(localStorage.getItem("sv_items") || "[]");
    // Demo captures reuse the same handful of concepts — keep only the most
    // recent save per concept (stored is newest-first, and takes priority
    // over the hardcoded seed data) so repeated captures don't pile up
    // duplicate library entries / due reviews.
    const seenConcepts = new Set();
    return [...stored, ...SAMPLE_ITEMS].filter(s => {
      if (seenConcepts.has(s.concept)) return false;
      seenConcepts.add(s.concept);
      return true;
    });
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
