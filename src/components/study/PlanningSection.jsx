import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { CheckCircle, Calendar } from "lucide-react";
import Card from "../ui/Card";
import SectionLabel from "../ui/SectionLabel";
import PlanningModal from "./PlanningModal";

// Coleta o formulário e devolve { type, date, time, reminders } para o pai
// decidir quando persistir (na hora, no detalhe; ao salvar, no resumo).
export default function PlanningSection({ calendarEvent, onPlanned, onToast }) {
  const [open, setOpen] = useState(false);

  const handleConfirm = ({ type, date, time, reminders }) => {
    onPlanned({ type, date, time, reminders });
    setOpen(false);
    onToast(type === "Revisão" ? "✓ Revisão agendada" : "✓ Compromisso agendado");
  };

  return (
    <Card initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58 }}>
      <SectionLabel>PLANEJAMENTO</SectionLabel>
      {calendarEvent && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "#F0FDF4", border: "1px solid #BBF7D0", marginBottom: 8 }}>
          <CheckCircle size={18} color="#16A34A" style={{ flexShrink: 0 }} />
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{calendarEvent.type} agendado</p>
            <p style={{ fontSize: 11, color: "#64748B", margin: "2px 0 0" }}>{calendarEvent.date} · {calendarEvent.time}</p>
          </div>
        </div>
      )}
      <button onClick={() => setOpen(true)}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 12, background: "#F8FAFC", border: "1px solid #E2E8F0", cursor: "pointer", width: "100%", fontFamily: "Inter,sans-serif" }}>
        <Calendar size={18} color="#2563EB" />
        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>{calendarEvent ? "Adicionar outro compromisso" : "Salvar Compromisso"}</span>
      </button>
      <AnimatePresence>
        {open && <PlanningModal onClose={() => setOpen(false)} onConfirm={handleConfirm} />}
      </AnimatePresence>
    </Card>
  );
}
