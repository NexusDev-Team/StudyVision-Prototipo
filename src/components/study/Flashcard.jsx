import { motion } from "framer-motion";

export default function Flashcard({ card, index, flipped, onFlip }) {
  return (
    <motion.div key={index} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }}
      onClick={onFlip}
      style={{ perspective: 1000, cursor: "pointer", marginBottom: 18 }}>
      <motion.div animate={{ rotateY: flipped ? 180 : 0 }} transition={{ duration: 0.45 }}
        style={{ position: "relative", width: "100%", minHeight: 220, transformStyle: "preserve-3d" }}>
        {/* Front */}
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", background: "white", borderRadius: 20, padding: "22px 20px", boxShadow: "0 4px 20px rgba(124,58,237,0.12)", border: "1px solid #E2E8F0", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#7C3AED", letterSpacing: 1.2, marginBottom: 10 }}>FRENTE · toque para virar</p>
          <p style={{ fontSize: 17, fontWeight: 700, color: "#111827", margin: 0, lineHeight: 1.4 }}>{card.front}</p>
        </div>
        {/* Back */}
        <div style={{ position: "absolute", inset: 0, backfaceVisibility: "hidden", transform: "rotateY(180deg)", background: "#7C3AED", borderRadius: 20, padding: "22px 20px", boxShadow: "0 4px 20px rgba(124,58,237,0.3)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.7)", letterSpacing: 1.2, marginBottom: 10 }}>VERSO</p>
          <p style={{ fontSize: 15, color: "white", margin: 0, lineHeight: 1.55 }}>{card.back}</p>
        </div>
      </motion.div>
    </motion.div>
  );
}
