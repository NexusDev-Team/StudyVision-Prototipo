import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, CreditCard, ThumbsUp, ThumbsDown, CheckCircle, Lock } from "lucide-react";
import Flashcard from "../components/study/Flashcard";
import { FREE_FLASHCARD_LIMIT } from "../constants";

export default function FlashcardsScreen({ item, onBack, onVisionPlus, reviewMode = false, onReviewComplete }) {
  const allCards = item?.flashcards || [];
  const cards = allCards.slice(0, FREE_FLASHCARD_LIMIT);
  const lockedCount = Math.max(0, allCards.length - FREE_FLASHCARD_LIMIT);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [grades, setGrades] = useState([]); // true = lembrei, false = não lembrei
  const done = index >= cards.length;

  const grade = (remembered) => {
    setGrades(g => [...g, remembered]);
    setFlipped(false);
    setIndex(i => i + 1);
  };

  const rememberedCount = grades.filter(Boolean).length;

  const handleFinishReview = () => {
    if (reviewMode && onReviewComplete) onReviewComplete();
    else onBack();
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F8FAFC", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      <div style={{ background: "white", padding: "52px 20px 14px", borderBottom: "1px solid #F1F5F9", flexShrink: 0 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12 }}>
          <ChevronLeft size={20} color="#7C3AED" />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#7C3AED" }}>Voltar</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <CreditCard size={22} color="#7C3AED" />
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#111827", margin: 0 }}>{reviewMode ? "Revisão" : "Flashcards"}</h1>
        </div>
        <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>Baseados em: {item?.concept}</p>
        {!done && cards.length > 0 && (
          <p style={{ fontSize: 12, color: "#94A3B8", margin: "6px 0 0", fontFamily: "Inter,sans-serif" }}>Carta {index + 1} de {cards.length}</p>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px 24px", display: "flex", flexDirection: "column" }}>
        {!done && cards.length > 0 && (
          <>
            <Flashcard card={cards[index]} index={index} flipped={flipped} onFlip={() => setFlipped(f => !f)} />

            {flipped ? (
              <div style={{ display: "flex", gap: 10 }}>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => grade(false)}
                  style={{ flex: 1, height: 50, borderRadius: 14, background: "#FEF2F2", border: "1.5px solid #FECACA", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <ThumbsDown size={17} color="#DC2626" />
                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, color: "#DC2626" }}>Não lembrei</span>
                </motion.button>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => grade(true)}
                  style={{ flex: 1, height: 50, borderRadius: 14, background: "#F0FDF4", border: "1.5px solid #BBF7D0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <ThumbsUp size={17} color="#16A34A" />
                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, color: "#16A34A" }}>Lembrei</span>
                </motion.button>
              </div>
            ) : (
              <p style={{ textAlign: "center", fontSize: 12, color: "#94A3B8", fontFamily: "Inter,sans-serif" }}>Toque na carta para ver a resposta</p>
            )}
          </>
        )}

        {done && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: "white", borderRadius: 20, padding: "24px 20px", textAlign: "center", border: "1px solid #E2E8F0", boxShadow: "0 1px 8px rgba(0,0,0,0.05)" }}>
            <CheckCircle size={30} color="#14B8A6" style={{ margin: "0 auto 12px" }} />
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 17, fontWeight: 800, color: "#111827", margin: "0 0 4px" }}>Sessão concluída</p>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#64748B", margin: "0 0 18px" }}>Você lembrou {rememberedCount} de {cards.length} cartas</p>
            <motion.button whileTap={{ scale: 0.96 }} onClick={handleFinishReview}
              style={{ width: "100%", height: 50, borderRadius: 14, background: "linear-gradient(135deg,#2563EB,#7C3AED)", color: "white", fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer" }}>
              {reviewMode ? "Concluir revisão" : "Voltar"}
            </motion.button>
          </motion.div>
        )}

        {/* Unlock CTA for cards beyond the free limit */}
        {done && lockedCount > 0 && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            style={{ background: "linear-gradient(135deg,#EDE9FE,#DDD6FE)", borderRadius: 20, padding: "22px 20px", textAlign: "center", border: "1px solid #C4B5FD", marginTop: 14 }}>
            <Lock size={24} color="#7C3AED" style={{ margin: "0 auto 10px" }} />
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 15, fontWeight: 700, color: "#7C3AED", margin: "0 0 6px" }}>+{lockedCount} flashcards no Vision+</p>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#6D28D9", margin: "0 0 16px" }}>No plano gratuito você tem até {FREE_FLASHCARD_LIMIT} flashcards por conteúdo</p>
            <motion.button whileTap={{ scale: 0.96 }} onClick={onVisionPlus}
              style={{ padding: "11px 28px", borderRadius: 14, background: "linear-gradient(135deg,#7C3AED,#2563EB)", color: "white", fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer", boxShadow: "0 4px 14px rgba(124,58,237,0.35)" }}>
              Ver Vision+
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
