import { motion, AnimatePresence } from "framer-motion";
import { Lock } from "lucide-react";
import Button from "../ui/Button";

// Locked content stays visible but blurred behind a bottom-anchored gradient +
// conversion block — never a blank screen or generic modal. Unlocking animates
// the blur away instead of instantly swapping the DOM.
export default function PlusPaywall({ locked, title = "Desbloqueie sua evolução", message, onStartTrial, children }) {
  return (
    <div style={{ position: "relative", borderRadius: 20, overflow: "hidden" }}>
      <motion.div
        animate={{ filter: locked ? "blur(5px)" : "blur(0px)", opacity: locked ? 0.55 : 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        style={{ pointerEvents: locked ? "none" : "auto", userSelect: locked ? "none" : "auto" }}
      >
        {children}
      </motion.div>
      <AnimatePresence>
        {locked && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}
            style={{
              position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              textAlign: "center", padding: "20px 24px",
              background: "linear-gradient(180deg, rgba(248,250,252,0.3) 0%, rgba(248,250,252,0.94) 45%, rgba(248,250,252,0.98) 100%)",
            }}
          >
            <Lock size={22} color="#7C3AED" style={{ marginBottom: 8 }} />
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 15, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>{title}</p>
            {message && <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#64748B", margin: "0 0 14px", maxWidth: 240, lineHeight: 1.5 }}>{message}</p>}
            <Button variant="primary" onClick={onStartTrial} style={{ padding: "0 22px", height: 44, fontSize: 13 }}>
              Começar 7 dias grátis
            </Button>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: "#94A3B8", margin: "8px 0 0" }}>Depois, R$ 9,90/mês · cancele quando quiser</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
