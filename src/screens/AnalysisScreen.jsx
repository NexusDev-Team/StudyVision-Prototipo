import { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";
import LogoSVG from "../components/brand/LogoSVG";

const STEPS = [
  { text: "Texto identificado", delay: 0.9 },
  { text: "Legibilidade 96%", delay: 1.6 },
  { text: "Qualidade excelente", delay: 2.3 },
  { text: "Conteúdo pronto para estudo", delay: 2.9 },
];

export default function AnalysisScreen({ onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 4600); return () => clearTimeout(t); }, []);

  return (
    <div style={{ width: "100%", height: "100%", background: "linear-gradient(160deg,#030712 0%,#0f172a 55%,#1e1b4b 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      {/* Rings */}
      {[100, 160, 220].map((s, i) => (
        <motion.div key={i} animate={{ scale: [1, 1.12 + i * 0.05, 1], opacity: [0.25, 0.06, 0.25] }}
          transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.4, ease: "easeInOut" }}
          style={{ position: "absolute", width: s, height: s, borderRadius: "50%", border: "1.5px solid rgba(37,99,235,0.55)" }} />
      ))}

      {/* Logo pulse */}
      <motion.div animate={{ scale: [0.96, 1.04, 0.96] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        style={{ position: "relative", zIndex: 10, marginBottom: 32, width: 80, height: 80, borderRadius: "50%", background: "rgba(37,99,235,0.12)", border: "2px solid rgba(37,99,235,0.4)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 40px rgba(37,99,235,0.35)" }}>
        <LogoSVG size={48} glow />
      </motion.div>

      <motion.p initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
        style={{ fontFamily: "Inter,sans-serif", fontSize: 22, fontWeight: 800, color: "white", marginBottom: 8, zIndex: 10, textAlign: "center" }}>
        Analisando conteúdo
      </motion.p>

      {/* Dots */}
      <div style={{ display: "flex", gap: 5, marginBottom: 36, zIndex: 10 }}>
        {[0, 1, 2].map(i => (
          <motion.div key={i} animate={{ scale: [1, 1.6, 1], opacity: [0.35, 1, 0.35] }}
            transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.22 }}
            style={{ width: 6, height: 6, borderRadius: "50%", background: "#2563EB" }} />
        ))}
      </div>

      {/* Steps */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, zIndex: 10, width: 260 }}>
        {STEPS.map((s, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: s.delay, type: "spring", stiffness: 300, damping: 22 }}
            style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: "50%", background: "rgba(20,184,166,0.15)", border: "1.5px solid #14B8A6", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <CheckCircle size={13} color="#14B8A6" />
            </div>
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.88)" }}>{s.text}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
