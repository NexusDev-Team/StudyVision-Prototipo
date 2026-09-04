import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Calendar, Plus, Pencil, Link2Off } from "lucide-react";
import Card from "../ui/Card";
import SectionLabel from "../ui/SectionLabel";
import EventFormModal from "./EventFormModal";
import { EVENT_TYPE_META } from "../../data/models/event.js";

function formatEventDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// Lista TODOS os compromissos acadêmicos do conteúdo (não só o mais recente),
// com edição in-place e desvincular (o evento continua no calendário, só
// deixa de referenciar este conteúdo).
export default function CommitmentsSection({ content, events, contents, onCreate, onEdit, onUnlink }) {
  const [mode, setMode] = useState(null); // null | "create" | event object (edição)

  const sorted = [...events].sort((a, b) => (a.date || "").localeCompare(b.date || ""));

  return (
    <Card initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.58 }}>
      <SectionLabel>COMPROMISSOS</SectionLabel>

      {sorted.length === 0 ? (
        <p style={{ fontSize: 12.5, color: "#94A3B8", margin: "0 0 10px", fontFamily: "Inter,sans-serif" }}>
          Nenhum compromisso vinculado a este conteúdo ainda.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
          {sorted.map((event) => {
            const meta = EVENT_TYPE_META[event.type] || EVENT_TYPE_META.other;
            return (
              <div key={event.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 12, background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: meta.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{event.title}</p>
                  <p style={{ fontSize: 11, color: "#94A3B8", margin: "1px 0 0" }}>{meta.label} · {formatEventDate(event.date)}{event.time ? ` · ${event.time}` : ""}</p>
                </div>
                <button onClick={() => setMode(event)} aria-label={`Editar ${event.title}`}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }}>
                  <Pencil size={14} color="#64748B" />
                </button>
                <button onClick={() => onUnlink(event)} aria-label={`Desvincular ${event.title}`}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4, flexShrink: 0 }}>
                  <Link2Off size={14} color="#DC2626" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <button onClick={() => setMode("create")}
        style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 12px", borderRadius: 12, background: "#F8FAFC", border: "1px solid #E2E8F0", cursor: "pointer", width: "100%", fontFamily: "Inter,sans-serif" }}>
        {sorted.length === 0 ? <Calendar size={18} color="#2563EB" /> : <Plus size={18} color="#2563EB" />}
        <span style={{ fontSize: 13, fontWeight: 600, color: "#111827" }}>Adicionar compromisso</span>
      </button>

      <AnimatePresence>
        {mode === "create" && (
          <EventFormModal
            contents={contents}
            lockedContentId={content.id}
            onSave={async (payload) => { await onCreate(payload); setMode(null); }}
            onClose={() => setMode(null)}
          />
        )}
        {mode && mode !== "create" && (
          <EventFormModal
            event={mode}
            contents={contents}
            onSave={async (payload) => { await onEdit(mode.id, payload); setMode(null); }}
            onClose={() => setMode(null)}
          />
        )}
      </AnimatePresence>
    </Card>
  );
}
