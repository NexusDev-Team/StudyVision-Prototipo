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

// ─── Modo Inclusão — necessidades de acessibilidade declaradas ───────────────
//
// O estudante informa ONDE encontra dificuldade; cada necessidade produz uma
// adaptação DIFERENTE da apresentação. Não é diagnóstico — sem rótulo médico.
// Estas chaves são réplica de LEARNING_PREFERENCE_KEYS em src/constants.js
// (a função serverless não importa src/); um teste de paridade em
// scripts/test-data-layer.mjs falha se divergirem.
export const PREFERENCE_KEYS = ["concentration", "longText", "textTracking", "complexContent", "manySteps"];

// Cabeçalho comum: as necessidades mudam a APRESENTAÇÃO, nunca o conteúdo.
const PREFERENCE_GUARDRAILS = `O estudante informou dificuldades que encontra ao estudar. Use-as para adaptar
APENAS a forma de apresentar o conteúdo — linguagem, ênfase, organização,
disposição, sequência. NUNCA mudam a veracidade, o significado, os fatos, as
fórmulas nem as respostas corretas das questões. NUNCA elimine etapas de uma
resolução, conceitos essenciais ou informação acadêmica para "facilitar": se um
processo tem cinco etapas, apresente as cinco. Não infantilize o conteúdo.
Não diagnostique o estudante, não mencione TDAH, dislexia, autismo, nem qualquer
condição médica ou de neurodesenvolvimento, e não comente essas dificuldades
dentro do conteúdo gerado. Aplique as adaptações aos campos "summary",
"flashcards", "openQuestions" e às "explanation" do quiz. Se várias dificuldades
estiverem ativas, combine todas.`;

// Formatação do "summary" quando longText / textTracking / manySteps estão
// ativos. Os marcadores ("- " no início da linha, "1. " para etapas, linha SÓ
// com o subtítulo terminando em ":") são um CONTRATO com o renderizador de
// src/components/study/ContentBlocks.jsx — o texto precisa vir com quebras de
// linha reais ("\n"), um bloco por linha.
const SUMMARY_FORMATTING = `Formatação do "summary" (use quebras de linha reais, "\\n", entre os blocos):
  - Subtítulo: uma linha contendo APENAS o rótulo curto seguido de ":", nada de
    texto depois dos dois-pontos na mesma linha. O conteúdo daquele subtítulo vem
    nas linhas seguintes. Ex.:
      Conceito:
      - primeira ideia
      - segunda ideia
  - Item de lista: linha iniciada por "- ".
  - Etapa: linha iniciada por "1. ", "2. ", ... (uma etapa por linha).
  - Nunca junte rótulo e texto na mesma linha; nunca use "-" ou número no meio de
    uma frase corrida.`;

// Regra por necessidade. Cada uma tem um FOCO distinto — não podem convergir
// para "resuma o conteúdo":
//  concentration  = quanto de informação por vez
//  longText       = tamanho do texto e das frases
//  textTracking   = disposição na tela (acompanhar a leitura)
//  complexContent = profundidade / progressão da explicação
//  manySteps      = granularidade de processos e exercícios
const PREFERENCE_RULES = {
  concentration: `- Dificuldade de concentração: apresente UMA ideia por vez. Blocos curtos, um
  conceito por bloco, nunca vários conceitos empilhados no mesmo parágrafo. Corte
  informação secundária e digressão; destaque só o essencial de cada ponto. Não
  peça ao estudante que segure muitas coisas na cabeça ao mesmo tempo.`,
  longText: `- Dificuldade com textos longos: quebre paredes de texto em blocos curtos, cada
  um com um subtítulo próprio. Encurte as FRASES (frases longas viram duas ou três
  curtas), nunca o conteúdo. Todo o significado e toda a informação importante são
  preservados — só a extensão da redação diminui.`,
  textTracking: `- Dificuldade para acompanhar textos: priorize a DISPOSIÇÃO. Parágrafos curtos e
  bem separados, uma ideia por bloco, com separação nítida entre título, conceito
  e explicação (cada um em seu próprio bloco). Não altere o significado nem
  encurte o conteúdo por causa desta dificuldade — só reorganize para a leitura
  fluir linha a linha.`,
  complexContent: `- Dificuldade com conteúdos complexos: construa a explicação em progressão. Defina
  cada termo técnico ANTES de usá-lo. Traga um exemplo concreto sempre que possível
  e reduza a abstração. Explique gradualmente, do mais simples ao mais denso, sem
  infantilizar e sem remover nenhum conceito essencial.`,
  manySteps: `- Dificuldade com muitas etapas: divida todo processo, exercício ou demonstração
  em etapas, UMA por linha ("1. ", "2. ", ...). Em cada etapa, separe claramente a
  ação, o porquê e o resultado parcial. Não entregue a resolução inteira de uma
  vez. Preserve TODAS as etapas — nenhuma é pulada para encurtar.`,
};

// Chaves cujo resultado depende da formatação por linha do "summary".
const FORMATTING_KEYS = ["longText", "textTracking", "manySteps"];

const FORMAT_SECTION_MARKER = "Responda EXATAMENTE no formato JSON abaixo";

// Normaliza qualquer entrada (body de requisição incluído — nunca confiável) a
// um objeto só com as chaves canônicas, sempre booleanas. Chave desconhecida
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

  const needsFormatting = active.some((key) => FORMATTING_KEYS.includes(key));

  const block = `${PREFERENCE_GUARDRAILS}

Preferências ativas — aplique todas:
${active.map((key) => PREFERENCE_RULES[key]).join("\n")}
${needsFormatting ? `\n${SUMMARY_FORMATTING}\n` : ""}
`;

  return ANALYSIS_PROMPT.replace(FORMAT_SECTION_MARKER, block + FORMAT_SECTION_MARKER);
}
