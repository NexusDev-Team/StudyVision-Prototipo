// Prompt do Modo Foco — transforma um Content JÁ ANALISADO numa sessão
// guiada, compatível com o tempo disponível. Nunca recebe imagem: o material
// já foi extraído por api/analyze.js antes. Separado de lib/prompts.js para
// não misturar dois fluxos diferentes no mesmo arquivo (mesmo racional do
// comentário no topo de prompts.js).

import { buildPreferenceBlock } from "./prompts.js";

// Réplica travada por teste de paridade (scripts/test-data-layer.mjs) das
// constantes canônicas em src/constants.js — esta função serverless não
// importa src/. Mudar um lado sem o outro quebra o teste.
export const FOCUS_DURATIONS = [2, 5, 10];
export const FOCUS_STEP_TYPES = ["concept", "explanation", "example", "practice", "question", "summary"];
export const FOCUS_STEP_BOUNDS = {
  2: { min: 2, max: 4 },
  5: { min: 4, max: 7 },
  10: { min: 6, max: 10 },
};

export const FOCUS_SYSTEM_INSTRUCTION = `Você é o motor do Modo Foco do Study Vision. Você recebe um material acadêmico
que JÁ FOI ANALISADO anteriormente (não uma imagem) e o tempo que o estudante tem disponível agora, e deve
transformá-lo numa sessão de estudo guiada, dividida em etapas, para ser exibida uma etapa por vez.

Responda sempre em português do Brasil, em JSON válido, seguindo exatamente o schema fornecido.
Nunca inclua texto fora do JSON.`;

// O que muda com a duração NÃO é só a contagem de etapas — é o ESCOPO do que
// é abordado. Cada profile define até onde a sessão vai, não apenas quantas
// etapas ela tem. A faixa min..max aqui é a MESMA de FOCUS_STEP_BOUNDS, citada
// explicitamente no prompt para o modelo mirar nela.
export const FOCUS_DEPTH_PROFILES = {
  2: `Tempo disponível: 2 minutos — revisão extremamente objetiva.
Escopo: UM único conceito central, o mais importante de todos. Entre 2 e 4 etapas.
Nada de contexto, digressão, comparação ou caso particular. Cada etapa cabe em 2
a 3 frases. O estudante deve sair sabendo A IDEIA — não o assunto inteiro.`,
  5: `Tempo disponível: 5 minutos — compreensão funcional do conteúdo, não só revisão.
Escopo: o conceito central mais 2 ou 3 desdobramentos diretos que ajudam a
entender de onde ele vem e para que serve. Entre 4 e 7 etapas. Inclua ao menos
um exemplo concreto extraído do material e ao menos uma etapa de prática curta
que peça uma resposta ativa do estudante, não só leitura passiva. Cada etapa em
3 a 5 frases — mais desenvolvida que uma revisão de 2 minutos, mas ainda direta.
O estudante deve sair sabendo APLICAR a ideia num caso simples, não só repeti-la.`,
  10: `Tempo disponível: 10 minutos — sessão mais completa, mas ainda focada.
Escopo: o tópico completo em progressão, do pré-requisito à síntese, cobrindo
mais de um conceito relacionado quando o material sustentar isso. Entre 6 e 10
etapas. Defina cada termo técnico antes de usá-lo, traga mais de um exemplo,
inclua ao menos uma etapa de prática, ao menos uma questão de verificação da
compreensão, e feche com uma etapa de síntese amarrando tudo. Cada etapa em 4 a
7 frases — a explicação mais desenvolvida das três durações, com espaço para
relacionar conceitos entre si. O estudante deve sair capaz de EXPLICAR o tópico
com as próprias palavras e resolver um caso não trivial. Ainda assim, não crie
uma sessão gigante: 10 minutos continua sendo uma experiência focada, não o
material inteiro.`,
};

// Formatação própria do Modo Foco: etapas enxutas, sem os marcadores de linha
// do "summary" (SUMMARY_FORMATTING, em prompts.js) — aqui não há um único
// campo de texto longo, e sim uma lista de etapas curtas.
const FOCUS_FORMATTING = `Formatação das etapas:
- "title" é um rótulo curto (poucas palavras), nunca uma frase completa.
- "content" é texto corrido, sem marcadores de lista, sem numeração, sem
  markdown — só o parágrafo da etapa.
- "type" é sempre uma destas palavras exatas: concept, explanation, example,
  practice, question, summary.
- Nunca inclua um campo "id" — os identificadores são gerados pela aplicação e
  qualquer id enviado é descartado.`;

// Payload que a aplicação envia — só os 8 campos acadêmicos do Content, nunca
// imagens, tentativas ou dados de assinatura. Documentado aqui para o prompt
// deixar claro ao modelo o que ele está recebendo.
function describePayload(payload) {
  const lines = [];
  if (payload.title) lines.push(`Título: ${payload.title}`);
  if (payload.subject) lines.push(`Matéria: ${payload.subject}`);
  if (payload.topic) lines.push(`Tópico: ${payload.topic}`);
  if (payload.difficulty) lines.push(`Dificuldade estimada do material: ${payload.difficulty}`);
  if (Array.isArray(payload.keyConcepts) && payload.keyConcepts.length > 0) {
    lines.push(`Conceitos principais: ${payload.keyConcepts.join(", ")}`);
  }
  if (Array.isArray(payload.keywords) && payload.keywords.length > 0) {
    lines.push(`Palavras-chave: ${payload.keywords.join(", ")}`);
  }
  if (payload.summary) lines.push(`Resumo já existente:\n${payload.summary}`);
  if (payload.extractedText) lines.push(`Texto extraído do material original:\n${payload.extractedText}`);
  return lines.join("\n\n");
}

// Monta o prompt do Modo Foco. `payload` é o objeto acadêmico enxuto (ver
// buildFocusPayload em src/services/focusModeService.js), `durationMinutes`
// é 2, 5 ou 10, `preferences` são as necessidades do Modo Inclusão.
export function buildFocusPrompt({ durationMinutes, preferences, payload } = {}) {
  const profile = FOCUS_DEPTH_PROFILES[durationMinutes] || FOCUS_DEPTH_PROFILES[5];
  const preferenceBlock = buildPreferenceBlock(preferences);

  return `Você vai transformar o material acadêmico abaixo — que já foi extraído e analisado anteriormente —
numa sessão de estudo guiada, dividida em etapas.

O objetivo NÃO é resumir todo o material. O objetivo é selecionar e organizar aquilo que o estudante
consegue estudar de forma útil dentro do tempo disponível.

${profile}

Material acadêmico (fonte única de verdade — não invente nada fora daqui):
${describePayload(payload || {})}

${preferenceBlock ? `${preferenceBlock}\n\n` : ""}${FOCUS_FORMATTING}

Regras muito importantes:
- Baseie-se exclusivamente no material acadêmico fornecido acima.
- NUNCA invente fatos, dados, fórmulas ou conceitos que não estejam no material.
- Preserve fidelidade acadêmica: adaptar a apresentação nunca significa simplificar até ficar errado.
- Gere um número de etapas dentro da faixa indicada no escopo acima.

Responda EXATAMENTE no formato JSON abaixo, com estas chaves e estes tipos — nada a mais, nada a menos:

{
  "success": true,
  "steps": [
    { "type": "concept", "title": "string", "content": "string" }
  ]
}

Se não for possível gerar uma sessão útil a partir do material fornecido, retorne apenas
{ "success": false, "error": "string" }.`;
}
