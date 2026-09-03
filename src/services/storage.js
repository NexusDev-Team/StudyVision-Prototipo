// Ponte de compatibilidade: as telas legadas (ContentDetailScreen, ReviewScreen,
// FlashcardsScreen, QuizScreen, QuestionsScreen, LibraryScreen, reviewEngine.js)
// continuam chamando getStoredItems()/saveItem()/getDueItems() exatamente como
// antes — mas agora tudo é lido/escrito através da camada de dados real
// (contentService/reviewService/eventService sobre sv_db), via o adaptador
// toLegacyItem. Nenhuma tela precisou mudar por causa disso.
import { getContents, getContent } from "./contentService.js";
import { getReviewsForContent, markReviewDone as markReviewEntityDone } from "./reviewService.js";
import { getEventsForContent } from "./eventService.js";
import { toLegacyItem } from "../data/adapters/toLegacyItem.js";
import { applyLegacyCalendarEvent } from "../data/adapters/applyLegacyCalendarEvent.js";
import { isDueForReview } from "./reviewEngine.js";

export function getStoredItems() {
  return getContents().map((content) =>
    toLegacyItem(content, {
      reviews: getReviewsForContent(content.id),
      events: getEventsForContent(content.id),
    })
  );
}

// Só é chamada para ATUALIZAR um conteúdo já existente (a criação de um
// conteúdo novo passa por contentService.createContentEntry diretamente, em
// SummaryScreen.jsx). Sincroniza dois pedaços possíveis de mudança que a UI
// legada ainda produz nesse shape antigo:
//   1. reviewEngine.markReviewDone() mutando um estágio de reviewSchedule;
//   2. ContentDetailScreen agendando/atualizando um calendarEvent.
export function saveItem(item) {
  const content = getContent(item.id);
  if (!content) return { ok: false, reason: "unknown" };

  for (const stage of item.reviewSchedule || []) {
    if (!stage.id || !stage.done) continue;
    const current = getReviewsForContent(content.id).find((r) => r.id === stage.id);
    if (current && current.status === "pending") markReviewEntityDone(stage.id);
  }

  if (item.calendarEvent) {
    applyLegacyCalendarEvent(content.id, content.title, item.calendarEvent);
  }

  return { ok: true };
}

export function getDueItems() {
  return getStoredItems().filter(isDueForReview);
}
