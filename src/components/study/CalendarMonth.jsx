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

// Cores dos eventos que "pintam" o dia (círculo cheio). Trabalho e revisão
// ficam de fora — Trabalho vira contorno tracejado, revisão vira marcador.
function fillColorsForDay(entries) {
  const seen = [];
  for (const entry of entries) {
    if (entry.kind !== "event" || entry.type === "Trabalho") continue;
    if (!seen.includes(entry.item.subjectColor)) seen.push(entry.item.subjectColor);
  }
  return seen;
}

function assignmentColorsForDay(entries) {
  const seen = [];
  for (const entry of entries) {
    if (entry.kind === "event" && entry.type === "Trabalho" && !seen.includes(entry.item.subjectColor)) {
      seen.push(entry.item.subjectColor);
    }
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
          const hasAny = dayEntries.length > 0;
          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;
          const colors = fillColorsForDay(dayEntries);
          const hasEventFill = colors.length > 0;
          const hasReview = dayEntries.some((e) => e.kind === "review");
          // Prova = círculo cheio; Trabalho = só contorno tracejado, sem preenchimento.
          const assignmentColors = assignmentColorsForDay(dayEntries);
          const hasAssignment = assignmentColors.length > 0;
          const assignmentColor = assignmentColors[0] || "#94A3B8";

          // Só o dia atual usa borda azul sólida — a revisão não ganha círculo,
          // para não se confundir com "hoje". Trabalho ganha borda tracejada.
          let border = "1.5px solid transparent";
          if (isToday) border = "1.5px solid #2563EB";
          else if (hasAssignment) border = `1.5px dashed ${hasEventFill ? "#FFFFFF" : assignmentColor}`;

          return (
            <button
              key={i}
              onClick={hasAny ? () => onSelectDate(dateStr) : undefined}
              disabled={!hasAny}
              style={{
                position: "relative",
                aspectRatio: "1",
                borderRadius: "50%",
                cursor: hasAny ? "pointer" : "default",
                border,
                fontFamily: "Inter,sans-serif",
                fontSize: 12,
                fontWeight: isToday || hasAny ? 800 : 600,
                color: hasEventFill ? "white" : isToday ? "#2563EB" : hasAssignment ? assignmentColor : hasReview ? "#0F766E" : "#111827",
                boxSizing: "border-box",
                opacity: isPast ? 0.4 : 1,
                ...(hasEventFill ? fillStyle(colors) : { background: "white" }),
              }}
            >
              {day}
              {hasReview && (
                <span style={{ position: "absolute", bottom: 3, left: "50%", transform: "translateX(-50%)", width: 4, height: 4, borderRadius: 1, background: hasEventFill ? "white" : "#0F766E" }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
