import { relativeLabel } from "../utils/date";

// Copy-to-clipboard é real (navigator.clipboard). A geração de PDF ainda é
// mock — vira real no T7 do PLANO-FASE-2-INTEGRACAO.
function buildExportText(content) {
  return [
    content.title,
    relativeLabel(content.createdAt),
    "",
    "Resumo:",
    content.summary,
    "",
    "Conceitos-chave:",
    ...(content.keyConcepts || []).map((c) => `- ${c}`),
    "",
    "Perguntas para estudar:",
    ...(content.openQuestions || []).map((q, i) => `${i + 1}. ${q.question}`),
  ].join("\n");
}

export function exportDocument(content) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({ fileName: `${content.title}.pdf`, exportedAt: Date.now() });
    }, 900);
  });
}

export function copyContent(content) {
  const text = buildExportText(content);
  return new Promise((resolve) => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setTimeout(() => resolve({ text }), 300);
  });
}
