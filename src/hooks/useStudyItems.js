import { useState, useEffect, useCallback } from "react";
import { getStoredItems, saveItem } from "../services/storage";
import { isDueForReview, markReviewDone } from "../services/reviewEngine";

// Loads items once on mount, like every screen already did independently.
// Each caller gets its own instance/state — intentionally not a shared store.
export function useStudyItems() {
  const [items, setItems] = useState([]);

  const reload = useCallback(() => setItems(getStoredItems()), []);
  useEffect(() => { reload(); }, [reload]);

  const dueItems = items.filter(isDueForReview);

  const save = useCallback((item) => { saveItem(item); reload(); }, [reload]);
  const markDone = useCallback((item) => { const updated = markReviewDone(item); reload(); return updated; }, [reload]);

  return { items, dueItems, dueCount: dueItems.length, reload, save, markDone };
}
