import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ListChecks, Sparkles } from "lucide-react";
import QuizQuestion, { isCorrectOption } from "../components/study/QuizQuestion";
import { recordQuizAttempt, registerActivity } from "../services/studyService";
import { getQuizPerformance } from "../services/performanceService";
import { useContentStore } from "../context/ContentStoreContext.jsx";
import { newId } from "../utils/id";

// Questão V/F gerada aleatoriamente para o "gerar mais" do Vision+: metade das
// vezes a afirmação é verdadeira (um conceito real do conteúdo), metade falsa
// (o conceito trocado por um genérico), para não cair sempre no mesmo padrão.
//
// ephemeral: true — existe só nesta sessão (placeholder de UI até a geração
// real por IA), nunca persistida em quiz.questions. Respostas a ela contam
// no placar exibido na tela, mas não entram na tentativa gravada: gravar
// apontaria para um questionId inexistente.
function generateQuizQuestion(content) {
  const concepts = content?.keyConcepts?.length ? content.keyConcepts : [content?.title || "este conteúdo"];
  const isTrue = Math.random() < 0.5;
  const concept = concepts[Math.floor(Math.random() * concepts.length)];
  const affirmation = isTrue
    ? `${concept} é um dos pontos centrais de "${content?.title}".`
    : `${concept} não tem nenhuma relação com "${content?.title}".`;
  return { id: newId("qs"), type: "vf", question: affirmation, correctAnswer: isTrue, ephemeral: true };
}

export default function QuizScreen({ content, onBack, isPremium = false, onVisionPlus }) {
  const { mutate } = useContentStore();
  const quiz = content?.quizzes?.[0] || null;
  const baseQuestions = quiz?.questions || [];
  const [extraQuestions, setExtraQuestions] = useState([]);
  const questions = [...baseQuestions, ...extraQuestions];
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [attemptResult, setAttemptResult] = useState(null);
  const done = index >= questions.length;
  const q = questions[index];
  const options = q?.type === "vf" ? [true, false] : q?.options || [];

  // Respostas acumuladas com valor semântico (índice em mc, booleano em vf) —
  // nunca o índice visual da opção. Persistidas em UMA tentativa ao terminar.
  const answersRef = useRef([]);
  const recordedRef = useRef(false);

  const choose = (optionIndex) => {
    if (selected !== null) return;
    setSelected(optionIndex);
    const correct = isCorrectOption(q, optionIndex, options);
    if (correct) setScore((s) => s + 1);
    if (!q.ephemeral) {
      const selectedAnswer = q.type === "vf" ? options[optionIndex] : optionIndex;
      answersRef.current.push({ questionId: q.id, selectedAnswer, correctAnswer: q.correctAnswer, correct });
    }
  };

  const next = () => { setSelected(null); setIndex((i) => i + 1); };

  useEffect(() => {
    if (!done || recordedRef.current) return;
    if (!quiz?.id || !content?.id || answersRef.current.length === 0) return;
    recordedRef.current = true;
    const result = mutate(() => {
      const before = getQuizPerformance(content.id);
      const attempt = recordQuizAttempt({ quizId: quiz.id, contentId: content.id, answers: answersRef.current });
      registerActivity(content.id);
      const previousScore = before.history.length > 0 ? before.history[before.history.length - 1].score : null;
      return { attempt, previousScore };
    });
    setAttemptResult(result);
  }, [done, quiz?.id, content?.id, mutate]);

  const generateMore = () => {
    setExtraQuestions((prev) => [...prev, generateQuizQuestion(content)]);
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
        <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>Baseado em: {content?.title}</p>
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
            {attemptResult ? (
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 24, fontWeight: 800, color: "#111827", margin: "0 0 2px" }}>{attemptResult.attempt.score}%</p>
            ) : null}
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 15, fontWeight: 700, color: "#374151", margin: "0 0 4px" }}>Você acertou {score} de {questions.length}</p>
            {attemptResult?.previousScore != null && (
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 700, color: attemptResult.attempt.score >= attemptResult.previousScore ? "#16A34A" : "#DC2626", margin: "0 0 4px" }}>
                {attemptResult.attempt.score >= attemptResult.previousScore ? "↑" : "↓"} {Math.abs(attemptResult.attempt.score - attemptResult.previousScore)} pts em relação à última tentativa
              </p>
            )}
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#64748B", margin: "0 0 18px" }}>Continue revisando para fixar o conteúdo</p>
            <motion.button whileTap={{ scale: 0.96 }} onClick={onBack}
              style={{ width: "100%", height: 50, borderRadius: 14, background: "linear-gradient(135deg,#EA580C,#F59E0B)", color: "white", fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer" }}>
              Voltar
            </motion.button>
          </motion.div>
        )}

        {done && (isPremium ? (
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
