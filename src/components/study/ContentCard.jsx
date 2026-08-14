import { motion } from "framer-motion";
import { ChevronRight, CalendarClock, Clock, Calendar } from "lucide-react";
import Badge from "../ui/Badge";
import { isDueForReview } from "../../services/reviewEngine";

export default function ContentCard({ item, index, onClick }) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{ background: "white", borderRadius: 20, padding: "16px 16px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)", border: "1px solid #E2E8F0", cursor: "pointer", textAlign: "left", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: item.subjectBg || "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
            {item.subjectIcon}
          </div>
          <div>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>{item.concept}</p>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#64748B", margin: "2px 0 0" }}>{item.subject} · {item.topic}</p>
          </div>
        </div>
        <ChevronRight size={18} color="#CBD5E1" />
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center" }}>
        {isDueForReview(item) ? (
          <Badge color="#DC2626" background="rgba(220,38,38,0.1)" fontSize={11} fontWeight={700} padding="3px 10px" radius={6}>
            <CalendarClock size={11} /> Revisar hoje
          </Badge>
        ) : (
          <Badge color="#14B8A6" background="rgba(20,184,166,0.1)" fontSize={11} fontWeight={600} padding="3px 10px" radius={6}>Resumo</Badge>
        )}
        <Badge color="#7C3AED" background="rgba(124,58,237,0.1)" fontSize={11} fontWeight={600} padding="3px 10px" radius={6}>Flashcards</Badge>
        {item.calendarEvent && (
          <span title={`${item.calendarEvent.type} · ${item.calendarEvent.date}`}>
            <Badge color="#0F766E" background="rgba(20,184,166,0.12)" fontSize={11} fontWeight={600} padding="3px 8px" radius={6}>
              <Calendar size={11} />
            </Badge>
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, color: "#94A3B8" }}>
          <Clock size={11} />
          <span style={{ fontSize: 11, fontFamily: "Inter,sans-serif" }}>{item.time}</span>
        </div>
      </div>
    </motion.button>
  );
}
