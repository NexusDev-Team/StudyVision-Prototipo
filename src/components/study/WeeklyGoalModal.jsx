import { useState } from "react";
import { X, Flame } from "lucide-react";
import Modal from "../ui/Modal";
import { MIN_WEEKLY_TARGET, MAX_WEEKLY_TARGET } from "../../services/knowledgeFlameService";

const OPTIONS = Array.from(
  { length: MAX_WEEKLY_TARGET - MIN_WEEKLY_TARGET + 1 },
  (_, i) => MIN_WEEKLY_TARGET + i
);

// Modal de configuração da meta semanal da Chama do Conhecimento (Fase 9).
// Não decide regra de negócio: só coleta 1..7 e devolve via onSave. Quem
// valida e persiste é o serviço (setPreferredWeeklyTarget).
export default function WeeklyGoalModal({ value, hasHistory, onSave, onClose }) {
  const [selected, setSelected] = useState(value);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(selected);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal onClose={onClose} label="Sua meta semanal">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <p style={{ fontSize: 17, fontWeight: 800, color: "#111827", margin: 0 }}>Sua meta semanal</p>
        <button onClick={onClose} aria-label="Fechar" style={{ width: 44, height: 44, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <X size={20} color="#94A3B8" />
        </button>
      </div>

      <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 16px", fontFamily: "Inter,sans-serif" }}>
        Escolha quantas atividades de estudo você quer completar por semana.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 12 }}>
        {OPTIONS.map((n) => {
          const active = selected === n;
          return (
            <button
              key={n}
              onClick={() => setSelected(n)}
              aria-pressed={active}
              style={{
                minHeight: 44,
                padding: "8px 2px",
                borderRadius: 12,
                border: active ? "1.5px solid #2563EB" : "1.5px solid #E2E8F0",
                background: active ? "#EFF6FF" : "white",
                color: active ? "#2563EB" : "#64748B",
                fontFamily: "Inter,sans-serif",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {n}
            </button>
          );
        })}
      </div>

      <p style={{ fontSize: 12, color: "#94A3B8", margin: "0 0 20px", fontFamily: "Inter,sans-serif" }}>
        Uma meta realista ajuda você a manter sua constância.
        {!hasHistory && " Uma boa forma de começar é com 3 atividades por semana."}
      </p>

      <button onClick={handleSave} disabled={saving}
        style={{ width: "100%", height: 52, borderRadius: 16, background: "linear-gradient(135deg,#2563EB,#7C3AED)", color: "white", fontSize: 14, fontWeight: 700, border: "none", cursor: saving ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Flame size={17} /> {saving ? "Salvando..." : "Salvar meta"}
      </button>
    </Modal>
  );
}
