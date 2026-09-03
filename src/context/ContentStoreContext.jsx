// Fonte única de estado dos conteúdos. Antes cada tela chamava useStudyItems()
// por conta própria e cada instância tinha seu próprio array — um reload numa
// não alcançava as outras. Agora há um provider só, carregado uma vez no topo
// da árvore; toda mutação passa por mutate(), que roda o serviço e recarrega
// o snapshot, mantendo App, Biblioteca e Revisão sempre em sincronia.

import { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { readDb } from "../data/storage/index.js";
import { endOfTodayIso } from "../utils/date.js";
import { toLegacyItem } from "../data/adapters/toLegacyItem.js";

const ContentStoreContext = createContext(null);

function readSnapshot() {
  const db = readDb();
  return {
    contents: db.contents,
    subjects: db.subjects,
    reviews: db.reviews,
    events: db.events,
  };
}

function groupBy(list, keyFn) {
  const map = new Map();
  for (const entry of list) {
    for (const key of keyFn(entry)) {
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(entry);
    }
  }
  return map;
}

export function ContentStoreProvider({ children }) {
  const [snapshot, setSnapshot] = useState(readSnapshot);

  const reload = useCallback(() => setSnapshot(readSnapshot()), []);
  useEffect(() => { reload(); }, [reload]);

  // Executa a operação de serviço e recarrega o estado do disco numa tacada só.
  const mutate = useCallback((fn) => {
    const result = fn();
    setSnapshot(readSnapshot());
    return result;
  }, []);

  const value = useMemo(() => {
    const { contents, subjects, reviews, events } = snapshot;

    const reviewsByContent = groupBy(reviews, (r) => [r.contentId]);
    const eventsByContent = groupBy(events, (e) => e.contentIds);

    // Projeção legada — transitória, some quando as telas passarem a ler o
    // Content canônico direto (T2 do plano da Fase 2).
    const items = contents.map((c) =>
      toLegacyItem(c, {
        reviews: reviewsByContent.get(c.id) || [],
        events: eventsByContent.get(c.id) || [],
      })
    );

    const endOfToday = new Date(endOfTodayIso()).getTime();
    const dueContentIds = new Set(
      reviews
        .filter((r) => r.status === "pending" && new Date(r.scheduledFor).getTime() <= endOfToday)
        .map((r) => r.contentId)
    );

    return {
      contents,
      subjects,
      reviews,
      events,
      items,
      dueCount: dueContentIds.size,
      reload,
      mutate,
    };
  }, [snapshot, reload, mutate]);

  return <ContentStoreContext.Provider value={value}>{children}</ContentStoreContext.Provider>;
}

export function useContentStore() {
  const ctx = useContext(ContentStoreContext);
  if (!ctx) throw new Error("useContentStore precisa estar dentro de <ContentStoreProvider>");
  return ctx;
}
