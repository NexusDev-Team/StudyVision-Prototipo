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

// Trim + colapso de espaços internos — "  Banco   de Dados " -> "Banco de Dados".
export function normalizeSubjectName(name) {
  return String(name || "").trim().replace(/\s+/g, " ");
}

// Comparação insensível a maiúsculas/acentos, para "Química" e "quimica"
// serem reconhecidas como a mesma matéria.
function comparableName(name) {
  return normalizeSubjectName(name)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function findSubjectByName(name) {
  const target = comparableName(name);
  if (!target) return null;
  return readDb().subjects.find((s) => comparableName(s.name) === target) || null;
}

// Rejeita nome vazio — matéria sem nome não deve existir. Retorna null nesse
// caso (o chamador decide como avisar o usuário), coerente com getSubject().
export function createSubjectEntry(name) {
  const normalized = normalizeSubjectName(name);
  if (!normalized) return null;
  const subject = createSubject({ name: normalized });
  withDb((db) => ({ ...db, subjects: [...db.subjects, subject] }));
  return subject;
}

// Reaproveita a matéria existente (por nome, case/acento-insensitive) em vez
// de duplicar. Usado onde a IA ou o usuário informam só um nome de matéria.
export function ensureSubject(name) {
  const normalized = normalizeSubjectName(name);
  if (!normalized) return null;
  return findSubjectByName(normalized) || createSubjectEntry(normalized);
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
