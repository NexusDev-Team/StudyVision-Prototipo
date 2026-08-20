import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

// Replaces the sell-the-plan hero once the trial is active — no repeated
// purchase CTAs, no fake countdown urgency, just a quiet status line.
export default function PlusActiveStatus({ daysRemaining }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24, padding: "14px 16px", borderRadius: 16, background: "#F0FDF4", border: "1px solid #BBF7D0" }}>
      <CheckCircle2 size={22} color="#16A34A" style={{ flexShrink: 0 }} />
      <div>
        <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 800, color: "#16A34A", margin: 0 }}>Study Vision+ ativo</p>
        <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#166534", margin: "2px 0 0" }}>
          Seu período de teste termina em {daysRemaining} {daysRemaining === 1 ? "dia" : "dias"}.
        </p>
      </div>
    </motion.div>
  );
}
