import { useState, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { CheckCircle, Plus } from "lucide-react";
import LogoSVG from "../components/brand/LogoSVG";
import ReviewCard from "../components/study/ReviewCard";
import UpcomingReviewRow from "../components/study/UpcomingReviewRow";
import CalendarMonth from "../components/study/CalendarMonth";
import DayEventsModal from "../components/study/DayEventsModal";
import { useContentStore } from "../context/ContentStoreContext.jsx";
import { endOfTodayIso, DAY_MS } from "../utils/date";

export default function ReviewScreen({ onReview, onOpenContent }) {
  const { contents, reviews, events } = useContentStore();
  const [selectedDate, setSelectedDate] = useState(null);

  const contentById = useMemo(() => new Map(contents.map((c) => [c.id, c])), [contents]);

  const { due, upcoming } = useMemo(() => {
    const endOfToday = new Date(endOfTodayIso()).getTime();
    const next3DaysEnd = endOfToday + 3 * DAY_MS;

    // Próxima revisão pendente de cada conteúdo.
    const nextByContent = new Map();
    for (const r of reviews) {
      if (r.status !== "pending") continue;
      const current = nextByContent.get(r.contentId);
      if (!current || new Date(r.scheduledFor) < new Date(current.scheduledFor)) {
        nextByContent.set(r.contentId, r);
      }
    }

    const due = [];
    const upcoming = [];
    for (const [contentId, nextReview] of nextByContent) {
      const content = contentById.get(contentId);
      if (!content) continue;
      const when = new Date(nextReview.scheduledFor).getTime();
      if (when <= endOfToday) due.push({ content, nextReview });
      else if (when <= next3DaysEnd) upcoming.push({ content, nextReview });
    }
    upcoming.sort((a, b) => new Date(a.nextReview.scheduledFor) - new Date(b.nextReview.scheduledFor));

    return { due, upcoming };
  }, [contentById, reviews]);

  // Calendário acadêmico: só eventos (Prova/Trabalho/Aula/Entrega/Outro), um
  // por dia — nunca revisões. Um evento sem contentIds ainda aparece: o
  // agrupamento é por event.date, não por conteúdo vinculado.
  const eventsByDate = useMemo(() => {
    const byDate = {};
    for (const event of events) {
      if (!event.date) continue;
      (byDate[event.date] ||= []).push({ id: event.id, type: event.type, event });
    }
    return byDate;
  }, [events]);

  const selectedEntries = selectedDate ? eventsByDate[selectedDate] || [] : [];

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
            {due.map(({ content, nextReview }, i) => (
              <ReviewCard key={content.id} content={content} nextReview={nextReview} index={i} onReview={onReview} />
            ))}
          </div>
        )}

        <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1.2, marginBottom: 10 }}>PRÓXIMAS REVISÕES</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
          {upcoming.map(({ content, nextReview }) => (
            <UpcomingReviewRow key={content.id} content={content} nextReview={nextReview} />
          ))}
        </div>

        <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1.2, marginBottom: 10 }}>CALENDÁRIO ACADÊMICO</p>
        <CalendarMonth eventsByDate={eventsByDate} onSelectDate={setSelectedDate} />
        {Object.keys(eventsByDate).length === 0 && (
          <p style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", margin: "10px 0 0", fontFamily: "Inter,sans-serif" }}>
            Nenhum compromisso acadêmico cadastrado ainda.
          </p>
        )}
      </div>

      <AnimatePresence>
        {selectedDate && (
          <DayEventsModal
            date={selectedDate}
            entries={selectedEntries}
            contentById={contentById}
            onViewContent={onOpenContent}
            onClose={() => setSelectedDate(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
