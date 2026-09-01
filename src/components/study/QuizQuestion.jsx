import { motion } from "framer-motion";
import { CheckCircle, XCircle } from "lucide-react";

// Índice da alternativa correta: em "mc" o índice é comparado diretamente com
// q.answer; em "vf" o valor booleano da opção é comparado com q.answer.
export function isCorrectOption(q, optionIndex, options) {
  return q?.type === "vf" ? options[optionIndex] === q.answer : optionIndex === q?.answer;
}

export default function QuizQuestion({ q, index, selected, onChoose, onNext, isLast }) {
  const options = q?.type === "vf" ? [true, false] : q?.options || [];
  const optionLabel = (opt) => (q.type === "vf" ? (opt ? "Verdadeiro" : "Falso") : opt);

  return (
    <motion.div key={index} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
      style={{ background: "white", borderRadius: 20, padding: "18px", border: "1px solid #E2E8F0", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
      <p style={{ fontSize: 16, fontWeight: 700, color: "#111827", margin: "0 0 16px", lineHeight: 1.4 }}>{q.question}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {options.map((opt, i) => {
          const chosen = selected !== null;
          const isThisCorrect = isCorrectOption(q, i, options);
          const isThisSelected = selected === i;
          let bg = "white", border = "#E2E8F0", color = "#374151";
          if (chosen && isThisCorrect) { bg = "#F0FDF4"; border = "#86EFAC"; color = "#16A34A"; }
          else if (chosen && isThisSelected && !isThisCorrect) { bg = "#FEF2F2"; border = "#FCA5A5"; color = "#DC2626"; }
          return (
            <button key={i} onClick={() => onChoose(i)} disabled={chosen}
              style={{ textAlign: "left", padding: "12px 14px", borderRadius: 12, background: bg, border: `1.5px solid ${border}`, color, fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 600, cursor: chosen ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {optionLabel(opt)}
              {chosen && isThisCorrect && <CheckCircle size={16} color="#16A34A" />}
              {chosen && isThisSelected && !isThisCorrect && <XCircle size={16} color="#DC2626" />}
            </button>
          );
        })}
      </div>
      {selected !== null && q.explanation && (
        <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 12, background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
          <p style={{ fontSize: 12.5, color: "#475569", margin: 0, lineHeight: 1.5 }}>{q.explanation}</p>
        </div>
      )}
      {selected !== null && (
        <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} whileTap={{ scale: 0.96 }} onClick={onNext}
          style={{ marginTop: 16, width: "100%", height: 46, borderRadius: 12, background: "#111827", color: "white", fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer" }}>
          {isLast ? "Ver resultado" : "Próxima"}
        </motion.button>
      )}
    </motion.div>
  );
}
