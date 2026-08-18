import { Calendar } from "lucide-react";
import { nextPendingReview, formatDue } from "../../services/reviewEngine";

export default function UpcomingReviewRow({ item }) {
  const next = nextPendingReview(item);
  return (
    <div style={{ background: "white", borderRadius: 16, padding: "12px 14px", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ fontSize: 18, flexShrink: 0 }}>{item.subjectIcon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.concept}</p>
        <p style={{ fontSize: 11, color: "#94A3B8", margin: "1px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{next.label}</p>
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B", flexShrink: 0 }}>{formatDue(next.dueAt)}</span>
      <Calendar size={15} color="#0F766E" style={{ flexShrink: 0 }} />
    </div>
  );
}
