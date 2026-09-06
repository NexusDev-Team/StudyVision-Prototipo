import { X, Calendar, Pencil, Trash2 } from "lucide-react";
import Modal from "../ui/Modal";
import { EVENT_TYPE_META } from "../../data/models/event.js";
import CommitmentShape from "./CommitmentShape.jsx";

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function formatDate(dateStr) {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${d} de ${MONTHS[m - 1]}`;
}

// entries: [{ id, event }] — um AcademicEvent por linha. contentById resolve
// os títulos vinculados; um contentId sem conteúdo correspondente aparece como
// "Conteúdo não disponível" em vez de quebrar a interface.
export default function DayEventsModal({ date, entries, contentById, onClose, onViewContent, onEditEvent, onDeleteEvent }) {
  return (
    <Modal center onClose={onClose} label={`Compromissos de ${formatDate(date)}`}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Calendar size={18} color="#2563EB" />
          <span style={{ fontSize: 16, fontWeight: 800, color: "#111827" }}>{formatDate(date)}</span>
        </div>
        <button onClick={onClose} aria-label="Fechar" style={{ background: "#F1F5F9", border: "none", borderRadius: "50%", width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <X size={16} color="#64748B" />
        </button>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {entries.map(({ id, event }) => {
          const meta = EVENT_TYPE_META[event.type] || EVENT_TYPE_META.other;
          const linkedContents = event.contentIds.map((cid) => contentById.get(cid) || null);
          return (
            <div key={id} style={{ padding: "12px 14px", borderRadius: 14, background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <CommitmentShape type={event.type} size={10} color={meta.color} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.title}</p>
                  <p style={{ fontSize: 11, color: "#94A3B8", margin: "1px 0 0" }}>{meta.label}{event.time ? ` · ${event.time}` : ""}</p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 700, color: meta.color, background: `${meta.color}1A`, borderRadius: 8, padding: "3px 8px", flexShrink: 0 }}>{meta.label}</span>
                {onEditEvent && (
                  <button onClick={() => onEditEvent(event)} aria-label={`Editar ${event.title}`}
                    style={{ width: 44, height: 44, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Pencil size={14} color="#64748B" />
                  </button>
                )}
                {onDeleteEvent && (
                  <button onClick={() => onDeleteEvent(event)} aria-label={`Excluir ${event.title}`}
                    style={{ width: 44, height: 44, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Trash2 size={14} color="#DC2626" />
                  </button>
                )}
              </div>

              {event.notes && <p style={{ fontSize: 12, color: "#64748B", margin: "8px 0 0" }}>{event.notes}</p>}

              {linkedContents.length > 0 && (
                <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                  {linkedContents.map((content, i) => (
                    <div key={event.contentIds[i]} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span style={{ fontSize: 12, color: content ? "#374151" : "#94A3B8", fontStyle: content ? "normal" : "italic" }}>
                        {content ? content.title : "Conteúdo não disponível"}
                      </span>
                      {content && onViewContent && (
                        <button onClick={() => onViewContent(content)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#2563EB", fontSize: 11.5, fontWeight: 700, padding: 0 }}>
                          Ver conteúdo
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}
