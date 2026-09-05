import { motion } from "framer-motion";
import { Star } from "lucide-react";

// Atalho para a tela Vision+, reutilizado nos headers de Biblioteca, Revisão
// e Evolução — mesmo visual e mesmo destino em todo o app.
export default function VisionPlusButton({ onClick }) {
  return (
    <motion.button whileTap={{ scale: 0.94 }} onClick={onClick} aria-label="Ver Study Vision+"
      style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", minHeight: 30, borderRadius: 20, background: "linear-gradient(135deg,#2563EB,#7C3AED)", border: "none", cursor: "pointer" }}>
      <Star size={11} fill="white" color="white" />
      <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 700, color: "white" }}>Vision+</span>
    </motion.button>
  );
}
