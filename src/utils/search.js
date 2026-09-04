// Busca real da Biblioteca — cobre título, matéria, tópico, conceitos
// principais, palavras-chave e texto extraído, não só título/matéria.

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function matchesQuery(content, query) {
  const q = normalize(query).trim();
  if (!q) return true;
  if (!content) return false;

  const haystacks = [
    content.title,
    content.subjectName,
    content.topic,
    content.extractedText,
    ...(Array.isArray(content.keyConcepts) ? content.keyConcepts : []),
    ...(Array.isArray(content.keywords) ? content.keywords : []),
  ];

  return haystacks.some((field) => field && normalize(field).includes(q));
}
