import { CalendarPlus } from "lucide-react";

export default function ScheduleReviewButton({ onClick, disabled, size = 30, iconSize = 15 }) {
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: size, height: size, borderRadius: size === 30 ? 10 : 9, background: "#F1F5F9", border: "none", cursor: "pointer", flexShrink: 0 }}>
      <CalendarPlus size={iconSize} color="#2563EB" />
    </button>
  );
}
