import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ListChecks, Sparkles } from "lucide-react";
import QuizQuestion from "../components/study/QuizQuestion";

export default function QuizScreen({ item, onBack }) {
  const questions = item?.quiz || [];
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const done = index >= questions.length;
  const q = questions[index];
  const isCorrect = (opt) => opt === q?.answer;

  const choose = (opt) => {
    if (selected !== null) return;
    setSelected(opt);
    if (isCorrect(opt)) setScore(s => s + 1);
  };

  const next = () => { setSelected(null); setIndex(i => i + 1); };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F8FAFC", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      <div style={{ background: "white", padding: "52px 20px 14px", borderBottom: "1px solid #F1F5F9", flexShrink: 0 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12 }}>
          <ChevronLeft size={20} color="#EA580C" />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#EA580C" }}>Voltar</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ListChecks size={22} color="#EA580C" />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>Mini Quiz</h1>
        </div>
        <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>Baseado em: {item?.concept}</p>
        {!done && questions.length > 0 && (
          <p style={{ fontSize: 12, color: "#94A3B8", margin: "6px 0 0" }}>Pergunta {index + 1} de {questions.length}</p>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px 24px" }}>
        {!done && q && (
          <QuizQuestion q={q} index={index} selected={selected} onChoose={choose} onNext={next} isLast={index + 1 === questions.length} />
        )}

        {done && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: "white", borderRadius: 20, padding: "24px 20px", textAlign: "center", border: "1px solid #E2E8F0", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
            <Sparkles size={30} color="#EA580C" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 17, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>Você acertou {score} de {questions.length}</p>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#64748B", margin: "0 0 18px" }}>Continue revisando para fixar o conteúdo</p>
            <motion.button whileTap={{ scale: 0.96 }} onClick={onBack}
              style={{ width: "100%", height: 50, borderRadius: 14, background: "linear-gradient(135deg,#EA580C,#F59E0B)", color: "white", fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer" }}>
              Voltar
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
