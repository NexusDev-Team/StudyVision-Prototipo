// Prompt de "Outro jeito" (Etapa 2 do Modo Foco) — reexplica APENAS o step
// atual, preservando o significado. Separado de focusPrompts.js porque é um
// fluxo bem menor: uma chamada pontual, sem gerar sessão, sem imagem, sem
// histórico. Reaproveita buildPreferenceBlock de prompts.js (mesmo bloco
// usado pela análise e pelo Modo Foco) em vez de duplicar a lógica.

import { buildPreferenceBlock } from "./prompts.js";

export const REPHRASE_SYSTEM_INSTRUCTION = `Você é o assistente de apoio contextual do Modo Foco do Study Vision.
Você recebe um pequeno trecho de conteúdo de estudo e deve reescrevê-lo de outra forma, preservando o
significado, sem inventar informação nova.

Responda sempre em português do Brasil, em JSON válido, seguindo exatamente o schema fornecido.
Nunca inclua texto fora do JSON.`;

const MAX_TITLE_CHARS = 80;
const MAX_CONTENT_CHARS = 1200;

// Monta o prompt de reexplicação. `title`/`content` são SEMPRE do step atual
// (nunca o Content inteiro, nunca outros steps, nunca histórico de conversa).
export function buildRephrasePrompt({ title, content, preferences } = {}) {
  const preferenceBlock = buildPreferenceBlock(preferences);
  const safeTitle = String(title || "").slice(0, MAX_TITLE_CHARS);
  const safeContent = String(content || "").slice(0, MAX_CONTENT_CHARS);

  return `Explique este trecho de outra forma, preservando o significado.

Etapa: ${safeTitle}
Conteúdo: ${safeContent}

${preferenceBlock ? `${preferenceBlock}\n\n` : ""}Regras muito importantes:
- Preserve fidelidade ao conteúdo original — nunca invente fatos, dados ou conceitos que não estejam nele.
- Não repita o texto original quase palavra por palavra: mude a forma de explicar (outro ângulo, outra
  analogia, outra ordem), mantendo o mesmo significado.
- Poucas frases, direto ao ponto — não é um novo material, é a MESMA ideia dita de outro jeito.

Responda EXATAMENTE no formato JSON abaixo, com estas chaves e estes tipos — nada a mais, nada a menos:

{
  "success": true,
  "content": "string"
}

Se não for possível reexplicar este trecho, retorne apenas { "success": false, "error": "string" }.`;
}
