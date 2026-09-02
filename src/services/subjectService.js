// CRUD de Subject. A exclusão nunca apaga conteúdos em cascata silenciosamente
// — exige um destino explícito (reassignTo) quando existem conteúdos vinculados.

import { readDb, withDb } from "../data/storage/index.js";
import { createSubject } from "../data/models/subject.js";
import { nowIso } from "../utils/date.js";

export function getSubjects() {
  return readDb().subjects;
}

export function getSubject(id) {
  return readDb().subjects.find((s) => s.id === id) || null;
}

export function createSubjectEntry(name) {
  const subject = createSubject({ name });
  withDb((db) => ({ ...db, subjects: [...db.subjects, subject] }));
  return subject;
}

// Renomear não altera o id da matéria; os conteúdos que a referenciam via
// subjectId continuam corretos. subjectName nos conteúdos é apenas um cache
// de leitura, então é atualizado aqui para não ficar desatualizado.
export function renameSubject(id, name) {
  let updated = null;
  withDb((db) => ({
    ...db,
    subjects: db.subjects.map((s) => {
      if (s.id !== id) return s;
      updated = { ...s, name: String(name || "").trim() || s.name, updatedAt: nowIso() };
      return updated;
    }),
    contents: db.contents.map((c) =>
      c.subjectId === id ? { ...c, subjectName: updated?.name ?? c.subjectName } : c
    ),
  }));
  return updated;
}

export class SubjectDeletionError extends Error {
  constructor(message, contentIds) {
    super(message);
    this.name = "SubjectDeletionError";
    this.contentIds = contentIds;
  }
}

// deleteSubject exige `reassignTo` (id de outra matéria) sempre que houver
// conteúdos vinculados — nunca decide sozinho o destino deles.
export function deleteSubject(id, { reassignTo } = {}) {
  const db = readDb();
  const affected = db.contents.filter((c) => c.subjectId === id).map((c) => c.id);

  if (affected.length > 0 && !reassignTo) {
    throw new SubjectDeletionError(
      `Matéria possui ${affected.length} conteúdo(s) vinculado(s); informe reassignTo.`,
      affected
    );
  }

  const targetSubject = reassignTo ? db.subjects.find((s) => s.id === reassignTo) : null;
  if (reassignTo && !targetSubject) {
    throw new SubjectDeletionError("Matéria de destino (reassignTo) não encontrada.", affected);
  }

  withDb((current) => ({
    ...current,
    subjects: current.subjects.filter((s) => s.id !== id),
    contents: current.contents.map((c) =>
      c.subjectId === id
        ? { ...c, subjectId: targetSubject.id, subjectName: targetSubject.name, updatedAt: nowIso() }
        : c
    ),
  }));

  return { movedContentIds: affected };
}
