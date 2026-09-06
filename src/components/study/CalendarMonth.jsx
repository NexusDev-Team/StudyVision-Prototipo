import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { EVENT_TYPE_META, EVENT_TYPES } from "../../data/models/event.js";
import CommitmentShape from "./CommitmentShape.jsx";

// Preenchimento do dia: cor sólida da matéria, ou uma "pizza" de fatias
// iguais quando há mais de uma matéria no mesmo dia.
function dayFill(subjectColors) {
  if (subjectColors.length <= 1) return subjectColors[0] || "#64748B";
  const step = 360 / subjectColors.length;
  const stops = subjectColors
    .map((c, i) => `${c} ${(i * step).toFixed(2)}deg ${((i + 1) * step).toFixed(2)}deg`)
    .join(", ");
  return `conic-gradient(from -90deg, ${stops})`;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function CalendarMonth({ eventsByDate, onSelectDate }) {
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
        <button onClick={() => goMonth(-1)} aria-label="Mês anterior" style={{ background: "#F1F5F9", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <ChevronLeft size={16} color="#475569" />
        </button>
        <span style={{ fontSize: 14, fontWeight: 800, color: "#111827" }}>{MONTHS[cursor.month]} {cursor.year}</span>
        <button onClick={() => goMonth(1)} aria-label="Próximo mês" style={{ background: "#F1F5F9", border: "none", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
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
          const dayEvents = eventsByDate[dateStr] || [];
          const hasAny = dayEvents.length > 0;
          const isToday = dateStr === todayStr;
          const isPast = dateStr < todayStr;
          const types = [...new Set(dayEvents.map((e) => e.type))];
          // Fatias iguais por matéria; sólido quando só há uma.
          const subjectColors = [...new Set(dayEvents.map((e) => e.subjectColor))];
          const fill = dayFill(subjectColors);
          const multiType = types.length > 1;

          let border = "1.5px solid transparent";
          if (isToday) border = "1.5px solid #2563EB";

          const label = hasAny
            ? `${day} de ${MONTHS[cursor.month]} — ${dayEvents.length} ${dayEvents.length === 1 ? "compromisso" : "compromissos"}: ${types.map((t) => EVENT_TYPE_META[t]?.label || t).join(", ")}`
            : `${day} de ${MONTHS[cursor.month]}`;

          return (
            <button
              key={i}
              onClick={hasAny ? () => onSelectDate(dateStr) : undefined}
              disabled={!hasAny}
              aria-label={label}
              title={label}
              style={{
                position: "relative",
                aspectRatio: "1",
                borderRadius: "50%",
                cursor: hasAny ? "pointer" : "default",
                border,
                background: hasAny ? fill : "white",
                fontFamily: "Inter,sans-serif",
                fontSize: 12,
                fontWeight: isToday || hasAny ? 800 : 600,
                color: hasAny ? "white" : isToday ? "#2563EB" : "#111827",
                textShadow: hasAny ? "0 1px 2px rgba(0,0,0,0.28)" : "none",
                boxSizing: "border-box",
                opacity: isPast ? 0.45 : 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}>
              {day}
              {hasAny && (
                <span style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1, lineHeight: 1, height: 10, filter: "drop-shadow(0 1px 1px rgba(0,0,0,0.35))" }}>
                  {multiType ? (
                    <span aria-hidden="true" style={{ fontSize: 9.5, fontWeight: 800, color: "white", letterSpacing: -0.5 }}>1+</span>
                  ) : (
                    <CommitmentShape type={types[0]} size={10} color="#fff" />
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legenda — a cor do dia é da matéria; o tipo é distinguido pela forma. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 14, paddingTop: 12, borderTop: "1px solid #F1F5F9" }}>
        {EVENT_TYPES.map((t) => {
          const meta = EVENT_TYPE_META[t];
          return (
            <span key={t} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#111827", fontFamily: "Inter,sans-serif" }}>
              <CommitmentShape type={t} size={10} color="#111827" />
              {meta.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
