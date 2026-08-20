import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import Button from "../ui/Button";

// Sell the outcome first, price second — hero for the free/pre-trial state.
export default function PlusHero({ onStartTrial }) {
  const scrollToFeatures = () => {
    document.getElementById("plus-features")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24, textAlign: "center" }}>
      <h2 style={{ fontFamily: "Inter,sans-serif", fontSize: 20, fontWeight: 800, color: "#111827", margin: "0 0 8px" }}>
        Transforme seus estudos em evolução.
      </h2>
      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: "#64748B", lineHeight: 1.6, maxWidth: 300, margin: "0 auto 18px" }}>
        Descubra onde você está evoluindo, quais conteúdos precisam de atenção e como estudar de forma mais inteligente.
      </p>

      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center", gap: 8, marginBottom: 4 }}>
        <span style={{ fontFamily: "Inter,sans-serif", fontSize: 26, fontWeight: 900, color: "#111827" }}>R$ 9,90</span>
        <span style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 600, color: "#64748B" }}>/mês</span>
      </div>
      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#2563EB", margin: "0 0 16px" }}>7 dias grátis</p>

      <Button variant="primary" onClick={onStartTrial} style={{ width: "100%", height: 52, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Sparkles size={17} />
        Começar 7 dias grátis
      </Button>
      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#94A3B8", margin: "10px 0 0" }}>Cancele quando quiser.</p>

      <button onClick={scrollToFeatures} style={{ marginTop: 6, padding: "12px 16px", minHeight: 44, background: "none", border: "none", cursor: "pointer", fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#7C3AED" }}>
        Conhecer recursos
      </button>
    </motion.div>
  );
}
