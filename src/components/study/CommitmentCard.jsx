import { Calendar } from "lucide-react";

export default function CommitmentCard({ item }) {
  return (
    <div style={{ background: "white", borderRadius: 16, padding: "12px 14px", border: "1px solid #E2E8F0", display: "flex", alignItems: "flex-start", gap: 10 }}>
      <div style={{ width: 34, height: 34, borderRadius: 10, background: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Calendar size={16} color="#2563EB" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", background: "#EFF6FF", borderRadius: 8, padding: "2px 8px" }}>{item.calendarEvent.type}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#64748B" }}>{item.calendarEvent.date} · {item.calendarEvent.time}</span>
        </div>
        <p style={{ fontSize: 13, fontWeight: 600, color: "#111827", margin: 0 }}>{item.concept}</p>
        <p style={{ fontSize: 11, color: "#94A3B8", margin: "1px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.subject} · {item.summary}</p>
      </div>
    </div>
  );
}
