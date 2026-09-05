import { useState } from "react";
import { Check } from "lucide-react";
import Card from "../ui/Card";
import SectionLabel from "../ui/SectionLabel";

// Anotações do estudante — sempre separadas do RESUMO INTELIGENTE gerado pela
// IA (ContentBlocks). Salvamento explícito, nunca a cada tecla digitada.
export default function NotesSection({ content, onSave }) {
  const [draft, setDraft] = useState(content.notes || "");
  const [saved, setSaved] = useState(true);

  const handleChange = (e) => {
    setDraft(e.target.value);
    setSaved(false);
  };

  const handleSave = () => {
    onSave(draft);
    setSaved(true);
  };

  return (
    <Card style={{ marginBottom: 10 }}>
      <SectionLabel>MINHAS NOTAS</SectionLabel>
      <textarea
        value={draft}
        onChange={handleChange}
        placeholder="Adicione suas anotações sobre este conteúdo."
        rows={4}
        style={{
          width: "100%", boxSizing: "border-box", resize: "vertical", border: "1.5px solid #E2E8F0",
          borderRadius: 12, padding: "10px 12px", fontFamily: "Inter,sans-serif", fontSize: 13.5,
          color: "#374151", lineHeight: 1.6, outline: "none",
        }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <button onClick={handleSave} disabled={saved}
          style={{
            display: "flex", alignItems: "center", gap: 6, height: 36, padding: "0 14px", borderRadius: 10,
            border: "none", background: saved ? "#F1F5F9" : "#2563EB", color: saved ? "#94A3B8" : "white",
            fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, cursor: saved ? "default" : "pointer",
          }}>
          <Check size={14} />
          {saved ? "Salvo" : "Salvar nota"}
        </button>
      </div>
    </Card>
  );
}
