import { useCallback } from "react";
import { useContentStore } from "../context/ContentStoreContext.jsx";
import { saveItem } from "../services/storage";
import { isDueForReview, markReviewDone } from "../services/reviewEngine";

// Consumidor fino do store único (ContentStoreContext). Mantém a mesma API que
// as telas legadas já usavam — mas agora todas compartilham o mesmo estado e
// um save/markDone recarrega para todo mundo de uma vez.
export function useStudyItems() {
  const { items, dueCount, reload, mutate } = useContentStore();

  const dueItems = items.filter(isDueForReview);

  const save = useCallback((item) => mutate(() => saveItem(item)), [mutate]);
  const markDone = useCallback((item) => mutate(() => markReviewDone(item)), [mutate]);

  return { items, dueItems, dueCount, reload, save, markDone };
}
