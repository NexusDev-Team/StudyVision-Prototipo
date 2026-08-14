import { useState } from "react";
import { BookOpen, FileText, Copy } from "lucide-react";
import Card from "../ui/Card";
import SectionLabel from "../ui/SectionLabel";
import { exportToNotion } from "../../services/notionService";
import { exportDocument, copyContent } from "../../services/exportService";

export default function ExportSection({ item, onToast }) {
  const [busy, setBusy] = useState(null); // "notion" | "doc" | "copy" | null

  const run = async (key, fn, successMsg) => {
    if (busy) return;
    setBusy(key);
    await fn(item);
    setBusy(null);
    onToast(successMsg);
  };

  const options = [
    { key: "notion", label: "Notion", icon: <BookOpen size={18} color="#111827" />, action: () => run("notion", exportToNotion, "✓ Conteúdo enviado ao Notion com sucesso") },
    { key: "doc", label: "Documento PDF/DOCX", icon: <FileText size={18} color="#DC2626" />, action: () => run("doc", exportDocument, "✓ Documento gerado com sucesso") },
    { key: "copy", label: "Copiar Conteúdo", icon: <Copy size={18} color="#2563EB" />, action: () => run("copy", copyContent, "✓ Conteúdo copiado") },
  ];

  return (
    <Card initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
      <SectionLabel>EXPORTAR CONTEÚDO</SectionLabel>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {options.map(o => (
          <button key={o.key} onClick={o.action} disabled={!!busy}
            style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 12, background: "#F8FAFC", border: "1px solid #E2E8F0", cursor: busy ? "default" : "pointer", fontFamily: "Inter,sans-serif" }}>
            {o.icon}
            <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{o.label}</span>
            {busy === o.key && <span style={{ marginLeft: "auto", fontSize: 11, color: "#94A3B8" }}>Enviando...</span>}
          </button>
        ))}
      </div>
    </Card>
  );
}
