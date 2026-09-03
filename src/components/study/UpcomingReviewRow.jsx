import { Calendar } from "lucide-react";
import { REVIEW_OFFSETS, formatDue } from "../../services/reviewService";
import { getSubjectVisual } from "../../constants";

const STAGE_LABEL = Object.fromEntries(REVIEW_OFFSETS.map((o) => [o.stage, o.label]));

export default function UpcomingReviewRow({ content, nextReview }) {
  const visual = getSubjectVisual(content.subjectName);
  return (
    <div style={{ background: "white", borderRadius: 16, padding: "12px 14px", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{visual.emoji}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{content.title}</p>
        <p style={{ fontSize: 11, color: "#94A3B8", margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{STAGE_LABEL[nextReview?.stage]}</p>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B", flexShrink: 0 }}>{formatDue(nextReview.scheduledFor)}</span>
      <Calendar size={15} color="#0F766E" style={{ flexShrink: 0 }} />
    </div>
  );
}
