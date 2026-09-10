// Camada única de persistência do Study Vision. Nenhum outro módulo deve
// chamar localStorage.setItem/getItem diretamente para os dados do app —
// tudo passa por readDb/writeDb/withDb, para manter uma única fonte de
// verdade e permitir versionamento/migração num só lugar.

import { LEARNING_PREFERENCE_KEYS, emptyPreferenceOptions } from "../../constants.js";

export const DB_KEY = "sv_db";
export const SCHEMA_VERSION = 2;

// Meta semanal da Chama do Conhecimento (Fase 9): preferredWeeklyTarget é a
// meta vigente (1..7); weekTargets carimba, por weekStartKey (segunda,
// "YYYY-MM-DD"), a meta que valia naquela semana — histórico imutável, nunca
// recalculado com a preferência atual.
const DEFAULT_WEEKLY_TARGET = 3;

function emptyFlameGoals() {
  return { preferredWeeklyTarget: DEFAULT_WEEKLY_TARGET, weekTargets: {} };
}

// Modo Inclusão: necessidades de acessibilidade DECLARADAS pelo usuário.
// `configured` distingue "nunca configurou" (dispara o onboarding) de
// "configurou e não escolheu nenhuma". `options` só carrega as chaves canônicas
// de LEARNING_PREFERENCE_KEYS, sempre booleanas.
//
// `keysVersion` carimba QUAL conjunto de chaves gerou aquela configuração.
// Quando o conjunto muda (Fase 11 trocou as 4 preferências genéricas pelas 5
// necessidades), a pergunta muda de natureza — mapear seria presumir a
// resposta. Então: bloco salvo com keysVersion diferente do atual é resetado
// (`configured: false`, `options` no padrão), e o onboarding pergunta de novo,
// uma única vez. Não é migração de dado — é invalidação consciente.
export const LEARNING_KEYS_VERSION = 2;

function emptyLearningPreferences() {
  return {
    keysVersion: LEARNING_KEYS_VERSION,
    configured: false,
    updatedAt: null,
    options: emptyPreferenceOptions(),
  };
}

function emptyDb() {
  return {
    version: SCHEMA_VERSION,
    subjects: [],
    contents: [],
    flashcardAttempts: [],
    quizAttempts: [],
    reviews: [],
    events: [],
    flameGoals: emptyFlameGoals(),
    learningPreferences: emptyLearningPreferences(),
  };
}

// Coerção defensiva de learningPreferences: nunca lança. Descarta chaves fora
// de LEARNING_PREFERENCE_KEYS, força cada opção a booleano, e um objeto ausente
// ou malformado vira o default de fábrica. Se o `keysVersion` salvo não bate o
// atual (conjunto de necessidades trocou, ou bloco antigo sem carimbo), a
// configuração é INVALIDADA: volta ao padrão de fábrica com o carimbo novo,
// para o onboarding perguntar de novo.
function coerceLearningPreferences(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return emptyLearningPreferences();
  }
  if (value.keysVersion !== LEARNING_KEYS_VERSION) {
    return emptyLearningPreferences();
  }
  const options = emptyPreferenceOptions();
  if (value.options && typeof value.options === "object" && !Array.isArray(value.options)) {
    for (const key of LEARNING_PREFERENCE_KEYS) {
      options[key] = value.options[key] === true;
    }
  }
  return {
    keysVersion: LEARNING_KEYS_VERSION,
    configured: value.configured === true,
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
    options,
  };
}

const WEEK_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidWeeklyTarget(value) {
  return Number.isInteger(value) && value >= 1 && value <= 7;
}

// Coerção defensiva de flameGoals: nunca lança, descarta o que não bate o
// formato esperado em vez de propagar um valor fora da faixa 1..7.
function coerceFlameGoals(value) {
  if (!value || typeof value !== "object") return emptyFlameGoals();

  const preferredWeeklyTarget = isValidWeeklyTarget(value.preferredWeeklyTarget)
    ? value.preferredWeeklyTarget
    : DEFAULT_WEEKLY_TARGET;

  const weekTargets = {};
  if (value.weekTargets && typeof value.weekTargets === "object" && !Array.isArray(value.weekTargets)) {
    for (const [weekKey, target] of Object.entries(value.weekTargets)) {
      if (WEEK_KEY_RE.test(weekKey) && isValidWeeklyTarget(target)) {
        weekTargets[weekKey] = target;
      }
    }
  }

  return { preferredWeeklyTarget, weekTargets };
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
    flameGoals: coerceFlameGoals(parsed.flameGoals),
    learningPreferences: coerceLearningPreferences(parsed.learningPreferences),
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
