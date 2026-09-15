// Ler Comigo — seleção do texto acadêmico a narrar. Só lê o que o Study
// Vision já gerou sobre o Content: nunca toca na imagem, nunca faz OCR,
// nunca chama o Gemini de novo para "entender" o conteúdo. A imagem já foi
// processada em outra etapa (analyze.js); aqui só existe texto.
//
// Ordem de prioridade (decisão da Etapa 3): summary → keyConcepts[] →
// extractedText como fallback só quando os dois primeiros estiverem vazios.
// Campos estruturais (id, datas, quizzes, notes, mastery...) nunca entram.

const MIN_READING_CHARS = 120;

function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanConceptList(value) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => cleanText(item)).filter(Boolean);
}

// Une os conceitos-chave numa frase por item, pontuação normalizada — não é
// uma lista de fragmentos soltos, é texto lido em voz alta.
function joinKeyConcepts(concepts) {
  return concepts
    .map((concept) => (/[.!?…]$/.test(concept) ? concept : `${concept}.`))
    .join(" ");
}

// Monta os blocos de leitura, na ordem de prioridade acadêmica. `usedFields`
// documenta exatamente quais campos do Content alimentaram a leitura — é o
// que o relatório final usa para provar a origem do texto.
export function buildReadingSource(content) {
  const blocks = [];
  const usedFields = [];

  const summary = cleanText(content?.summary);
  if (summary) {
    blocks.push({ kind: "summary", title: null, text: summary });
    usedFields.push("summary");
  }

  const keyConcepts = cleanConceptList(content?.keyConcepts);
  if (keyConcepts.length) {
    blocks.push({ kind: "keyConcepts", title: "Conceitos-chave", text: joinKeyConcepts(keyConcepts) });
    usedFields.push("keyConcepts");
  }

  // extractedText é o texto cru extraído da imagem — só serve de leitura
  // quando não existe nada tratado pelo Gemini (summary/keyConcepts vazios).
  if (blocks.length === 0) {
    const extractedText = cleanText(content?.extractedText);
    if (extractedText) {
      blocks.push({ kind: "extractedText", title: null, text: extractedText });
      usedFields.push("extractedText");
    }
  }

  const combinedLength = blocks.reduce((sum, block) => sum + block.text.length, 0);

  return { blocks, usedFields, hasEnough: combinedLength >= MIN_READING_CHARS };
}

export function hasEnoughReadingText(source) {
  return source?.hasEnough === true;
}

// Texto plano final que alimenta a segmentação — cada bloco vira um
// parágrafo próprio (título incluso quando existir), preservando quebras
// entre blocos para a segmentação não fundir "Conceitos-chave" com o resumo.
export function readingSourceText(source) {
  if (!source || !Array.isArray(source.blocks)) return "";
  return source.blocks
    .map((block) => (block.title ? `${block.title}: ${block.text}` : block.text))
    .join("\n\n");
}

// Hash determinístico e simples (djb2) do texto-fonte + perfil de
// segmentação — usado como `sourceFingerprint` do progresso salvo. Não
// precisa ser criptográfico: só precisa mudar quando o texto ou o perfil
// mudam, para o service clampar o índice em vez de apontar para um trecho
// que não existe mais.
export function computeSourceFingerprint(text, profile) {
  const base = `${profile?.maxChars || 0}:${text || ""}`;
  let hash = 5381;
  for (let i = 0; i < base.length; i += 1) {
    hash = ((hash << 5) + hash + base.charCodeAt(i)) | 0;
  }
  return `fp_${(hash >>> 0).toString(36)}`;
}

const READING_ERROR_MESSAGES = {
  insufficient_content: "Este conteúdo ainda não possui texto suficiente para iniciar a leitura.",
  unsupported: "A leitura em voz não está disponível neste navegador.",
};

// Nunca expõe mensagem crua de erro — sempre traduz para uma das frases
// acima (mesmo padrão de focusErrorMessage em useFocusSession.js).
export function readingErrorMessage(kind) {
  return READING_ERROR_MESSAGES[kind] || READING_ERROR_MESSAGES.insufficient_content;
}
