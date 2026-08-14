import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, CalendarClock, CreditCard, ListChecks, HelpCircle } from "lucide-react";
import CapturedPageVisual from "../components/brand/CapturedPageVisual";
import ContentBlocks from "../components/study/ContentBlocks";
import ExportSection from "../components/study/ExportSection";
import PlanningSection from "../components/study/PlanningSection";
import { saveItem } from "../services/storage";
import { nextPendingReview, isDueForReview, formatDue, completedReviews } from "../services/reviewEngine";

export default function ContentDetailScreen({ item, onBack, onFlashcards, onQuestions, onQuiz, onVisionPlus, onToast }) {
  const next = nextPendingReview(item);
  const due = isDueForReview(item);
  const [calendarEvent, setCalendarEvent] = useState(item.calendarEvent || null);
  const handlePlanned = (event) => {
    setCalendarEvent(event);
    saveItem({ ...item, calendarEvent: event });
  };
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F8FAFC", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "white", padding: "52px 20px 14px", borderBottom: "1px solid #F1F5F9", flexShrink: 0 }}>
        <button onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12 }}>
          <ChevronLeft size={20} color="#2563EB" />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#2563EB", fontFamily: "Inter,sans-serif" }}>Biblioteca</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: item.subjectBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>
            {item.subjectIcon}
          </div>
          <div>
            <p style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>{item.concept}</p>
            <p style={{ fontSize: 13, color: "#64748B", margin: "2px 0 0" }}>{item.subject} · {item.topic}</p>
          </div>
        </div>
      </div>

      {/* Scroll */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 20px" }}>
        {/* Captured image */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 12 }}>
          <CapturedPageVisual item={item} height={120} />
        </motion.div>

        {/* Review status */}
        {next && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: due ? "#FEF2F2" : "white", borderRadius: 20, padding: "14px 18px", marginBottom: 12, boxShadow: "0 1px 8px rgba(0,0,0,0.05)", border: `1px solid ${due ? "#FECACA" : "#E2E8F0"}`, display: "flex", alignItems: "center", gap: 10 }}>
            <CalendarClock size={18} color={due ? "#DC2626" : "#64748B"} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: due ? "#DC2626" : "#111827", margin: 0, fontFamily: "Inter,sans-serif" }}>
                {due ? "Revisão pendente hoje" : `Próxima revisão: ${next.label} · ${formatDue(next.dueAt)}`}
              </p>
              <p style={{ fontSize: 11, color: "#94A3B8", margin: "2px 0 0", fontFamily: "Inter,sans-serif" }}>{completedReviews(item)}/5 revisões concluídas</p>
            </div>
          </motion.div>
        )}

        <ContentBlocks item={item} variant="detail" />

        <ExportSection item={item} onToast={onToast} />
        <PlanningSection calendarEvent={calendarEvent} onPlanned={handlePlanned} onToast={onToast} />

        {/* Action buttons */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
          style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4, paddingBottom: 8 }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onFlashcards}
            style={{ flex: "1 1 100px", height: 52, borderRadius: 16, background: "white", border: "1.5px solid #E2E8F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <CreditCard size={17} color="#7C3AED" />
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#7C3AED" }}>Flashcards</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onQuiz}
            style={{ flex: "1 1 100px", height: 52, borderRadius: 16, background: "white", border: "1.5px solid #E2E8F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <ListChecks size={17} color="#EA580C" />
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#EA580C" }}>Quiz</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onQuestions}
            style={{ flex: "1 1 100px", height: 52, borderRadius: 16, background: "white", border: "1.5px solid #E2E8F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <HelpCircle size={17} color="#2563EB" />
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#2563EB" }}>Perguntas</span>
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
