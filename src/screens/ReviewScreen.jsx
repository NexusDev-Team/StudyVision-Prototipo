import { useState } from "react";
import { CheckCircle } from "lucide-react";
import LogoSVG from "../components/brand/LogoSVG";
import ReviewCard from "../components/study/ReviewCard";
import UpcomingReviewRow from "../components/study/UpcomingReviewRow";
import CommitmentCard from "../components/study/CommitmentCard";
import { useStudyItems } from "../hooks/useStudyItems";
import { nextPendingReview, isDueForReview } from "../services/reviewEngine";
import { createEvent, scheduleReviews } from "../services/calendarService";

export default function ReviewScreen({ onReview, onToast }) {
  const { items, save } = useStudyItems();
  const [scheduling, setScheduling] = useState(null);

  const handleScheduleReview = async (item, e) => {
    e.stopPropagation();
    if (scheduling) return;
    setScheduling(item.id);
    const next = nextPendingReview(item);
    const event = await createEvent({ type: "Revisão", date: next ? new Date(next.dueAt).toISOString().slice(0, 10) : "", time: "09:00" });
    await scheduleReviews({ event, reminders: [0] });
    const updated = { ...item, calendarEvent: event };
    save(updated);
    setScheduling(null);
    onToast("✓ Evento criado com sucesso");
    setTimeout(() => onToast("✓ Revisões adicionadas automaticamente"), 1200);
  };

  const due = items.filter(isDueForReview);
  const upcoming = items
    .filter(it => !isDueForReview(it) && nextPendingReview(it))
    .sort((a, b) => nextPendingReview(a).dueAt - nextPendingReview(b).dueAt)
    .slice(0, 5);
  const commitments = items
    .filter(it => it.calendarEvent)
    .sort((a, b) => new Date(`${a.calendarEvent.date}T${a.calendarEvent.time || "00:00"}`) - new Date(`${b.calendarEvent.date}T${b.calendarEvent.time || "00:00"}`));

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
              <ReviewCard key={item.id} item={item} index={i} onReview={onReview} onSchedule={handleScheduleReview} scheduling={scheduling} />
            ))}
          </div>
        )}

        <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1.2, marginBottom: 10 }}>PRÓXIMAS REVISÕES</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {upcoming.map(item => (
            <UpcomingReviewRow key={item.id} item={item} onSchedule={handleScheduleReview} scheduling={scheduling} />
          ))}
        </div>

        <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1.2, marginTop: 24, marginBottom: 2 }}>COMPROMISSOS · CALENDÁRIO</p>
        <p style={{ fontSize: 11, color: "#94A3B8", margin: "0 0 10px" }}>Data de provas, listas...</p>
        {commitments.length === 0 ? (
          <div style={{ background: "white", borderRadius: 20, padding: "20px 18px", textAlign: "center", border: "1px solid #E2E8F0" }}>
            <p style={{ fontSize: 13, color: "#64748B", margin: 0, fontFamily: "Inter,sans-serif" }}>Nenhum compromisso salvo ainda.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {commitments.map(item => (
              <CommitmentCard key={`${item.id}_cal`} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
