// CRUD de Content — a entidade central do Study Vision. Toda operação
// mantém o id estável e nunca deixa referência órfã ao excluir.

import { readDb, withDb } from "../data/storage/index.js";
import { createContent, createImage } from "../data/models/content.js";
import { nowIso } from "../utils/date.js";

export function getContents() {
  return readDb().contents;
}

export function getContent(id) {
  return readDb().contents.find((c) => c.id === id) || null;
}

// Retorna { content, result } — result vem de writeDb() e sinaliza se a
// escrita precisou podar dados por causa de cota do localStorage estourada
// (fotos em base64 pesam), para quem chama poder avisar o usuário.
export function createContentEntry(input) {
  const content = createContent(input);
  const { result } = withDb((db) => ({ ...db, contents: [...db.contents, content] }));
  return { content, result };
}

// Nunca altera `id`. Mescla apenas os campos passados em `patch`; arrays não
// mencionados (images, flashcards, quizzes...) permanecem intocados.
export function updateContent(id, patch = {}) {
  const { id: _ignoredId, createdAt: _ignoredCreatedAt, ...safePatch } = patch;
  let updated = null;
  withDb((db) => ({
    ...db,
    contents: db.contents.map((c) => {
      if (c.id !== id) return c;
      updated = { ...c, ...safePatch, id: c.id, createdAt: c.createdAt, updatedAt: nowIso() };
      return updated;
    }),
  }));
  return updated;
}

// Exclusão em cascata: remove tentativas, revisões, sessões de foco e
// progresso de leitura guiada do conteúdo, e retira o contentId de qualquer
// evento acadêmico (removendo o evento só se ficar sem nenhum conteúdo
// vinculado).
export function deleteContent(id) {
  let removed = false;
  withDb((db) => {
    const exists = db.contents.some((c) => c.id === id);
    if (!exists) return db;
    removed = true;
    return {
      ...db,
      contents: db.contents.filter((c) => c.id !== id),
      reviews: db.reviews.filter((r) => r.contentId !== id),
      flashcardAttempts: db.flashcardAttempts.filter((a) => a.contentId !== id),
      quizAttempts: db.quizAttempts.filter((a) => a.contentId !== id),
      focusSessions: db.focusSessions.filter((s) => s.contentId !== id),
      readingProgress: db.readingProgress.filter((p) => p.contentId !== id),
      events: db.events
        .map((e) => ({ ...e, contentIds: e.contentIds.filter((cid) => cid !== id) }))
        .filter((e) => e.contentIds.length > 0),
    };
  });
  return removed;
}

// Retorna { image, result } — result vem de writeDb() e sinaliza poda/falha
// por cota estourada (fotos em base64 pesam), para o chamador avisar o usuário
// em vez de a imagem sumir em silêncio.
export function addImageToContent(contentId, { dataUrl } = {}) {
  let image = null;
  const { result } = withDb((db) => ({
    ...db,
    contents: db.contents.map((c) => {
      if (c.id !== contentId) return c;
      image = createImage({ contentId, dataUrl, order: c.images.length });
      return { ...c, images: [...c.images, image], updatedAt: nowIso() };
    }),
  }));
  return { image, result };
}

// Persiste o texto extraído de UMA foto específica (feature de extração de
// texto — usePhotoTextExtraction). Só toca na imagem alvo: não mexe em
// content.extractedText/summary/notes nem nas demais imagens. Retorna
// { image, result } no mesmo padrão de addImageToContent (result sinaliza
// poda por cota do localStorage). imageId inexistente é um no-op silencioso
// (image volta null), sem lançar.
export function setImageExtractedText(contentId, imageId, { text, partial } = {}) {
  let image = null;
  const { result } = withDb((db) => ({
    ...db,
    contents: db.contents.map((c) => {
      if (c.id !== contentId) return c;
      let found = false;
      const images = c.images.map((img) => {
        if (img.id !== imageId) return img;
        found = true;
        image = {
          ...img,
          extractedText: typeof text === "string" ? text : "",
          extractedTextAt: nowIso(),
          extractedTextPartial: partial === true,
        };
        return image;
      });
      return found ? { ...c, images, updatedAt: nowIso() } : c;
    }),
  }));
  return { image, result };
}

export function removeImageFromContent(contentId, imageId) {
  withDb((db) => ({
    ...db,
    contents: db.contents.map((c) =>
      c.id !== contentId
        ? c
        : { ...c, images: c.images.filter((img) => img.id !== imageId), updatedAt: nowIso() }
    ),
  }));
}

export function reorderImages(contentId, orderedImageIds) {
  withDb((db) => ({
    ...db,
    contents: db.contents.map((c) => {
      if (c.id !== contentId) return c;
      const byId = new Map(c.images.map((img) => [img.id, img]));
      const images = orderedImageIds
        .map((imgId, i) => (byId.has(imgId) ? { ...byId.get(imgId), order: i } : null))
        .filter(Boolean);
      return { ...c, images, updatedAt: nowIso() };
    }),
  }));
}

// Anotações do usuário — sempre separadas do resumo gerado pela IA.
export function updateNotes(contentId, notes) {
  return updateContent(contentId, { notes: String(notes || "") });
}

// Trocar de matéria não altera o id do conteúdo.
export function moveContentToSubject(contentId, subjectId, subjectName = "") {
  return updateContent(contentId, { subjectId, subjectName });
}
