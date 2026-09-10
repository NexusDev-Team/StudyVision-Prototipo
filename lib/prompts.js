// Prompts centralizados para o motor de inteligência do Study Vision.
// Mantidos separados de api/analyze.js para não deixar o endpoint gigante.

export const SYSTEM_INSTRUCTION = `Você é o motor de inteligência do Study Vision, um produto que transforma
a câmera do smartphone em uma ferramenta de aprendizado. Você recebe uma foto tirada por um estudante
(lousa, slide, página de livro ou exercício) e deve transformá-la em material de estudo estruturado.

Responda sempre em português do Brasil, em JSON válido, seguindo exatamente o schema fornecido.
Nunca inclua texto fora do JSON.`;

export const ANALYSIS_PROMPT = `Analise a imagem enviada e faça o seguinte, nesta ordem:

1. Identifique o que aparece na imagem.
2. Determine se existe conteúdo educacional legível (texto de aula, lousa, slide, livro, exercício, anotação de estudo).
3. Se NÃO houver conteúdo educacional legível com segurança (imagem borrada, vazia, ilegível, ou sem relação
   com estudo), retorne success=false e um campo error com uma frase curta e amigável explicando o motivo.
   Não invente conteúdo nesse caso.
4. Se houver conteúdo educacional legível, identifique a matéria (ex: Matemática, História, Química, Física,
   Português, Biologia, Geografia, Filosofia, Sociologia, Inglês, Programação — use a matéria mais específica
   e correta possível), o assunto/tópico específico, e um título curto e adequado para o conteúdo.
5. Extraia o texto relevante presente na imagem (extractedText) — não precisa ser literal palavra por palavra,
   mas deve refletir fielmente o conteúdo real capturado.
6. Escreva um resumo didático objetivo, entre 1 e 3 parágrafos, baseado exclusivamente no conteúdo da imagem.
7. Liste de 3 a 6 conceitos principais (keyConcepts) presentes no conteúdo.
8. Liste algumas palavras-chave técnicas (keywords) — termos, fórmulas ou nomes exatos que aparecem na imagem.
9. Gere aproximadamente 5 flashcards (pergunta curta + resposta objetiva) cobrindo os pontos principais.
10. Gere aproximadamente 4 questões abertas (openQuestions) para reflexão/estudo sobre o conteúdo.
11. Gere aproximadamente 5 questões de múltipla escolha (quiz), cada uma com exatamente 4 alternativas
    plausíveis, o índice (0 a 3) da alternativa correta, e uma explicação curta da resposta.
12. Classifique a dificuldade aproximada do conteúdo em "easy", "medium" ou "hard".

Regras muito importantes:
- Baseie-se exclusivamente no que está presente ou é claramente inferível da imagem.
- NUNCA invente textos, fórmulas, nomes, datas ou conceitos que não estejam relacionados ao conteúdo capturado.
- NUNCA crie questões sobre informações que não aparecem e não podem ser inferidas com segurança da imagem.
- Se houver pouco conteúdo na imagem, não force uma quantidade artificial de flashcards/questões — gere menos,
  mas nunca invente para completar.
- Se a imagem estiver ilegível ou sem conteúdo educacional, retorne apenas success=false e error, sem os
  demais campos de conteúdo.

Responda EXATAMENTE no formato JSON abaixo, com estas chaves e estes tipos — nada a mais, nada a menos
(especialmente: "openQuestions" é um array de strings simples, SEM resposta; e cada item de "quiz" usa a
chave "answer" para o índice da alternativa correta, nunca "correct"):

{
  "success": true,
  "subject": "string",
  "topic": "string",
  "title": "string",
  "extractedText": "string",
  "summary": "string",
  "keyConcepts": ["string", "..."],
  "keywords": ["string", "..."],
  "flashcards": [{ "question": "string", "answer": "string" }],
  "openQuestions": ["string", "..."],
  "quiz": [{ "question": "string", "options": ["string", "string", "string", "string"], "answer": 0, "explanation": "string" }],
  "difficulty": "easy" | "medium" | "hard"
}

Se success for false, retorne apenas { "success": false, "error": "string" }.`;

// ─── Modo Inclusão (Fase 10) — preferências de aprendizagem ──────────────────
//
// Estas chaves são réplica de LEARNING_PREFERENCE_KEYS em src/constants.js. A
// função serverless (api/analyze.js) não pode importar de src/, por isso a
// lista vive nos dois lugares; um teste de paridade em scripts/test-data-layer.mjs
// falha se elas divergirem.
export const PREFERENCE_KEYS = ["simplify", "focus", "visual", "stepByStep"];

// Cabeçalho comum: as preferências mudam a APRESENTAÇÃO, nunca o conteúdo.
const PREFERENCE_GUARDRAILS = `O estudante escolheu preferências de aprendizagem. Elas mudam APENAS a forma de
apresentar o conteúdo — linguagem, ênfase, organização, sequência. NUNCA mudam a
veracidade, o significado, os fatos, nem as respostas corretas das questões.
Não diagnostique o estudante, não mencione TDAH, dislexia, autismo, nem qualquer
condição médica ou de neurodesenvolvimento, e não comente as preferências dentro
do conteúdo gerado. Aplique-as aos campos "summary", "flashcards", "openQuestions"
e às "explanation" do quiz. Se várias preferências estiverem ativas, combine todas.`;

// Regra por preferência. Os marcadores textuais em "visual" e "stepByStep"
// ("- " no início da linha, "1. " para etapas, linha terminada em ":") são um
// CONTRATO com o renderizador de src/components/study/ContentBlocks.jsx.
const PREFERENCE_RULES = {
  simplify: `- Simplificar: use frases curtas e linguagem direta. Quando um termo técnico for
  necessário, explique-o em vez de apenas removê-lo. Não sacrifique precisão nem
  omita informação essencial para parecer mais simples.`,
  focus: `- Foco: priorize o essencial. Corte detalhes secundários, deixe o "summary" mais
  enxuto e mantenha em "keyConcepts" apenas o que sustenta a compreensão.`,
  visual: `- Visual: no "summary", organize com hierarquia. Use subtítulos curtos terminados
  em ":" e itens de lista iniciados por "- ". Separe explicitamente conceito,
  exemplo e aplicação. Não use emoji decorativo.`,
  stepByStep: `- Passo a passo: no "summary", apresente o raciocínio como sequência numerada
  ("1. ", "2. ", ...). Para exercícios ou problemas, siga esta ordem: o que se pede,
  qual conceito usar, os passos, e só então o resultado — nunca revele o resultado
  antes dos passos. No máximo ~6 passos; não transforme tudo em um tutorial gigante.`,
};

const FORMAT_SECTION_MARKER = "Responda EXATAMENTE no formato JSON abaixo";

// Normaliza qualquer entrada (body de requisição incluído — nunca confiável) a
// um objeto só com as 4 chaves canônicas, sempre booleanas. Chave desconhecida
// e valor não-boolean são descartados; entrada ausente vira tudo false.
export function sanitizePreferences(preferences) {
  const out = {};
  const src = preferences && typeof preferences === "object" && !Array.isArray(preferences) ? preferences : {};
  for (const key of PREFERENCE_KEYS) out[key] = src[key] === true;
  return out;
}

// Monta o prompt de análise. Sem nenhuma preferência ativa devolve
// ANALYSIS_PROMPT sem uma única alteração (o caminho legado é intocado). Com
// preferências ativas, insere o bloco de adaptação ANTES da seção de formato
// JSON, para que as regras de formato continuem sendo as últimas e mais fortes.
export function buildAnalysisPrompt(preferences) {
  const norm = sanitizePreferences(preferences);
  const active = PREFERENCE_KEYS.filter((key) => norm[key]);
  if (active.length === 0) return ANALYSIS_PROMPT;

  const block = `${PREFERENCE_GUARDRAILS}

Preferências ativas — aplique todas:
${active.map((key) => PREFERENCE_RULES[key]).join("\n")}

`;

  return ANALYSIS_PROMPT.replace(FORMAT_SECTION_MARKER, block + FORMAT_SECTION_MARKER);
}
