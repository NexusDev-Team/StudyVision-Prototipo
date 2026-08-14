import { useState } from "react";
import { motion } from "framer-motion";
import { X, Calendar } from "lucide-react";
import Modal from "../ui/Modal";
import { PLANNING_TYPES, REMINDER_OPTIONS } from "../../constants";

export default function PlanningModal({ onClose, onConfirm }) {
  const [type, setType] = useState(PLANNING_TYPES[0]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reminders, setReminders] = useState([7, 3, 1, 0]);
  const [saving, setSaving] = useState(false);

  const toggleReminder = (days) => {
    setReminders(r => r.includes(days) ? r.filter(d => d !== days) : [...r, days]);
  };

  const handleConfirm = async () => {
    if (saving || !date || !time) return;
    setSaving(true);
    try {
      await onConfirm({ type, date, time, reminders });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{ fontSize: 17, fontWeight: 800, color: "#111827", margin: 0 }}>Novo Compromisso</p>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
          <X size={20} color="#94A3B8" />
        </button>
      </div>

      <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1, marginBottom: 8 }}>TIPO</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
        {PLANNING_TYPES.map(t => (
          <button key={t} onClick={() => setType(t)}
            style={{ padding: "7px 14px", borderRadius: 20, background: type === t ? "#2563EB" : "#F1F5F9", color: type === t ? "white" : "#64748B", fontSize: 12, fontWeight: 600, border: "none", cursor: "pointer" }}>
            {t}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1, marginBottom: 6 }}>DATA</p>
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            style={{ width: "100%", minWidth: 0, height: 42, borderRadius: 12, border: "1.5px solid #E2E8F0", padding: "0 8px", fontFamily: "Inter,sans-serif", fontSize: 12.5, boxSizing: "border-box", colorScheme: "light" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1, marginBottom: 6 }}>HORÁRIO</p>
          <input type="time" value={time} onChange={e => setTime(e.target.value)}
            style={{ width: "100%", minWidth: 0, height: 42, borderRadius: 12, border: "1.5px solid #E2E8F0", padding: "0 8px", fontFamily: "Inter,sans-serif", fontSize: 12.5, boxSizing: "border-box", colorScheme: "light" }} />
        </div>
      </div>

      <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1, marginBottom: 8 }}>REVISÕES AUTOMÁTICAS</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
        {REMINDER_OPTIONS.map(o => (
          <label key={o.days} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={reminders.includes(o.days)} onChange={() => toggleReminder(o.days)} />
            <span style={{ fontSize: 13, color: "#374151" }}>{o.label}</span>
          </label>
        ))}
      </div>

      <motion.button whileTap={{ scale: 0.97 }} onClick={handleConfirm} disabled={saving || !date || !time}
        style={{ width: "100%", height: 52, borderRadius: 16, background: (!date || !time) ? "#CBD5E1" : "linear-gradient(135deg,#2563EB,#7C3AED)", color: "white", fontSize: 14, fontWeight: 700, border: "none", cursor: (!date || !time) ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Calendar size={17} /> {saving ? "Salvando..." : "Salvar no Calendário"}
      </motion.button>
    </Modal>
  );
}
