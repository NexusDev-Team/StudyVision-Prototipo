// Ponto de entrada da camada de persistência: garante que o formato legado
// (sv_items) seja migrado para sv_db uma única vez, preservando um backup, e
// expõe os mesmos readDb/writeDb/withDb do db.js para o resto do app.

import { readDb as readDbRaw, writeDb as writeDbRaw, withDb as withDbRaw, DB_KEY, SCHEMA_VERSION } from "./db.js";
import { migrateItems } from "./migrations.js";

export const LEGACY_KEY = "sv_items";
export const LEGACY_BACKUP_KEY = "sv_items_backup_v1";

function safeParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// Roda a migração uma única vez: se já existe sv_db, não faz nada; se existe
// sv_items legado e nenhum sv_db ainda, migra e preserva sv_items intacto
// (nunca remove — apenas copia para uma chave de backup, caso ainda não exista).
function ensureMigrated() {
  const hasDb = localStorage.getItem(DB_KEY) !== null;
  if (hasDb) return;

  const legacyRaw = localStorage.getItem(LEGACY_KEY);
  const legacyItems = safeParse(legacyRaw);
  if (!Array.isArray(legacyItems) || legacyItems.length === 0) return;

  const migrated = migrateItems(legacyItems);
  writeDbRaw(migrated);

  if (localStorage.getItem(LEGACY_BACKUP_KEY) === null) {
    localStorage.setItem(LEGACY_BACKUP_KEY, legacyRaw);
  }
}

export function readDb() {
  ensureMigrated();
  return readDbRaw();
}

// writeDb/withDb também precisam garantir a migração ANTES de escrever: se a
// primeira operação da sessão for uma escrita (ex.: criar uma matéria), sem
// isto o sv_items legado nunca seria migrado e sumiria da visão do app.
export function writeDb(db) {
  ensureMigrated();
  return writeDbRaw(db);
}

export function withDb(mutator) {
  ensureMigrated();
  return withDbRaw(mutator);
}

export { DB_KEY, SCHEMA_VERSION };
