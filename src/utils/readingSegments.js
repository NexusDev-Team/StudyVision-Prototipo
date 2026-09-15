// Ler Comigo — segmentação de texto em trechos curtos para leitura guiada.
// Puro (sem I/O, sem DOM) para ser testável no runner Node. Estratégia:
// sentença por sentença, com guardas contra falsos-positivos comuns em
// português (abreviações, números decimais, reticências), e quebra adicional
// em pontos naturais quando uma sentença sozinha excede o tamanho-alvo.
//
// Invariante que os testes cobram: nenhum caractere não-espaço do texto de
// entrada é descartado — só dividimos e reagrupamos substrings na ordem
// original (remover espaços de `segments.join("")` reconstrói o original).

import { READING_SEGMENT_BOUNDS } from "../constants.js";

// Abreviações comuns em português que terminam em ponto sem encerrar a frase.
// Comparação sempre em minúsculas, sem stripar acento (a lista já cobre as
// formas acentuadas usadas no dia a dia acadêmico).
const ABBREVIATIONS = new Set([
  "dr", "dra", "sr", "sra", "srta", "prof", "profa", "profº", "profª",
  "ex", "fig", "pág", "pag", "etc", "séc", "sec", "eng", "art", "cf",
  "vs", "ed", "vol", "cap", "eq", "obs", "ref", "aprox",
]);

const SENTENCE_ENDERS = new Set([".", "!", "?", "…"]);

// Marcador de item de lista: "-", "•", "*", "1.", "1)", "a)". Uma linha que
// bate este padrão vira um trecho próprio, sem entrar na fusão por minChars —
// perder a quebra de lista para "economizar" um trecho pequeno destruiria a
// estrutura que o usuário está acompanhando.
const LIST_MARKER_RE = /^([-•*]|\d+[.)]|[a-zA-Z][.)])\s+/;

function isLetterOrDigit(ch) {
  return /[\p{L}\p{N}]/u.test(ch);
}

// Palavra imediatamente antes do índice `idx` (sem incluir `idx`), varrendo
// para trás até achar um caractere que não seja letra/dígito.
function wordBefore(text, idx) {
  let start = idx;
  while (start > 0 && isLetterOrDigit(text[start - 1])) start -= 1;
  return text.slice(start, idx);
}

// Quebra um parágrafo de prosa em sentenças, preservando toda a pontuação.
// Não remove nenhum caractere não-espaço — só decide ONDE cortar.
function sentenceSplit(paragraph) {
  const sentences = [];
  let lastIndex = 0;
  let i = 0;

  while (i < paragraph.length) {
    const ch = paragraph[i];
    if (!SENTENCE_ENDERS.has(ch)) {
      i += 1;
      continue;
    }

    // Consome a sequência de pontuação de encerramento ("...", "?!", "…").
    let j = i;
    while (j < paragraph.length && SENTENCE_ENDERS.has(paragraph[j])) j += 1;
    const run = paragraph.slice(i, j);

    let isBoundary;
    if (run.length > 1 || run === "…") {
      // Reticências ou combinação (ex.: "?!") sempre encerram a sentença.
      isBoundary = true;
    } else if (run === ".") {
      const before = wordBefore(paragraph, i);
      const isDecimal = /^\d+$/.test(before) && /^\d/.test(paragraph[j] || "");
      const isAbbrev = ABBREVIATIONS.has(before.toLowerCase());
      isBoundary = !isDecimal && !isAbbrev;
    } else {
      // "!" ou "?" isolado.
      isBoundary = true;
    }

    if (isBoundary) {
      const sentence = paragraph.slice(lastIndex, j).trim();
      if (sentence) sentences.push(sentence);
      lastIndex = j;
    }
    i = j;
  }

  const tail = paragraph.slice(lastIndex).trim();
  if (tail) sentences.push(tail);

  return sentences;
}

// Pontos de quebra "naturais" para dividir uma sentença longa demais, em
// ordem de preferência. Nunca corta no meio de uma palavra.
const NATURAL_BREAKS = [/;\s+/g, /,\s+/g, /\s+(?:e|mas|ou|porque|que|quando|então)\s+/gi];

// Quebra `unit` em pedaços <= maxChars, preferindo pontuação/conjunções, e
// só recorrendo a espaço em branco como último recurso. Nunca descarta texto.
function breakLongUnit(unit, maxChars) {
  if (unit.length <= maxChars) return [unit];

  for (const pattern of NATURAL_BREAKS) {
    pattern.lastIndex = 0;
    let match;
    let bestEnd = -1;
    while ((match = pattern.exec(unit))) {
      const end = match.index + match[0].length;
      if (end <= maxChars) bestEnd = end;
      else break;
    }
    if (bestEnd > 0) {
      const head = unit.slice(0, bestEnd).trim();
      const rest = unit.slice(bestEnd).trim();
      return [head, ...(rest ? breakLongUnit(rest, maxChars) : [])];
    }
  }

  // Último recurso: corta no último espaço antes do limite (nunca no meio
  // de uma palavra). Se não houver espaço algum, corta no limite mesmo.
  let cut = unit.lastIndexOf(" ", maxChars);
  if (cut <= 0) cut = Math.min(maxChars, unit.length);
  const head = unit.slice(0, cut).trim();
  const rest = unit.slice(cut).trim();
  return [head, ...(rest ? breakLongUnit(rest, maxChars) : [])];
}

// Funde trechos curtos (< minChars) com o vizinho seguinte, sem nunca
// ultrapassar maxChars. `mergeable[i]` marca se a unidade i pode se fundir —
// itens de lista ficam de fora para não perder a estrutura visual.
function mergeShort(units, mergeableFlags, { maxChars, minChars }) {
  const result = [];
  let buffer = null;
  let bufferMergeable = false;

  const flush = () => {
    if (buffer !== null) result.push(buffer);
    buffer = null;
  };

  units.forEach((unit, idx) => {
    const mergeable = mergeableFlags[idx];
    if (buffer === null) {
      buffer = unit;
      bufferMergeable = mergeable;
      return;
    }
    if (bufferMergeable && mergeable && buffer.length < minChars) {
      const merged = `${buffer} ${unit}`;
      if (merged.length <= maxChars) {
        buffer = merged;
        return;
      }
    }
    flush();
    buffer = unit;
    bufferMergeable = mergeable;
  });
  flush();

  // Sobra final curta demais: tenta fundir com o trecho anterior mergeable.
  if (result.length >= 2) {
    const lastIdx = result.length - 1;
    const last = result[lastIdx];
    const prev = result[lastIdx - 1];
    if (last.length < minChars && mergeableFlags[units.length - 1] && `${prev} ${last}`.length <= maxChars) {
      result[lastIdx - 1] = `${prev} ${last}`;
      result.pop();
    }
  }

  return result;
}

export function segmentText(text, options = {}) {
  const maxChars = options.maxChars || READING_SEGMENT_BOUNDS.maxChars;
  const minChars = options.minChars || READING_SEGMENT_BOUNDS.minChars;

  if (typeof text !== "string" || !text.trim()) return [];

  const normalized = text.replace(/\r\n/g, "\n");
  const paragraphs = normalized.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const units = [];
  const mergeableFlags = [];

  for (const paragraph of paragraphs) {
    const lines = paragraph.split("\n").map((l) => l.trim()).filter(Boolean);
    const isList = lines.length > 1 && lines.every((line) => LIST_MARKER_RE.test(line));

    if (isList) {
      for (const line of lines) {
        for (const piece of breakLongUnit(line, maxChars)) {
          units.push(piece);
          mergeableFlags.push(false);
        }
      }
      continue;
    }

    const flatParagraph = paragraph.replace(/\s+/g, " ").trim();
    const sentences = sentenceSplit(flatParagraph);
    for (const sentence of sentences) {
      for (const piece of breakLongUnit(sentence, maxChars)) {
        units.push(piece);
        mergeableFlags.push(true);
      }
    }
  }

  return mergeShort(units, mergeableFlags, { maxChars, minChars });
}

// Perfil de segmentação a partir das preferências do Modo Inclusão — não cria
// preferência nova, só lê as chaves canônicas já existentes. `longText`
// (textos longos) e `manySteps` (muitas etapas) pedem trechos mais curtos.
export function segmentationProfile(preferences) {
  const compact = preferences?.longText === true || preferences?.manySteps === true;
  return {
    maxChars: compact ? READING_SEGMENT_BOUNDS.compactMaxChars : READING_SEGMENT_BOUNDS.maxChars,
    minChars: READING_SEGMENT_BOUNDS.minChars,
  };
}
