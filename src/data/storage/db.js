// Camada única de persistência do Study Vision. Nenhum outro módulo deve
// chamar localStorage.setItem/getItem diretamente para os dados do app —
// tudo passa por readDb/writeDb/withDb, para manter uma única fonte de
// verdade e permitir versionamento/migração num só lugar.

export const DB_KEY = "sv_db";
export const SCHEMA_VERSION = 2;

function emptyDb() {
  return {
    version: SCHEMA_VERSION,
    subjects: [],
    contents: [],
    flashcardAttempts: [],
    quizAttempts: [],
    reviews: [],
    events: [],
  };
}

function safeParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function readDb() {
  const raw = localStorage.getItem(DB_KEY);
  const parsed = safeParse(raw);
  if (!parsed || typeof parsed !== "object") return emptyDb();
  return {
    version: parsed.version || SCHEMA_VERSION,
    subjects: Array.isArray(parsed.subjects) ? parsed.subjects : [],
    contents: Array.isArray(parsed.contents) ? parsed.contents : [],
    flashcardAttempts: Array.isArray(parsed.flashcardAttempts) ? parsed.flashcardAttempts : [],
    quizAttempts: Array.isArray(parsed.quizAttempts) ? parsed.quizAttempts : [],
    reviews: Array.isArray(parsed.reviews) ? parsed.reviews : [],
    events: Array.isArray(parsed.events) ? parsed.events : [],
  };
}

function rawWrite(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
}

// Poda de emergência quando a cota do localStorage estoura (fotos em base64
// pesam) — mesma estratégia do antigo src/services/storage.js:29-42: remove
// os conteúdos mais antigos um a um e, em último caso, salva sem imagens.
// Retorna { ok, reason? }.
export function writeDb(db) {
  try {
    rawWrite(db);
    return { ok: true };
  } catch (err) {
    if (err?.name !== "QuotaExceededError") throw err;

    let pruned = { ...db, contents: [...db.contents] };
    while (pruned.contents.length > 1) {
      pruned = { ...pruned, contents: pruned.contents.slice(0, -1) };
      try {
        rawWrite(pruned);
        return { ok: true, reason: "pruned" };
      } catch {
        // segue podando
      }
    }

    try {
      const withoutImages = {
        ...db,
        contents: db.contents.map((c) => ({ ...c, images: [] })),
      };
      rawWrite(withoutImages);
      return { ok: true, reason: "no-photo" };
    } catch {
      return { ok: false, reason: "quota" };
    }
  }
}

// Lê, aplica a função de mutação (que deve retornar o novo db) e grava.
// Uso: withDb(db => ({ ...db, contents: [...db.contents, novoContent] }))
export function withDb(mutator) {
  const current = readDb();
  const next = mutator(current);
  return { db: next, result: writeDb(next) };
}
