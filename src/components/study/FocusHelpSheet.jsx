// Auxílio contextual do Focus Lock (Etapa 2): "Me perdi" (recapitulação
// 100% local, sem rede) e "Outro jeito" (reexplicação do step atual via
// Gemini, payload mínimo, sem imagem, sem histórico, sem nova FocusSession).
// Dois componentes pequenos em vez de um chat — cada abertura é uma ação
// isolada, nunca uma conversa persistente.

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HelpCircle, Sparkles, AlertTriangle } from "lucide-react";
import Modal from "../ui/Modal";
import { requestRephrase } from "../../services/focusModeService.js";
import { focusErrorMessage } from "../../hooks/useFocusSession.js";

export function LostRecapSheet({ recap, onClose }) {
  if (!recap) return null;
  return (
    <Modal onClose={onClose} label="Me perdi">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <HelpCircle size={18} color="#2563EB" />
        <p style={{ fontSize: 15.5, fontWeight: 800, color: "#111827", margin: 0, fontFamily: "Inter,sans-serif" }}>
          {recap.isFirstStep ? "Você está começando" : "Retomando de onde você estava"}
        </p>
      </div>
      <p style={{ fontSize: 12, fontWeight: 700, color: "#64748B", margin: "0 0 10px", fontFamily: "Inter,sans-serif" }}>
        Etapa {recap.stepNumber} de {recap.totalSteps}
      </p>
      <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 14, padding: "12px 14px", marginBottom: 18 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: "0 0 4px", fontFamily: "Inter,sans-serif" }}>{recap.recapTitle}</p>
        <p style={{ fontSize: 12.5, color: "#475569", margin: 0, lineHeight: 1.55, fontFamily: "Inter,sans-serif" }}>{recap.recapSnippet}</p>
      </div>
      <button onClick={onClose}
        style={{ width: "100%", height: 46, borderRadius: 14, border: "none", background: "#111827", color: "white", fontFamily: "Inter,sans-serif", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
        Entendi
      </button>
    </Modal>
  );
}

export function RephraseSheet({ step, preferences, onClose }) {
  const [status, setStatus] = useState("loading"); // loading | done | error
  const [text, setText] = useState("");
  const [error, setError] = useState(null);

  const run = () => {
    setStatus("loading");
    setError(null);
    requestRephrase({ title: step.title, content: step.content }, { preferences })
      .then((result) => {
        setText(result);
        setStatus("done");
      })
      .catch((err) => {
        setError(focusErrorMessage(err));
        setStatus("error");
      });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, []);

  return (
    <Modal onClose={onClose} label="Outro jeito de explicar">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Sparkles size={18} color="#7C3AED" />
        <p style={{ fontSize: 15.5, fontWeight: 800, color: "#111827", margin: 0, fontFamily: "Inter,sans-serif" }}>Outro jeito de explicar</p>
      </div>

      {status === "loading" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0 24px" }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Sparkles size={24} color="#7C3AED" />
          </motion.div>
          <p style={{ fontSize: 12.5, color: "#94A3B8", margin: "12px 0 0", fontFamily: "Inter,sans-serif" }}>
            Buscando outra forma de explicar...
          </p>
        </div>
      )}

      {status === "error" && (
        <div style={{ textAlign: "center", padding: "8px 0 4px" }}>
          <AlertTriangle size={22} color="#DC2626" style={{ marginBottom: 8 }} />
          <p style={{ fontSize: 13, color: "#475569", margin: "0 0 16px", fontFamily: "Inter,sans-serif" }}>{error}</p>
          <button onClick={run}
            style={{ width: "100%", height: 44, borderRadius: 12, border: "none", background: "#2563EB", color: "white", fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Tentar novamente
          </button>
        </div>
      )}

      {status === "done" && (
        <div style={{ background: "#FAF5FF", border: "1px solid #E9D5FF", borderRadius: 14, padding: "12px 14px", marginBottom: 18 }}>
          <p style={{ fontSize: 13.5, color: "#374151", margin: 0, lineHeight: 1.6, fontFamily: "Inter,sans-serif", whiteSpace: "pre-wrap" }}>{text}</p>
        </div>
      )}

      {status !== "loading" && (
        <button onClick={onClose}
          style={{ width: "100%", height: 46, borderRadius: 14, border: "1.5px solid #E2E8F0", background: "white", color: "#374151", fontFamily: "Inter,sans-serif", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
          Fechar
        </button>
      )}
    </Modal>
  );
}
