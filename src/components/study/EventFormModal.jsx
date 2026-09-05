import { useState } from "react";
import { X, Calendar } from "lucide-react";
import Modal from "../ui/Modal";
import { EVENT_TYPES, EVENT_TYPE_META } from "../../data/models/event.js";

// Cria ou edita um AcademicEvent. Passe `event` para editar (preserva
// eventId/createdAt no service); omita para criar. `lockedContentId`, quando
// informado, pré-vincula e trava o conteúdo (fluxo "Adicionar compromisso" a
// partir do próprio Content).
export default function EventFormModal({ event, contents, lockedContentId, onSave, onClose }) {
  const isEditing = !!event;
  const [title, setTitle] = useState(event?.title || "");
  const [type, setType] = useState(event?.type || "exam");
  const [date, setDate] = useState(event?.date || "");
  const [time, setTime] = useState(event?.time || "");
  const [notes, setNotes] = useState(event?.notes || "");
  const [contentId, setContentId] = useState(lockedContentId || event?.contentIds?.[0] || "");
  const [errors, setErrors] = useState([]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const problems = [];
    if (!title.trim()) problems.push("Informe um título.");
    if (!date) problems.push("Informe a data.");
    if (problems.length) {
      setErrors(problems);
      return;
    }
    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        type,
        date,
        time: time || null,
        notes: notes.trim(),
        contentIds: contentId ? [contentId] : [],
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} label={isEditing ? "Editar compromisso" : "Novo compromisso"}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <p style={{ fontSize: 17, fontWeight: 800, color: "#111827", margin: 0 }}>{isEditing ? "Editar compromisso" : "Novo compromisso"}</p>
        <button onClick={onClose} aria-label="Fechar" style={{ width: 44, height: 44, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <X size={20} color="#94A3B8" />
        </button>
      </div>

      <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1, marginBottom: 6 }}>TÍTULO</p>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Prova de Cálculo"
        style={{ width: "100%", height: 44, borderRadius: 12, border: "1.5px solid #E2E8F0", padding: "0 12px", fontFamily: "Inter,sans-serif", fontSize: 13.5, boxSizing: "border-box", marginBottom: 14 }} />

      <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1, marginBottom: 8 }}>TIPO</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
        {EVENT_TYPES.map((t) => {
          const meta = EVENT_TYPE_META[t];
          const isActive = type === t;
          return (
            <button key={t} onClick={() => setType(t)} aria-pressed={isActive}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 20, background: isActive ? meta.color : "#F1F5F9", color: isActive ? "white" : "#64748B", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer" }}>
              <span aria-hidden="true" style={{ width: 7, height: 7, borderRadius: "50%", background: isActive ? "white" : meta.color }} />
              {meta.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1, marginBottom: 6 }}>DATA</p>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            style={{ width: "100%", minWidth: 0, height: 42, borderRadius: 12, border: "1.5px solid #E2E8F0", padding: "0 8px", fontFamily: "Inter,sans-serif", fontSize: 12.5, boxSizing: "border-box", colorScheme: "light" }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1, marginBottom: 6 }}>HORÁRIO (opcional)</p>
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)}
            style={{ width: "100%", minWidth: 0, height: 42, borderRadius: 12, border: "1.5px solid #E2E8F0", padding: "0 8px", fontFamily: "Inter,sans-serif", fontSize: 12.5, boxSizing: "border-box", colorScheme: "light" }} />
        </div>
      </div>

      <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1, marginBottom: 6 }}>OBSERVAÇÃO (opcional)</p>
      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Detalhes adicionais"
        style={{ width: "100%", borderRadius: 12, border: "1.5px solid #E2E8F0", padding: "10px 12px", fontFamily: "Inter,sans-serif", fontSize: 13, boxSizing: "border-box", marginBottom: 14, resize: "vertical" }} />

      <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: 1, marginBottom: 6 }}>CONTEÚDO RELACIONADO (opcional)</p>
      <select value={contentId} onChange={(e) => setContentId(e.target.value)} disabled={!!lockedContentId}
        style={{ width: "100%", height: 44, borderRadius: 12, border: "1.5px solid #E2E8F0", padding: "0 10px", fontFamily: "Inter,sans-serif", fontSize: 13, boxSizing: "border-box", marginBottom: 16, background: lockedContentId ? "#F8FAFC" : "white" }}>
        <option value="">Nenhum</option>
        {contents.map((c) => (
          <option key={c.id} value={c.id}>{c.title}{c.subjectName ? ` · ${c.subjectName}` : ""}</option>
        ))}
      </select>

      {errors.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {errors.map((e) => <p key={e} style={{ fontSize: 12, color: "#DC2626", margin: "2px 0" }}>{e}</p>)}
        </div>
      )}

      <button onClick={handleSave} disabled={saving}
        style={{ width: "100%", height: 52, borderRadius: 16, background: "linear-gradient(135deg,#2563EB,#7C3AED)", color: "white", fontSize: 14, fontWeight: 700, border: "none", cursor: saving ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Calendar size={17} /> {saving ? "Salvando..." : isEditing ? "Salvar alterações" : "Criar compromisso"}
      </button>
    </Modal>
  );
}
