import { SAMPLE_ITEMS } from "../data/sampleContent";
import { isDueForReview } from "./reviewEngine";

export function getStoredItems() {
  try {
    const stored = JSON.parse(localStorage.getItem("sv_items") || "[]");
    // Only drop a seed item once a real save with the same concept exists —
    // real captures are deduplicated by id (below), never by concept, so two
    // distinct AI results that happen to share a concept both stay visible.
    const savedConcepts = new Set(stored.map(s => s.concept));
    const seeds = SAMPLE_ITEMS.filter(s => !savedConcepts.has(s.concept));
    return [...stored, ...seeds];
  } catch { return SAMPLE_ITEMS; }
}

function writeItems(items) {
  localStorage.setItem("sv_items", JSON.stringify(items));
}

export function saveItem(item) {
  try {
    const stored = JSON.parse(localStorage.getItem("sv_items") || "[]");
    const filtered = stored.filter(s => s.id !== item.id);
    const next = [item, ...filtered];
    try {
      writeItems(next);
      return { ok: true };
    } catch (err) {
      if (err?.name !== "QuotaExceededError") throw err;
      // Cota estourada (fotos reais em base64 pesam) — poda os itens salvos mais
      // antigos e tenta de novo; em último caso, salva sem a foto.
      let pruned = next;
      while (pruned.length > 1) {
        pruned = pruned.slice(0, -1);
        try { writeItems(pruned); return { ok: true, reason: "pruned" }; } catch { /* segue podando */ }
      }
      try {
        writeItems([{ ...item, photo: undefined }]);
        return { ok: true, reason: "no-photo" };
      } catch {
        return { ok: false, reason: "quota" };
      }
    }
  } catch {
    return { ok: false, reason: "unknown" };
  }
}

export function getDueItems() {
  return getStoredItems().filter(isDueForReview);
}
