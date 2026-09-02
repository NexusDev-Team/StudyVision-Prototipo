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

export function createContentEntry(input) {
  const content = createContent(input);
  withDb((db) => ({ ...db, contents: [...db.contents, content] }));
  return content;
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

// Exclusão em cascata: remove tentativas e revisões do conteúdo, e retira o
// contentId de qualquer evento acadêmico (removendo o evento só se ficar sem
// nenhum conteúdo vinculado).
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
      events: db.events
        .map((e) => ({ ...e, contentIds: e.contentIds.filter((cid) => cid !== id) }))
        .filter((e) => e.contentIds.length > 0),
    };
  });
  return removed;
}

export function addImageToContent(contentId, { dataUrl } = {}) {
  let image = null;
  withDb((db) => ({
    ...db,
    contents: db.contents.map((c) => {
      if (c.id !== contentId) return c;
      image = createImage({ contentId, dataUrl, order: c.images.length });
      return { ...c, images: [...c.images, image], updatedAt: nowIso() };
    }),
  }));
  return image;
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
