// Bottom sheet de seleção de duração do Modo Foco. Usa o Modal existente
// (nunca reimplementa bottom sheet). As durações vêm de FOCUS_DURATIONS —
// nunca uma lista literal duplicada — e cada uma tem exatamente uma
// descrição no mapa abaixo (MF-68 trava paridade com FOCUS_DURATIONS).

import { useState } from "react";
import { motion } from "framer-motion";
import { Target, AlertTriangle, Loader2 } from "lucide-react";
import Modal from "../ui/Modal";
import Button from "../ui/Button";
import { FOCUS_DURATIONS, FOCUS_DEFAULT_DURATION, FOCUS_DURATION_DESCRIPTIONS } from "../../constants.js";

export default function FocusDurationSheet({ status, error, onConfirm, onClose, replacingActiveSession = false }) {
  const [selected, setSelected] = useState(FOCUS_DEFAULT_DURATION);
  const loading = status === "loading";
  const failed = status === "error";

  if (failed) {
    return (
      <Modal onClose={onClose} label="Não foi possível preparar a sessão">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "8px 4px 4px" }}>
          <span style={{ width: 48, height: 48, borderRadius: 16, background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
            <AlertTriangle size={22} color="#DC2626" />
          </span>
          <p style={{ fontSize: 15.5, fontWeight: 800, color: "#111827", margin: "0 0 6px", fontFamily: "Inter,sans-serif" }}>
            Não conseguimos preparar sua sessão agora.
          </p>
          <p style={{ fontSize: 12.5, color: "#64748B", margin: "0 0 20px", lineHeight: 1.5, fontFamily: "Inter,sans-serif" }}>
            {error?.message || "Tente novamente em instantes."}
          </p>
          <div style={{ display: "flex", gap: 10, width: "100%" }}>
            <button onClick={onClose}
              style={{ flex: 1, height: 46, borderRadius: 14, border: "1.5px solid #E2E8F0", background: "white", cursor: "pointer", fontFamily: "Inter,sans-serif", fontSize: 13.5, fontWeight: 700, color: "#374151" }}>
              Voltar
            </button>
            <button onClick={() => onConfirm(selected)}
              style={{ flex: 1, height: 46, borderRadius: 14, border: "none", background: "#2563EB", color: "white", cursor: "pointer", fontFamily: "Inter,sans-serif", fontSize: 13.5, fontWeight: 700 }}>
              Tentar novamente
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  if (loading) {
    return (
      <Modal onClose={undefined} label="Preparando sua sessão focada">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "24px 4px" }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Loader2 size={32} color="#2563EB" />
          </motion.div>
          <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: "16px 0 0", fontFamily: "Inter,sans-serif" }}>
            Preparando sua sessão focada...
          </p>
          <p style={{ fontSize: 12.5, color: "#94A3B8", margin: "6px 0 0", fontFamily: "Inter,sans-serif" }}>
            Isso pode levar alguns segundos.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal onClose={onClose} label="Quanto tempo você tem?">
      <p style={{ fontSize: 17, fontWeight: 800, color: "#111827", margin: "0 0 4px", fontFamily: "Inter,sans-serif" }}>
        Quanto tempo você tem?
      </p>
      <p style={{ fontSize: 12.5, color: "#64748B", margin: "0 0 16px", lineHeight: 1.5, fontFamily: "Inter,sans-serif" }}>
        Escolha quanto tempo quer dedicar a este conteúdo agora.
      </p>

      {replacingActiveSession && (
        <p style={{ fontSize: 11.5, color: "#B45309", background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "8px 10px", margin: "0 0 14px", fontFamily: "Inter,sans-serif" }}>
          Sua sessão em andamento será marcada como concluída ao iniciar uma nova.
        </p>
      )}

      <div role="radiogroup" aria-label="Duração da sessão" style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
        {FOCUS_DURATIONS.map((minutes) => {
          const active = selected === minutes;
          return (
            <button
              key={minutes}
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(minutes)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left",
                minHeight: 56, padding: "12px 16px", borderRadius: 16, cursor: "pointer",
                background: active ? "#EFF6FF" : "white",
                border: active ? "1.5px solid #2563EB" : "1.5px solid #E2E8F0",
                fontFamily: "Inter,sans-serif",
              }}
            >
              <span>
                <span style={{ display: "block", fontSize: 15, fontWeight: 800, color: active ? "#1D4ED8" : "#111827" }}>{minutes} min</span>
                <span style={{ display: "block", fontSize: 12, color: "#64748B", marginTop: 2 }}>{FOCUS_DURATION_DESCRIPTIONS[minutes]}</span>
              </span>
              <span style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${active ? "#2563EB" : "#CBD5E1"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {active && <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#2563EB" }} />}
              </span>
            </button>
          );
        })}
      </div>

      <Button variant="primary" onClick={() => onConfirm(selected)} style={{ width: "100%", height: 50 }}>
        <Target size={16} style={{ marginRight: 6 }} />
        Começar
      </Button>
    </Modal>
  );
}
