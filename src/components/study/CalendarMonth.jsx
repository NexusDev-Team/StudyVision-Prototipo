import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function subjectColorsForDay(entries) {
  const seen = [];
  for (const entry of entries) {
    if (!seen.includes(entry.item.subjectColor)) seen.push(entry.item.subjectColor);
  }
  return seen;
}

function fillStyle(colors) {
  if (colors.length <= 1) {
    return { background: colors[0] || "transparent" };
  }
  const slice = 360 / colors.length;
  const stops = colors.map((c, i) => `${c} ${i * slice}deg ${(i + 1) * slice}deg`).join(", ");
  return { background: `conic-gradient(${stops})` };
}

export default function CalendarMonth({ commitmentsByDate, onSelectDate }) {
  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });

  const firstWeekday = new Date(cursor.year, cursor.month, 1).getDay();
  const daysInMonth = new Date(cursor.year, cursor.month + 1, 0).getDate();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const goMonth = (delta) => {
    setCursor(({ year, month }) => {
      const next = month + delta;
      if (next < 0) return { year: year - 1, month: 11 };
      if (next > 11) return { year: year + 1, month: 0 };
      return { year, month: next };
    });
  };

  return (
    <div style={{ background: "white", borderRadius: 20, border: "1px solid #E2E8F0", padding: "14px 12px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, padding: "0 4px" }}>
        <button onClick={() => goMonth(-1)} style={{ background: "#F1F5F9", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ChevronLeft size={16} color="#475569" />
        </button>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{MONTHS[cursor.month]} {cursor.year}</span>
        <button onClick={() => goMonth(1)} style={{ background: "#F1F5F9", border: "none", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ChevronRight size={16} color="#475569" />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 4 }}>
        {WEEKDAYS.map((w, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "#94A3B8" }}>{w}</div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const dateStr = toDateStr(cursor.year, cursor.month, day);
          const dayEntries = commitmentsByDate[dateStr] || [];
          const hasEvents = dayEntries.length > 0;
          const isToday = dateStr === todayStr;
          const colors = subjectColorsForDay(dayEntries);

          return (
            <button
              key={i}
              onClick={hasEvents ? () => onSelectDate(dateStr) : undefined}
              disabled={!hasEvents}
              style={{
                aspectRatio: "1",
                borderRadius: "50%",
                cursor: hasEvents ? "pointer" : "default",
                border: isToday ? "1.5px solid #2563EB" : "1.5px solid transparent",
                fontFamily: "Inter,sans-serif",
                fontSize: 12,
                fontWeight: isToday || hasEvents ? 800 : 600,
                color: hasEvents ? "white" : isToday ? "#2563EB" : "#111827",
                boxSizing: "border-box",
                ...(hasEvents ? fillStyle(colors) : { background: "white" }),
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
