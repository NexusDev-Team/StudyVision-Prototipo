import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, CreditCard, ThumbsUp, ThumbsDown, CheckCircle, Lock, Sparkles } from "lucide-react";
import Flashcard from "../components/study/Flashcard";
import { FREE_FLASHCARD_LIMIT } from "../constants";
import { shuffle } from "../services/reviewService";
import { recordFlashcardAttempt, registerActivity } from "../services/studyService";
import { useContentStore } from "../context/ContentStoreContext.jsx";
import { newId } from "../utils/id";

// ephemeral: true — carta existe só nesta sessão (placeholder de UI até a
// geração real por IA), nunca persistida em content.flashcards. Respostas a
// ela não viram tentativa: gravar apontaria para um flashcardId inexistente.
function generateFlashcard(content, n) {
  const concepts = content?.keyConcepts?.length ? content.keyConcepts : [content?.title || "este conteúdo"];
  const concept = concepts[n % concepts.length];
  return {
    id: newId("fc"),
    front: `O que você lembra sobre ${concept}?`,
    back: `Revise o material de "${content?.title}" para aprofundar em ${concept}.`,
    ephemeral: true,
  };
}

export default function FlashcardsScreen({ content, onBack, onVisionPlus, isPremium = false, reviewMode = false, onReviewComplete }) {
  const { mutate } = useContentStore();
  const contentId = content?.id;
  const allCards = content?.flashcards || [];
  const [extraCards, setExtraCards] = useState([]);
  // Order shuffled once per screen entry — repeated review sessions don't always start with the same card.
  const [shuffledCards] = useState(() => shuffle(allCards));
  const cards = isPremium ? [...shuffledCards, ...extraCards] : shuffledCards.slice(0, FREE_FLASHCARD_LIMIT);
  const lockedCount = isPremium ? 0 : Math.max(0, allCards.length - FREE_FLASHCARD_LIMIT);

  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [grades, setGrades] = useState([]); // true = lembrei, false = não lembrei
  const [contentPerformance, setContentPerformance] = useState(null);
  const done = index >= cards.length;

  // Cronômetro do card atual: começa quando a carta é virada para ver a resposta.
  const shownAtRef = useRef(null);
  const recordedRef = useRef(false);

  const flip = () => {
    setFlipped((f) => {
      const nextFlipped = !f;
      if (nextFlipped && shownAtRef.current === null) shownAtRef.current = Date.now();
      return nextFlipped;
    });
  };

  const generateMore = () => {
    setExtraCards(prev => [...prev, generateFlashcard(content, allCards.length + prev.length)]);
  };

  const grade = (remembered) => {
    const card = cards[index];
    const responseTimeMs = shownAtRef.current ? Date.now() - shownAtRef.current : null;
    if (card?.id && contentId && !card.ephemeral) {
      const result = mutate(() => {
        recordFlashcardAttempt({ flashcardId: card.id, contentId, correct: remembered, responseTimeMs });
        // Ao terminar o deck, recalcula domínio/dificuldade/revisão uma única vez.
        if (index + 1 >= cards.length && !recordedRef.current) {
          recordedRef.current = true;
          return registerActivity(contentId);
        }
        return null;
      });
      if (result) setContentPerformance(result.performance);
    } else if (index + 1 >= cards.length && !recordedRef.current && contentId) {
      // Deck terminou só com cartas efêmeras respondidas — ainda assim garante
      // que domínio/dificuldade/revisão reflitam qualquer tentativa real já feita.
      recordedRef.current = true;
      const result = mutate(() => registerActivity(contentId));
      setContentPerformance(result.performance);
    }
    setGrades(g => [...g, remembered]);
    setFlipped(false);
    shownAtRef.current = null;
    setIndex(i => i + 1);
  };

  const rememberedCount = grades.filter(Boolean).length;
  const wrongCount = grades.length - rememberedCount;
  const sessionRate = grades.length > 0 ? Math.round((rememberedCount / grades.length) * 100) : null;

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
        <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>Baseados em: {content?.title}</p>
        {!done && cards.length > 0 && (
          <p style={{ fontSize: 12, color: "#94A3B8", margin: "6px 0 0", fontFamily: "Inter,sans-serif" }}>Carta {index + 1} de {cards.length}</p>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px 24px", display: "flex", flexDirection: "column" }}>
        {!done && cards.length > 0 && (
          <>
            <Flashcard card={cards[index]} index={index} flipped={flipped} onFlip={flip} />

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
            {sessionRate != null && (
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 24, fontWeight: 800, color: "#111827", margin: "0 0 2px" }}>{sessionRate}%</p>
            )}
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#374151", margin: "0 0 2px" }}>
              {cards.length} revisados · <span style={{ color: "#16A34A", fontWeight: 700 }}>✓ {rememberedCount}</span> · <span style={{ color: "#DC2626", fontWeight: 700 }}>✕ {wrongCount}</span>
            </p>
            {contentPerformance?.flashcards?.accuracyRate != null && (
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#94A3B8", margin: "0 0 18px" }}>
                {contentPerformance.flashcards.accuracyRate}% de aproveitamento acumulado neste conteúdo
              </p>
            )}
            <motion.button whileTap={{ scale: 0.96 }} onClick={handleFinishReview}
              style={{ width: "100%", height: 50, borderRadius: 14, background: "linear-gradient(135deg,#2563EB,#7C3AED)", color: "white", fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, border: "none", cursor: "pointer" }}>
              {reviewMode ? "Concluir revisão" : "Voltar"}
            </motion.button>
          </motion.div>
        )}

        {/* Unlock CTA for cards beyond the free limit — appears after the value already delivered */}
        {done && !isPremium && lockedCount > 0 && (
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

        {/* Plus: generate more cards instead of hitting a limit */}
        {done && isPremium && (
          <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} style={{ marginTop: 14 }}>
            <motion.button whileTap={{ scale: 0.96 }} onClick={generateMore}
              style={{ width: "100%", padding: "13px 20px", borderRadius: 14, background: "#EDE9FE", border: "1.5px solid #C4B5FD", color: "#7C3AED", fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Sparkles size={16} />
              Gerar mais flashcards
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
