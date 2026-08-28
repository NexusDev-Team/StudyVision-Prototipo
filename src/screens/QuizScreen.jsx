import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ListChecks, Sparkles } from "lucide-react";
import QuizQuestion from "../components/study/QuizQuestion";
import { SAMPLE_ITEMS } from "../data/sampleContent";

// Randomly generated V/F question — the affirmation is sometimes true (a real
// concept from this item) and sometimes false (a concept borrowed from another
// subject), so "gerar mais" doesn't always answer to the same pattern.
function generateQuizQuestion(item) {
  const concepts = item?.concepts?.length ? item.concepts : [item?.concept || "este conteúdo"];
  const isTrue = Math.random() < 0.5;
  let concept = concepts[Math.floor(Math.random() * concepts.length)];

  if (!isTrue) {
    const others = SAMPLE_ITEMS.filter(s => s.id !== item?.id && s.concepts?.length);
    if (others.length) {
      const other = others[Math.floor(Math.random() * others.length)];
      concept = other.concepts[Math.floor(Math.random() * other.concepts.length)];
    }
  }

  return { type: "vf", question: `${concept} é um dos pontos centrais de "${item?.concept}".`, answer: isTrue };
}

export default function QuizScreen({ item, onBack, isPlus = false, onVisionPlus }) {
  const baseQuestions = item?.quiz || [];
  const [extraQuestions, setExtraQuestions] = useState([]);
  const questions = [...baseQuestions, ...extraQuestions];
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

  const generateMore = () => {
    setExtraQuestions(prev => [...prev, generateQuizQuestion(item)]);
  };

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

        {done && (isPlus ? (
          <motion.button whileTap={{ scale: 0.96 }} onClick={generateMore}
            style={{ width: "100%", padding: "13px 20px", borderRadius: 14, background: "#FFF7ED", border: "1.5px solid #FED7AA", color: "#EA580C", fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14 }}>
            <Sparkles size={16} />
            Gerar mais perguntas
          </motion.button>
        ) : (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: "linear-gradient(135deg,#FFF7ED,#FFEDD5)", borderRadius: 20, padding: "18px 20px", textAlign: "center", border: "1px solid #FED7AA", marginTop: 14 }}>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#C2410C", margin: "0 0 4px" }}>Quer mais perguntas sobre este conteúdo?</p>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#EA580C", margin: "0 0 12px" }}>Gere quizzes ilimitados com o Vision+</p>
            <motion.button whileTap={{ scale: 0.96 }} onClick={onVisionPlus}
              style={{ padding: "10px 24px", borderRadius: 12, background: "linear-gradient(135deg,#EA580C,#F59E0B)", color: "white", fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, border: "none", cursor: "pointer" }}>
              Ver Vision+
            </motion.button>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
