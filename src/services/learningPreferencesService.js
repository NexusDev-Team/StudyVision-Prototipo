// Modo Inclusão (Fase 10): única porta de leitura/escrita das preferências de
// aprendizagem do usuário. Segue o mesmo desenho de knowledgeFlameService —
// a regra e a normalização vivem aqui, nunca no componente; a persistência
// passa por withDb (db.learningPreferences). Nenhum acesso direto a
// localStorage fora da camada de storage.
//
// Distinção importante:
// - preferência PADRÃO: o que este serviço lê/grava, persistido em sv_db.
// - preferência DESTA CAPTURA: estado local da câmera, nunca escrito aqui a
//   menos que o usuário peça explicitamente "tornar meu padrão".

import { readDb, withDb } from "../data/storage/index.js";
import { nowIso } from "../utils/date.js";
import { LEARNING_PREFERENCE_KEYS, emptyPreferenceOptions } from "../constants.js";

// Reduz qualquer entrada a um objeto só com as 4 chaves canônicas, booleanas.
// Aceita objeto parcial; chaves desconhecidas são ignoradas.
export function normalizePreferenceOptions(raw) {
  const options = emptyPreferenceOptions();
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    for (const key of LEARNING_PREFERENCE_KEYS) {
      options[key] = raw[key] === true;
    }
  }
  return options;
}

// true se pelo menos uma preferência está ativa. Com nenhuma ativa, o pipeline
// de análise deve se comportar exatamente como antes do Modo Inclusão.
export function hasActivePreference(options) {
  const norm = normalizePreferenceOptions(options);
  return LEARNING_PREFERENCE_KEYS.some((key) => norm[key]);
}

// Estado completo das preferências padrão: { configured, updatedAt, options }.
// `configured` distingue "nunca abriu o onboarding" de "abriu e não escolheu
// nada" — só o primeiro caso dispara a configuração inicial na câmera.
export function getLearningPreferences() {
  const { learningPreferences } = readDb();
  return {
    configured: learningPreferences.configured === true,
    updatedAt: learningPreferences.updatedAt || null,
    options: normalizePreferenceOptions(learningPreferences.options),
  };
}

// Só as opções (atalho para quem não precisa de configured/updatedAt).
export function getPreferenceOptions() {
  return getLearningPreferences().options;
}

// Grava a preferência padrão. Marca configured=true mesmo quando o usuário
// salva sem nenhuma opção ativa (ele fez uma escolha consciente). Retorna o
// novo estado. Não toca em contents, reviews nem flameGoals.
export function setLearningPreferences(options) {
  const normalized = normalizePreferenceOptions(options);
  const updatedAt = nowIso();
  withDb((db) => ({
    ...db,
    learningPreferences: { configured: true, updatedAt, options: normalized },
  }));
  return { configured: true, updatedAt, options: normalized };
}
