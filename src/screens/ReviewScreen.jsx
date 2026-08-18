import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CheckCircle } from "lucide-react";
import LogoSVG from "../components/brand/LogoSVG";
import ReviewCard from "../components/study/ReviewCard";
import UpcomingReviewRow from "../components/study/UpcomingReviewRow";
import CalendarMonth from "../components/study/CalendarMonth";
import DayEventsModal from "../components/study/DayEventsModal";
import { useStudyItems } from "../hooks/useStudyItems";
import { nextPendingReview, isDueForReview, endOfToday, DAY_MS } from "../services/reviewEngine";

export default function ReviewScreen({ onReview }) {
  const { items } = useStudyItems();
  const [selectedDate, setSelectedDate] = useState(null);

  const due = items.filter(isDueForReview);
  const next3DaysEnd = endOfToday() + 3 * DAY_MS;
  const upcoming = items
    .filter(it => !isDueForReview(it) && nextPendingReview(it))
    .filter(it => nextPendingReview(it).dueAt <= next3DaysEnd)
    .sort((a, b) => nextPendingReview(a).dueAt - nextPendingReview(b).dueAt);

  const commitmentsByDate = {};
  const addEntry = (date, entry) => (commitmentsByDate[date] ||= []).push(entry);
  for (const item of items) {
    // manually saved commitment (prova, trabalho, apresentação ou revisão agendada)
    if (item.calendarEvent?.date) {
      addEntry(item.calendarEvent.date, {
        id: `${item.id}_event`,
        item,
        type: item.calendarEvent.type,
        time: item.calendarEvent.time,
      });
    }
    // revisões pendentes da repetição espaçada aparecem sozinhas, sem precisar agendar
    for (const stage of item.reviewSchedule || []) {
      if (stage.done) continue;
      const date = new Date(stage.dueAt).toISOString().slice(0, 10);
      if (item.calendarEvent?.date === date) continue; // já representada acima
      addEntry(date, { id: `${item.id}_review_${stage.stage}`, item, type: "Revisão", stageLabel: stage.label });
    }
  }
  const selectedEntries = selectedDate ? (commitmentsByDate[selectedDate] || []) : [];

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F8FAFC", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      <div style={{ background: "white", padding: "52px 20px 16px", borderBottom: "1px solid #F1F5F9", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <LogoSVG size={24} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", letterSpacing: 1 }}>STUDY VISION</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 }}>Revisão Inteligente</h1>
        <p style={{ fontSize: 13, color: "#64748B", margin: "2px 0 0" }}>Repetição espaçada para combater o esquecimento</p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 24px" }}>
        <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1.2, marginBottom: 10 }}>PARA HOJE · {due.length}</p>
        {due.length === 0 ? (
          <div style={{ background: "white", borderRadius: 20, padding: "24px 18px", textAlign: "center", border: "1px solid #E2E8F0", marginBottom: 20 }}>
            <CheckCircle size={26} color="#14B8A6" style={{ margin: "0 auto 8px" }} />
            <p style={{ fontSize: 13, color: "#64748B", margin: 0, fontFamily: "Inter,sans-serif" }}>Nenhuma revisão pendente hoje. Continue assim!</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {due.map((item, i) => (
              <ReviewCard key={item.id} item={item} index={i} onReview={onReview} />
            ))}
          </div>
        )}

        <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1.2, marginBottom: 10 }}>PRÓXIMAS REVISÕES</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {upcoming.map(item => (
            <UpcomingReviewRow key={item.id} item={item} />
          ))}
        </div>

        <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1.2, marginBottom: 10 }}>CALENDÁRIO</p>
        <CalendarMonth commitmentsByDate={commitmentsByDate} onSelectDate={setSelectedDate} />
      </div>

      <AnimatePresence>
        {selectedDate && (
          <DayEventsModal date={selectedDate} entries={selectedEntries} onClose={() => setSelectedDate(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
