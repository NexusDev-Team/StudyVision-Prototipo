// Prompt do endpoint de complemento (api/analyze-extras.js). Diferente de
// ANALYSIS_PROMPT (prompts.js): aqui não há imagem, só o tópico/resumo já
// identificados — o modelo gera SÓ as seções secundárias (quiz, flashcards,
// openQuestions) que ficaram vazias na primeira geração (ver
// lib/analysisSanitize.js). Chamada de texto puro: mais rápida e mais barata
// que reenviar a foto inteira.

import { buildPreferenceBlock } from "./prompts.js";

export const EXTRAS_SYSTEM_INSTRUCTION = `Você é o motor de complemento de material de estudo do Study Vision.
Você recebe o tópico e o resumo de um conteúdo acadêmico já identificado a partir de uma foto e deve gerar
apenas as seções de material de apoio (quiz, flashcards ou questões abertas) que faltaram na primeira geração
— nunca o resumo em si, nunca repita o que já existe.

Responda sempre em português do Brasil, em JSON válido, seguindo exatamente o schema fornecido.
Nunca inclua texto fora do JSON.`;

const EXTRAS_SECTIONS = {
  quiz: {
    instruction:
      'quiz: gere aproximadamente 5 questões de múltipla escolha, cada uma com exatamente 4 alternativas plausíveis, o índice (0 a 3) da alternativa correta, e uma explicação curta da resposta.',
    schemaLine: '"quiz": [{ "question": "string", "options": ["string", "string", "string", "string"], "answer": 0, "explanation": "string" }]',
  },
  flashcards: {
    instruction: "flashcards: gere aproximadamente 5 flashcards (pergunta curta + resposta objetiva) cobrindo os pontos principais do tópico.",
    schemaLine: '"flashcards": [{ "question": "string", "answer": "string" }]',
  },
  openQuestions: {
    instruction: "openQuestions: gere aproximadamente 4 questões abertas para reflexão/estudo sobre o tópico.",
    schemaLine: '"openQuestions": ["string", "..."]',
  },
};

export const EXTRAS_KEYS = Object.keys(EXTRAS_SECTIONS);

// Monta o prompt pedindo só as seções de `missing` que forem reconhecidas
// (chaves fora de EXTRAS_KEYS são ignoradas — nunca confiar cegamente no
// corpo da requisição). Retorna null se nenhuma seção reconhecida sobrar.
export function buildExtrasPrompt({ topic, summary, extractedText, missing, preferences }) {
  const sections = (Array.isArray(missing) ? missing : []).filter((key) => EXTRAS_SECTIONS[key]);
  if (sections.length === 0) return null;

  const preferenceBlock = buildPreferenceBlock(preferences);
  const instructionLines = sections.map((key) => `- ${EXTRAS_SECTIONS[key].instruction}`).join("\n");
  const schemaLines = sections.map((key) => EXTRAS_SECTIONS[key].schemaLine).join(",\n  ");

  return `Contexto do conteúdo já identificado (não repita, não resuma de novo):

Tópico: ${topic || ""}
Resumo: ${summary || ""}
${extractedText ? `Texto extraído da imagem original: ${extractedText}` : ""}

Gere APENAS as seguintes seções que faltaram na primeira geração:
${instructionLines}
${preferenceBlock ? `\n${preferenceBlock}\n` : ""}
Regras muito importantes:
- Baseie-se exclusivamente no tópico e no resumo fornecidos acima.
- NUNCA invente informações que não sejam coerentes com o tópico/resumo.
- Se não for possível gerar uma seção com segurança e qualidade, devolva um array vazio para ela — nunca
  invente conteúdo só para completar.

Responda EXATAMENTE no formato JSON abaixo, com só estas chaves — nada a mais, nada a menos:

{
  ${schemaLines}
}`;
}
