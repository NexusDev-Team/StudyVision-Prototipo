import { X, Calendar } from "lucide-react";
import Modal from "../ui/Modal";

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function formatDate(dateStr) {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${d} de ${MONTHS[m - 1]}`;
}

export default function DayEventsModal({ date, items, onClose }) {
  return (
    <Modal center>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={18} color="#2563EB" />
          <span style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>{formatDate(date)}</span>
        </div>
        <button onClick={onClose} style={{ background: "#F1F5F9", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <X size={16} color="#64748B" />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map(item => (
          <div key={`${item.id}_day`} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14, background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.subjectColor, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.concept}</p>
              <p style={{ fontSize: 11, color: "#94A3B8", margin: "1px 0 0" }}>{item.subject}</p>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <span style={{ display: "block", fontSize: 10, fontWeight: 700, color: item.subjectColor, background: item.subjectBg, borderRadius: 8, padding: "2px 7px", marginBottom: 3 }}>{item.calendarEvent.type}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#64748B" }}>{item.calendarEvent.time}</span>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}
