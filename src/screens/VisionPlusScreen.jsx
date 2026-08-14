import { motion } from "framer-motion";
import { ChevronLeft, CreditCard, Brain, Star, Lock, Sparkles } from "lucide-react";
import LogoSVG from "../components/brand/LogoSVG";

const FEATURES = [
  {
    icon: <CreditCard size={26} />,
    title: "Flashcards Inteligentes",
    desc: "Transforme automaticamente qualquer conteúdo em flashcards com revisão espaçada baseada em IA. Nunca mais esqueça o que estudou.",
    grad: "linear-gradient(135deg,#7C3AED,#4F46E5)",
    glow: "rgba(124,58,237,0.28)",
  },
  {
    icon: <Brain size={26} />,
    title: "Perguntas Inteligentes",
    desc: "Gere perguntas personalizadas com IA para testar seu conhecimento e identificar lacunas no aprendizado de forma eficiente.",
    grad: "linear-gradient(135deg,#2563EB,#0EA5E9)",
    glow: "rgba(37,99,235,0.28)",
  },
];

export default function VisionPlusScreen({ onBack }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#030712", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      <div style={{ padding: "52px 20px 0", flexShrink: 0 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <ChevronLeft size={20} color="rgba(255,255,255,0.5)" />
          <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.5)" }}>Voltar</span>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 20px 30px" }}>
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(37,99,235,0.12)", border: "2px solid rgba(37,99,235,0.35)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 0 30px rgba(37,99,235,0.3)" }}>
              <LogoSVG size={34} glow />
            </div>
            <div style={{ textAlign: "left" }}>
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 26, fontWeight: 900, color: "white", margin: 0, lineHeight: 1.1 }}>Study</p>
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 26, fontWeight: 900, margin: 0, lineHeight: 1.1, background: "linear-gradient(90deg,#60A5FA,#A78BFA)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Vision+</p>
            </div>
          </div>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: "rgba(255,255,255,0.45)", lineHeight: 1.65, maxWidth: 260, margin: "0 auto" }}>
            Eleve seu aprendizado com IA generativa. Funcionalidades exclusivas para quem leva os estudos a sério.
          </p>
        </motion.div>

        {/* Feature cards */}
        {FEATURES.map((f, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.13, type: "spring", stiffness: 280, damping: 24 }}
            style={{ borderRadius: 24, overflow: "hidden", marginBottom: 14, boxShadow: `0 8px 32px ${f.glow}` }}>
            <div style={{ background: f.grad, padding: "22px 22px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ color: "white", opacity: 0.9 }}>{f.icon}</span>
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 17, fontWeight: 800, color: "white" }}>{f.title}</span>
                <div style={{ marginLeft: "auto", background: "rgba(255,255,255,0.2)", borderRadius: 20, padding: "3px 10px" }}>
                  <Star size={11} fill="white" color="white" />
                </div>
              </div>
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "rgba(255,255,255,0.82)", lineHeight: 1.65, margin: 0 }}>{f.desc}</p>
            </div>
            <div style={{ background: "rgba(255,255,255,0.04)", padding: "12px 22px", display: "flex", alignItems: "center", gap: 6, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <Lock size={13} color="rgba(255,255,255,0.4)" />
              <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>Disponível com Vision+</span>
            </div>
          </motion.div>
        ))}

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }} style={{ marginTop: 8 }}>
          <motion.button whileTap={{ scale: 0.97 }}
            style={{ width: "100%", height: 56, borderRadius: 18, background: "linear-gradient(135deg,#2563EB,#7C3AED)", border: "none", cursor: "pointer", fontFamily: "Inter,sans-serif", fontSize: 16, fontWeight: 800, color: "white", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 8px 32px rgba(124,58,237,0.4)" }}>
            <Sparkles size={18} />
            Ativar Study Vision+
          </motion.button>
          <p style={{ textAlign: "center", fontSize: 12, color: "rgba(255,255,255,0.2)", marginTop: 12, fontFamily: "Inter,sans-serif" }}>
            JOVI Smartphones · "A câmera que captura conhecimento."
          </p>
        </motion.div>
      </div>
    </div>
  );
}
