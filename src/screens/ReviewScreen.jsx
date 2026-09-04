import { useState, useMemo } from "react";
import { AnimatePresence } from "framer-motion";
import { CheckCircle, Plus } from "lucide-react";
import LogoSVG from "../components/brand/LogoSVG";
import ReviewCard from "../components/study/ReviewCard";
import UpcomingReviewRow from "../components/study/UpcomingReviewRow";
import CalendarMonth from "../components/study/CalendarMonth";
import DayEventsModal from "../components/study/DayEventsModal";
import EventFormModal from "../components/study/EventFormModal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import EmptyState from "../components/ui/EmptyState";
import { useContentStore } from "../context/ContentStoreContext.jsx";
import { createEventEntry, updateEvent, deleteEvent } from "../services/eventService";
import { endOfTodayIso, DAY_MS } from "../utils/date";

export default function ReviewScreen({ onReview, onOpenContent, onToast }) {
  const { contents, reviews, events, mutate } = useContentStore();
  const [selectedDate, setSelectedDate] = useState(null);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deletingEvent, setDeletingEvent] = useState(null);

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

  const handleCreateEvent = async (payload) => {
    try {
      mutate(() => createEventEntry(payload));
      setCreatingEvent(false);
      onToast?.("✓ Compromisso criado");
    } catch (err) {
      onToast?.(err.message || "Não foi possível criar o compromisso.");
    }
  };

  const handleEditEvent = async (payload) => {
    try {
      mutate(() => updateEvent(editingEvent.id, payload));
      setEditingEvent(null);
      setSelectedDate(null);
      onToast?.("✓ Compromisso atualizado");
    } catch (err) {
      onToast?.(err.message || "Não foi possível salvar as alterações.");
    }
  };

  const handleConfirmDeleteEvent = () => {
    try {
      mutate(() => deleteEvent(deletingEvent.id));
      onToast?.("✓ Compromisso excluído");
    } catch {
      onToast?.("Não foi possível excluir o compromisso.");
    }
    setDeletingEvent(null);
    setSelectedDate(null);
  };

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
        {upcoming.length === 0 ? (
          <p style={{ fontSize: 12.5, color: "#94A3B8", margin: "0 0 24px", fontFamily: "Inter,sans-serif" }}>Nada agendado para os próximos 3 dias.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
            {upcoming.map(({ content, nextReview }) => (
              <UpcomingReviewRow key={content.id} content={content} nextReview={nextReview} />
            ))}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1.2, margin: 0 }}>CALENDÁRIO ACADÊMICO</p>
          <button onClick={() => setCreatingEvent(true)}
            style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", padding: 0, color: "#2563EB", fontSize: 12, fontWeight: 700, fontFamily: "Inter,sans-serif" }}>
            <Plus size={14} /> Novo compromisso
          </button>
        </div>
        <CalendarMonth eventsByDate={eventsByDate} onSelectDate={setSelectedDate} />
        {Object.keys(eventsByDate).length === 0 && (
          <EmptyState message="Nenhum compromisso acadêmico cadastrado ainda." paddingTop={10} />
        )}
      </div>

      <AnimatePresence>
        {selectedDate && (
          <DayEventsModal
            date={selectedDate}
            entries={selectedEntries}
            contentById={contentById}
            onViewContent={onOpenContent}
            onEditEvent={(event) => { setEditingEvent(event); setSelectedDate(null); }}
            onDeleteEvent={(event) => { setDeletingEvent(event); setSelectedDate(null); }}
            onClose={() => setSelectedDate(null)}
          />
        )}
        {creatingEvent && (
          <EventFormModal
            contents={contents}
            onSave={handleCreateEvent}
            onClose={() => setCreatingEvent(false)}
          />
        )}
        {editingEvent && (
          <EventFormModal
            event={editingEvent}
            contents={contents}
            onSave={handleEditEvent}
            onClose={() => setEditingEvent(null)}
          />
        )}
        {deletingEvent && (
          <ConfirmDialog
            title="Excluir este compromisso?"
            description={`"${deletingEvent.title}" será removido do calendário. O conteúdo relacionado, se houver, não é afetado.`}
            confirmLabel="Excluir compromisso"
            onConfirm={handleConfirmDeleteEvent}
            onCancel={() => setDeletingEvent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
