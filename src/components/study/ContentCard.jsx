import { motion } from "framer-motion";
import { ChevronRight, CalendarClock, Clock, Calendar } from "lucide-react";
import Badge from "../ui/Badge";
import { getSubjectVisual, REVIEW_FLAG_META, UNASSIGNED_SUBJECT_LABEL } from "../../constants";
import { relativeLabel } from "../../utils/date";
import { EVENT_TYPE_META } from "../../data/models/event.js";

export default function ContentCard({ content, index, isDue = false, isOverdue = false, nextEvent = null, onClick }) {
  const visual = getSubjectVisual(content.subjectName);
  const needsReview = content.mastery?.level === "needs_review";

  return (
    <motion.button
      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{ background: "white", borderRadius: 20, padding: "16px 16px", boxShadow: "0 1px 8px rgba(0,0,0,0.05)", border: "1px solid #E2E8F0", cursor: "pointer", textAlign: "left", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: visual.bg || "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>
            {visual.emoji}
          </div>
          <div>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 15, fontWeight: 700, color: "#111827", margin: 0 }}>{content.title}</p>
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#64748B", margin: "2px 0 0" }}>{content.subjectName || UNASSIGNED_SUBJECT_LABEL} · {content.topic}</p>
          </div>
        </div>
        <ChevronRight size={18} color="#CBD5E1" />
      </div>
      <div style={{ marginTop: 10, display: "flex", gap: 6, alignItems: "center" }}>
        {/* Uma única tag de reforço, por prioridade: revisar hoje > atrasada > rever. */}
        {isDue ? (
          <Badge color="#DC2626" background="rgba(220,38,38,0.1)" fontSize={11} fontWeight={700} padding="3px 10px" radius={6}>
            <CalendarClock size={11} /> Revisar hoje
          </Badge>
        ) : isOverdue ? (
          <Badge color={REVIEW_FLAG_META.overdue.color} background={REVIEW_FLAG_META.overdue.bg} fontSize={11} fontWeight={700} padding="3px 10px" radius={6}>
            {REVIEW_FLAG_META.overdue.label}
          </Badge>
        ) : needsReview ? (
          <Badge color={REVIEW_FLAG_META.needs_review.color} background={REVIEW_FLAG_META.needs_review.bg} fontSize={11} fontWeight={700} padding="3px 10px" radius={6}>
            {REVIEW_FLAG_META.needs_review.label}
          </Badge>
        ) : null}
        {nextEvent && (
          <span title={`${(EVENT_TYPE_META[nextEvent.type] || EVENT_TYPE_META.other).label} · ${nextEvent.date}`}>
            <Badge color="#0F766E" background="rgba(20,184,166,0.12)" fontSize={11} fontWeight={600} padding="3px 8px" radius={6}>
              <Calendar size={11} />
            </Badge>
          </span>
        )}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 4, color: "#94A3B8" }}>
          <Clock size={11} />
          <span style={{ fontSize: 11, fontFamily: "Inter,sans-serif" }}>{relativeLabel(content.createdAt)}</span>
        </div>
      </div>
    </motion.button>
  );
}
