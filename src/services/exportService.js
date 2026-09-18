import { relativeLabel } from "../utils/date.js";
import { getSubjectVisual } from "../constants.js";

// Documento de estudo em PDF real (jsPDF, gerado no cliente). Contém: título e
// matéria, data, resumo, conceitos-chave / palavras-chave e a lista numerada de
// perguntas abertas. Sem quiz e sem flashcards — é um roteiro de questões para
// estudar. jsPDF é carregado sob demanda para não pesar no bundle inicial.
export async function exportDocument(content) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const marginX = 48;
  const maxWidth = doc.internal.pageSize.getWidth() - marginX * 2;
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 64;

  const ensureSpace = (needed) => {
    if (y + needed > pageHeight - 56) {
      doc.addPage();
      y = 64;
    }
  };

  const writeParagraph = (text, { size = 11, gap = 12, color = [51, 65, 85], style = "normal" } = {}) => {
    if (!text) return;
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lineHeight = size + 4;
    const lines = doc.splitTextToSize(String(text), maxWidth);
    for (const line of lines) {
      ensureSpace(lineHeight);
      doc.text(line, marginX, y);
      y += lineHeight;
    }
    y += gap;
  };

  const writeHeading = (text) => {
    ensureSpace(28);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(String(text).toUpperCase(), marginX, y);
    y += 18;
  };

  // Cabeçalho
  const accent = getSubjectVisual(content.subjectName).color;
  const rgb = [
    parseInt(accent.slice(1, 3), 16),
    parseInt(accent.slice(3, 5), 16),
    parseInt(accent.slice(5, 7), 16),
  ];
  doc.setFillColor(...rgb);
  doc.rect(0, 0, doc.internal.pageSize.getWidth(), 6, "F");

  writeParagraph(content.title || "Conteúdo sem título", { size: 20, gap: 8, color: [17, 24, 39], style: "bold" });
  writeParagraph(
    [content.subjectName, content.topic].filter(Boolean).join(" · ") + `  ·  ${relativeLabel(content.createdAt)}`,
    { size: 10, gap: 24, color: [100, 116, 139] }
  );

  if (content.summary) {
    writeHeading("Resumo");
    writeParagraph(content.summary, { gap: 22 });
  }

  const related = [...(content.keyConcepts || []), ...(content.keywords || [])];
  if (related.length > 0) {
    writeHeading("Itens relacionados");
    writeParagraph(related.join("  ·  "), { gap: 22, color: [71, 85, 105] });
  }

  const questions = content.openQuestions || [];
  if (questions.length > 0) {
    writeHeading("Perguntas para estudar");
    questions.forEach((q, i) => {
      writeParagraph(`${i + 1}. ${q.question}`, { gap: 12, color: [31, 41, 55] });
    });
  }

  const fileName = `${(content.title || "estudo").replace(/[^\p{L}\p{N} _-]/gu, "").trim() || "estudo"}.pdf`;
  doc.save(fileName);
  return { fileName, exportedAt: Date.now() };
}

function buildExportText(content) {
  return [
    content.title,
    relativeLabel(content.createdAt),
    "",
    "Resumo:",
    content.summary,
    "",
    "Itens relacionados:",
    ...[...(content.keyConcepts || []), ...(content.keywords || [])].map((c) => `- ${c}`),
    "",
    "Perguntas para estudar:",
    ...(content.openQuestions || []).map((q, i) => `${i + 1}. ${q.question}`),
  ].join("\n");
}

// Cópia genérica para a área de transferência — usada por qualquer feature
// que precise copiar texto (export de conteúdo, extração de texto da foto).
// Se falhar (permissão, contexto não seguro), a rejeição é propagada para
// quem chamou avisar o usuário — não é engolida.
export function copyText(text) {
  if (!navigator.clipboard?.writeText) {
    return Promise.reject(new Error("Área de transferência indisponível neste navegador."));
  }
  return navigator.clipboard.writeText(text).then(() => ({ text }));
}

// Cópia real para a área de transferência do texto de export do Content.
export function copyContent(content) {
  return copyText(buildExportText(content));
}
