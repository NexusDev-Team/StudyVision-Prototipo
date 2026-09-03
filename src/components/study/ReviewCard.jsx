import { motion } from "framer-motion";
import { Calendar } from "lucide-react";
import { REVIEW_OFFSETS } from "../../services/reviewService";
import { getSubjectVisual } from "../../constants";

const STAGE_LABEL = Object.fromEntries(REVIEW_OFFSETS.map((o) => [o.stage, o.label]));

export default function ReviewCard({ content, nextReview, index, onReview }) {
  const visual = getSubjectVisual(content.subjectName);
  return (
    <motion.button initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.06 }}
      whileTap={{ scale: 0.98 }} onClick={() => onReview(content)}
      style={{ background: "white", borderRadius: 20, padding: "14px 16px", border: "1px solid #FECACA", boxShadow: "0 1px 8px rgba(0,0,0,0.05)", cursor: "pointer", textAlign: "left", width: "100%", display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: visual.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>
        {visual.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{content.title}</p>
        <p style={{ fontSize: 12, color: "#64748B", margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{content.subjectName} · {STAGE_LABEL[nextReview?.stage]}</p>
      </div>
      <Calendar size={16} color="#0F766E" style={{ flexShrink: 0 }} />
      <span style={{ fontSize: 11, fontWeight: 700, color: "white", background: "#DC2626", borderRadius: 10, padding: "5px 12px", fontFamily: "Inter,sans-serif", flexShrink: 0 }}>Revisar</span>
    </motion.button>
  );
}
