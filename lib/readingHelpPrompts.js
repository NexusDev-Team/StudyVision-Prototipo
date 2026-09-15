// Auxílio contextual do Ler Comigo (Etapa 3) — "Me perdi" e "Outro jeito" em
// UMA operação (`mode: "lost" | "rephrase"`), em vez de dois endpoints
// separados (seção 45 do briefing). Payload sempre pequeno: trecho atual +
// no máximo dois trechos anteriores de contexto + tópico + preferências.
// Nunca imagem, nunca o Content inteiro, nunca histórico de conversa — cada
// chamada é isolada, não é um chat.

import { buildPreferenceBlock } from "./prompts.js";

export const READING_HELP_SYSTEM_INSTRUCTION = `Você é o assistente de apoio contextual do Ler Comigo do Study Vision.
Você recebe um pequeno trecho de conteúdo acadêmico que o estudante estava
acompanhando (às vezes com um ou dois trechos anteriores, só para contexto) e
ajuda o estudante a continuar a leitura.

Preserve a terminologia acadêmica necessária — nunca fale como se fosse para
uma criança, nunca simplifique até perder o significado, nunca altere a
verdade científica do conteúdo original.

Responda sempre em português do Brasil, em JSON válido, seguindo exatamente o
schema fornecido. Nunca inclua texto fora do JSON.`;

const MAX_TOPIC_CHARS = 80;
const MAX_CURRENT_CHARS = 1200;
const MAX_PREVIOUS_ITEMS = 2;
const MAX_PREVIOUS_CHARS = 400;

function safeText(value, maxChars) {
  return String(value || "").slice(0, maxChars);
}

// `previous` nunca ultrapassa 2 itens — é contexto mínimo, não histórico.
function safePrevious(previous) {
  if (!Array.isArray(previous)) return [];
  return previous.slice(0, MAX_PREVIOUS_ITEMS).map((item) => safeText(item, MAX_PREVIOUS_CHARS));
}

function contextBlock(previous) {
  const items = safePrevious(previous);
  if (items.length === 0) return "";
  const lines = items.map((item, i) => `Trecho anterior ${i + 1}: ${item}`).join("\n");
  return `${lines}\n\n`;
}

// Instrução: "explique brevemente o que ele precisa entender para continuar
// a leitura" (seção 40 do briefing) — nunca avança assunto novo, nunca gera
// uma aula completa, nunca cria perguntas adicionais.
function lostInstruction() {
  return `O estudante estava acompanhando este conteúdo e informou que se perdeu.

Explique brevemente o que ele precisa entender para continuar a leitura.
Use no máximo algumas frases.
Não avance para assuntos novos.
Não gere uma aula completa.
Não crie perguntas adicionais.`;
}

// Instrução: "explique este mesmo trecho de outra maneira, preservando seu
// significado e sem adicionar conteúdo desnecessário" (seção 42).
function rephraseInstruction() {
  return `Explique este mesmo trecho de outra maneira, preservando seu significado e
sem adicionar conteúdo desnecessário.
Não repita o trecho original quase palavra por palavra: mude o ângulo ou a
analogia, mantendo o mesmo significado.
Poucas frases, direto ao ponto.`;
}

// Monta o prompt de auxílio contextual. `topic`/`current`/`previous` são
// SEMPRE do ponto onde o estudante está na leitura (nunca o Content inteiro,
// nunca outros trechos além do contexto mínimo, nunca histórico de conversa).
export function buildReadingHelpPrompt({ mode, topic, current, previous, preferences } = {}) {
  const preferenceBlock = buildPreferenceBlock(preferences);
  const safeTopic = safeText(topic, MAX_TOPIC_CHARS);
  const safeCurrent = safeText(current, MAX_CURRENT_CHARS);
  const instruction = mode === "lost" ? lostInstruction() : rephraseInstruction();

  return `${safeTopic ? `Tópico: ${safeTopic}\n` : ""}Trecho atual: ${safeCurrent}

${contextBlock(previous)}${instruction}

${preferenceBlock ? `${preferenceBlock}\n\n` : ""}Use linguagem compatível com as preferências inclusivas acima, quando
existirem, sem infantilizar o conteúdo.

Responda EXATAMENTE no formato JSON abaixo, com estas chaves e estes tipos —
nada a mais, nada a menos:

{
  "success": true,
  "content": "string"
}

Se não for possível ajudar com este trecho, retorne apenas
{ "success": false, "error": "string" }.`;
}
