import { useEffect } from "react";
import { motion } from "framer-motion";
import { CheckCircle, AlertTriangle } from "lucide-react";
import LogoSVG from "../components/brand/LogoSVG";

const STEPS = [
  { key: "uploading", text: "Enviando imagem" },
  { key: "analyzing", text: "Analisando conteúdo" },
  { key: "generating", text: "Gerando material de estudo" },
];

// Progresso refletindo o status real da requisição a /api/analyze — sem timeouts
// artificiais fingindo processamento.
export default function AnalysisScreen({ status, error, onRetry, onCancel, onDone }) {
  useEffect(() => {
    if (status === "done") onDone();
  }, [status, onDone]);

  if (status === "error") {
    return (
      <div style={{ width: "100%", height: "100%", background: "linear-gradient(160deg,#030712 0%,#0f172a 55%,#1e1b4b 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 32, textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "rgba(220,38,38,0.15)", border: "2px solid rgba(220,38,38,0.4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <AlertTriangle size={30} color="#F87171" />
        </div>
        <p style={{ fontFamily: "Inter,sans-serif", fontSize: 18, fontWeight: 800, color: "white", margin: 0 }}>Não foi possível analisar</p>
        <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: "rgba(255,255,255,0.7)", margin: 0, maxWidth: 280 }}>{error}</p>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button onClick={onCancel}
            style={{ padding: "12px 20px", borderRadius: 30, background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.25)", color: "white", fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Voltar à câmera
          </button>
          <button onClick={onRetry}
            style={{ padding: "12px 20px", borderRadius: 30, background: "#2563EB", border: "none", color: "white", fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const activeIndex = status === "uploading" ? 0 : status === "analyzing" ? 1 : 2;

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

      {/* Steps — refletem o status real da requisição */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, zIndex: 10, width: 260 }}>
        {STEPS.map((s, i) => {
          const done = i < activeIndex;
          const current = i === activeIndex;
          return (
            <motion.div key={s.key} initial={{ opacity: 0, x: -16 }} animate={{ opacity: done || current ? 1 : 0.35, x: 0 }}
              style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: done ? "rgba(20,184,166,0.15)" : "rgba(255,255,255,0.08)", border: `1.5px solid ${done ? "#14B8A6" : "rgba(255,255,255,0.25)"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {done ? <CheckCircle size={13} color="#14B8A6" /> : current ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white" }} />
                ) : null}
              </div>
              <span style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 500, color: "rgba(255,255,255,0.88)" }}>{s.text}</span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
