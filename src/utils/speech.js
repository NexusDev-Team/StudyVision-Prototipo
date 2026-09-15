// Ler Comigo — helpers puros sobre a Web Speech API (síntese de voz nativa
// do navegador). Puro por design: sem `window` global aqui, para ser
// testável no runner Node (que não tem DOM). O hook que efetivamente toca
// `speechSynthesis` é src/hooks/useSpeechSynthesis.js.

import { READING_RATES, READING_DEFAULT_RATE } from "../constants.js";

// `win` é injetado (não lê `window` global direto) para o mesmo objeto poder
// ser testado com um stub no Node e usado com o `window` real no navegador.
export function isSpeechSupported(win) {
  return Boolean(win && typeof win.speechSynthesis === "object" && typeof win.SpeechSynthesisUtterance === "function");
}

// Cadeia de fallback de voz (seção 19 do briefing): nunca promete uma voz
// específica por nome — varia por navegador/SO/dispositivo. Ordem: match
// exato do idioma pedido → mesmo idioma-base (ex.: "pt-PT" quando não há
// "pt-BR") → voz marcada como default do sistema → primeira da lista →
// null (lista vazia = sem suporte real, nunca lança).
export function pickVoice(voices, lang = "pt-BR") {
  if (!Array.isArray(voices) || voices.length === 0) return null;

  const targetLang = String(lang || "").toLowerCase();
  const baseLang = targetLang.split("-")[0];

  const exact = voices.find((v) => String(v?.lang || "").toLowerCase() === targetLang);
  if (exact) return exact;

  const sameBase = voices.find((v) => String(v?.lang || "").toLowerCase().startsWith(baseLang));
  if (sameBase) return sameBase;

  const systemDefault = voices.find((v) => v?.default === true);
  if (systemDefault) return systemDefault;

  return voices[0];
}

// Só aceita as velocidades canônicas (READING_RATES) — qualquer outra vira
// o default, nunca um `NaN`/valor arbitrário chegando ao utterance.rate.
export function normalizeRate(rate) {
  const n = Number(rate);
  return READING_RATES.includes(n) ? n : READING_DEFAULT_RATE;
}
