// Entrada do Ler Comigo na página de Content — três estados, mesmo padrão de
// FocusEntryCard.jsx: (1) texto insuficiente → aviso, sem botão quebrado;
// (2) progresso existente → card de retomada, "Continuar leitura" é a ação
//     primária; concluída → "Ler novamente"; (3) sem progresso → botão
//     "Ler Comigo".
//
// A montagem do texto/segmentos aqui é só para decidir o que mostrar —
// nenhuma chamada de rede, nenhum Gemini: tudo local, sobre o Content já
// persistido (useReadingSession → readingService/readingProgressService).

import { motion } from "framer-motion";
import { BookOpen } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import { useReadingSession } from "../../hooks/useReadingSession.js";

export default function ReadingEntryCard({ content, onEnterReading }) {
  const { hasEnough, progress, index, total, status, restart } = useReadingSession(content);

  if (!hasEnough) {
    return (
      <Card style={{ padding: "14px 16px", marginBottom: 12, background: "#F8FAFC", border: "1px dashed #E2E8F0" }}>
        <p style={{ fontSize: 12.5, color: "#64748B", margin: 0, lineHeight: 1.5, fontFamily: "Inter,sans-serif" }}>
          📖 Este conteúdo ainda não possui texto suficiente para iniciar a leitura.
        </p>
      </Card>
    );
  }

  if (progress && status === "completed") {
    return (
      <Card
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{ padding: "16px 18px", marginBottom: 12, background: "linear-gradient(135deg,#F0FDF4,#EFF6FF)", border: "1px solid #BBF7D0" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <BookOpen size={16} color="#16A34A" />
          <p style={{ fontSize: 13, fontWeight: 800, color: "#111827", margin: 0, fontFamily: "Inter,sans-serif" }}>Leitura concluída</p>
        </div>
        <p style={{ fontSize: 12.5, color: "#475569", margin: "0 0 12px", fontFamily: "Inter,sans-serif" }}>
          Você já ouviu este conteúdo do início ao fim.
        </p>
        <Button
          variant="primary"
          onClick={() => { restart(); onEnterReading?.(); }}
          style={{ width: "100%", height: 44, fontSize: 13.5 }}
        >
          Ler novamente
        </Button>
      </Card>
    );
  }

  if (progress && index > 0) {
    return (
      <Card
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        style={{ padding: "16px 18px", marginBottom: 12, background: "linear-gradient(135deg,#EFF6FF,#F5F3FF)", border: "1px solid #DBEAFE" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <BookOpen size={16} color="#2563EB" />
          <p style={{ fontSize: 13, fontWeight: 800, color: "#111827", margin: 0, fontFamily: "Inter,sans-serif" }}>Ler Comigo</p>
        </div>
        <p style={{ fontSize: 12.5, color: "#475569", margin: "0 0 12px", fontFamily: "Inter,sans-serif" }}>
          Você parou no trecho {index + 1} de {total}.
        </p>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Button variant="primary" onClick={() => onEnterReading?.()} style={{ flex: 1, height: 44, fontSize: 13.5 }}>
            Continuar leitura
          </Button>
          <button onClick={() => { restart(); onEnterReading?.(); }}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#64748B", fontFamily: "Inter,sans-serif", padding: "8px 4px", minHeight: 44 }}>
            Recomeçar
          </button>
        </div>
      </Card>
    );
  }

  return (
    <motion.button whileTap={{ scale: 0.97 }} onClick={() => onEnterReading?.()}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", height: 52, borderRadius: 16, background: "white", border: "1.5px solid #E2E8F0", cursor: "pointer", marginBottom: 12, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <BookOpen size={18} color="#2563EB" />
      <span style={{ fontFamily: "Inter,sans-serif", fontSize: 14.5, fontWeight: 800, color: "#2563EB" }}>Ler Comigo</span>
    </motion.button>
  );
}
