import { motion } from "framer-motion";
import { ChevronLeft, HelpCircle } from "lucide-react";

export default function QuestionsScreen({ item, onBack }) {
  const qs = item?.questions || [];
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F8FAFC", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      <div style={{ background: "white", padding: "52px 20px 14px", borderBottom: "1px solid #F1F5F9", flexShrink: 0 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12 }}>
          <ChevronLeft size={20} color="#2563EB" />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#2563EB" }}>Voltar</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <HelpCircle size={22} color="#2563EB" />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>Perguntas</h1>
        </div>
        <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>Baseadas em: {item?.concept}</p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 20px" }}>
        {qs.map((q, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            style={{ background: "white", borderRadius: 20, padding: "16px 18px", marginBottom: 10, boxShadow: "0 1px 8px rgba(0,0,0,0.06)", border: "1px solid #E2E8F0" }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#2563EB", letterSpacing: 1.2, marginBottom: 6 }}>PERGUNTA {i + 1}</p>
            <p style={{ fontSize: 14, color: "#374151", lineHeight: 1.55, margin: 0 }}>{q}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
