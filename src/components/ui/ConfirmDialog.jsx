import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";

// Diálogo de confirmação genérico para ações destrutivas. O foco inicial vai
// para "Cancelar" — a saída segura é sempre a mais fácil de alcançar.
export default function ConfirmDialog({
  title,
  description,
  confirmLabel = "Excluir",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}) {
  return (
    <Modal center onClose={onCancel} label={title}>
      <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
        <span style={{ width: 38, height: 38, borderRadius: 12, background: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <AlertTriangle size={19} color="#DC2626" />
        </span>
        <div>
          <p style={{ fontSize: 15.5, fontWeight: 800, color: "#111827", margin: 0 }}>{title}</p>
          {description && <p style={{ fontSize: 12.5, color: "#64748B", margin: "4px 0 0", lineHeight: 1.5 }}>{description}</p>}
        </div>
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button autoFocus onClick={onCancel}
          style={{ flex: 1, height: 44, borderRadius: 12, border: "1.5px solid #E2E8F0", background: "white", cursor: "pointer", fontFamily: "Inter,sans-serif", fontSize: 13.5, fontWeight: 700, color: "#374151" }}>
          {cancelLabel}
        </button>
        <button onClick={onConfirm}
          style={{ flex: 1, height: 44, borderRadius: 12, border: "none", background: "#DC2626", color: "white", cursor: "pointer", fontFamily: "Inter,sans-serif", fontSize: 13.5, fontWeight: 700 }}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
