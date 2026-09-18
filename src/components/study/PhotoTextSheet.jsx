// Folha "Texto identificado" (feature de extração de texto de uma foto).
// Puramente apresentacional: todo o estado de requisição/cache vem de
// usePhotoTextExtraction, mantido pelo PhotoViewerModal (que chama reset() ao
// trocar de foto — o texto de uma foto nunca aparece em outra). Mesmo padrão
// visual de ReadingHelpSheet.jsx/FocusHelpSheet.jsx, como bottom sheet sobre
// o visualizador (Modal sem `center`).

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { FileText, AlertTriangle, Copy } from "lucide-react";
import Modal from "../ui/Modal";
import { copyText } from "../../services/photoTextService";

const COPIED_FEEDBACK_MS = 2000;

export default function PhotoTextSheet({ status, text, partial, error, onRetry, onClose }) {
  const [copyFeedback, setCopyFeedback] = useState(null); // null | "ok" | "erro"
  const feedbackTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(feedbackTimerRef.current), []);

  const handleCopy = () => {
    copyText(text)
      .then(() => setCopyFeedback("ok"))
      .catch(() => setCopyFeedback("erro"));
    clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setCopyFeedback(null), COPIED_FEEDBACK_MS);
  };

  return (
    <Modal onClose={onClose} label="Texto identificado">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <FileText size={18} color="#2563EB" />
        <p style={{ fontSize: 15.5, fontWeight: 800, color: "#111827", margin: 0, fontFamily: "Inter,sans-serif" }}>
          Texto identificado
        </p>
      </div>

      {status === "loading" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0 24px" }} aria-live="polite">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <FileText size={24} color="#2563EB" />
          </motion.div>
          <p style={{ fontSize: 12.5, color: "#94A3B8", margin: "12px 0 0", fontFamily: "Inter,sans-serif" }}>
            Identificando texto...
          </p>
        </div>
      )}

      {status === "empty" && (
        <div style={{ textAlign: "center", padding: "8px 0 4px" }} aria-live="polite">
          <FileText size={22} color="#94A3B8" style={{ marginBottom: 8 }} />
          <p style={{ fontSize: 13, color: "#475569", margin: "0 0 16px", fontFamily: "Inter,sans-serif" }}>
            Nenhum texto legível foi encontrado nesta foto.
          </p>
          <button onClick={onClose}
            style={{ width: "100%", minHeight: 44, borderRadius: 14, border: "1.5px solid #E2E8F0", background: "white", color: "#374151", fontFamily: "Inter,sans-serif", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
            Fechar
          </button>
        </div>
      )}

      {status === "error" && (
        <div style={{ textAlign: "center", padding: "8px 0 4px" }} aria-live="polite">
          <AlertTriangle size={22} color="#DC2626" style={{ marginBottom: 8 }} />
          <p style={{ fontSize: 13, color: "#475569", margin: "0 0 16px", fontFamily: "Inter,sans-serif" }}>
            {error || "Não foi possível extrair o texto desta foto."}
          </p>
          <button onClick={onRetry}
            style={{ width: "100%", minHeight: 44, borderRadius: 12, border: "none", background: "#2563EB", color: "white", fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Tentar novamente
          </button>
        </div>
      )}

      {status === "done" && (
        <>
          <div
            style={{
              background: "#F8FAFC",
              border: "1px solid #E2E8F0",
              borderRadius: 14,
              padding: "12px 14px",
              marginBottom: 12,
              maxHeight: "42vh",
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <p style={{ fontSize: 13.5, color: "#1F2937", margin: 0, lineHeight: 1.6, fontFamily: "Inter,sans-serif", whiteSpace: "pre-wrap", userSelect: "text" }}>
              {text}
            </p>
          </div>

          {partial && (
            <p style={{ fontSize: 11.5, color: "#94A3B8", margin: "0 0 14px", fontFamily: "Inter,sans-serif" }}>
              Algumas partes da imagem podem não ter sido identificadas.
            </p>
          )}

          <button onClick={handleCopy} aria-label="Copiar texto identificado"
            style={{ width: "100%", minHeight: 46, borderRadius: 14, border: "none", background: "#2563EB", color: "white", fontFamily: "Inter,sans-serif", fontSize: 13.5, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Copy size={16} />
            Copiar texto
          </button>

          <p style={{ fontSize: 12, color: copyFeedback === "erro" ? "#DC2626" : "#16A34A", margin: "10px 0 0", textAlign: "center", fontFamily: "Inter,sans-serif", minHeight: 16 }} aria-live="polite">
            {copyFeedback === "ok" && "Texto copiado!"}
            {copyFeedback === "erro" && "Não foi possível copiar. Copie manualmente."}
          </p>
        </>
      )}
    </Modal>
  );
}
