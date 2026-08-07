// Mock document export / copy-to-clipboard — no real PDF/DOCX generation yet.
// TODO: replace with real PDF/DOCX generation (e.g. jsPDF/docx) + Android share sheet.
function buildExportText(item) {
  return [
    item.concept,
    item.time,
    "",
    "Resumo:",
    item.summary,
    "",
    "Conceitos-chave:",
    ...(item.concepts || []).map(c => `- ${c}`),
    "",
    "Flashcards:",
    ...(item.flashcards || []).map(f => `- ${f.front} -> ${f.back}`),
    "",
    "Perguntas:",
    ...(item.questions || []).map(q => `- ${q}`),
  ].join("\n");
}

export function exportDocument(item) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ fileName: `${item.concept}.pdf`, exportedAt: Date.now() });
    }, 900);
  });
}

export function copyContent(item) {
  const text = buildExportText(item);
  return new Promise((resolve) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setTimeout(() => resolve({ text }), 300);
  });
}
