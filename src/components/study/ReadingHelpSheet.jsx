// Auxílio contextual do Ler Comigo (Etapa 3): "Me perdi" e "Outro jeito",
// mesmo padrão de FocusHelpSheet.jsx (Etapa 2) — uma pergunta isolada por
// toque, nunca uma thread de conversa. Os dois modos passam pelo MESMO
// endpoint leve (/api/reading-help via requestReadingHelp), com payload
// mínimo: trecho atual + até 2 trechos anteriores de contexto + preferências.
// Nunca imagem, nunca o Content inteiro, nunca histórico.

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { HelpCircle, Sparkles, AlertTriangle } from "lucide-react";
import Modal from "../ui/Modal";
import { requestReadingHelp, readingHelpErrorMessage } from "../../services/readingService.js";

const MODE_META = {
  lost: { label: "Até aqui", icon: HelpCircle, color: "#2563EB" },
  rephrase: { label: "Outro jeito", icon: Sparkles, color: "#7C3AED" },
};

// Corpo compartilhado pelos dois modos — só muda o texto/ícone e o `mode`
// enviado ao service. `current`/`previous`/`topic` vêm sempre do trecho onde
// o estudante está agora, nunca de um Content inteiro.
function ReadingHelpBody({ mode, topic, current, previous, preferences, onClose }) {
  const [status, setStatus] = useState("loading"); // loading | done | error
  const [text, setText] = useState("");
  const [error, setError] = useState(null);
  const meta = MODE_META[mode];
  const Icon = meta.icon;

  const run = () => {
    setStatus("loading");
    setError(null);
    requestReadingHelp({ mode, topic, current, previous }, { preferences })
      .then((result) => {
        setText(result);
        setStatus("done");
      })
      .catch((err) => {
        setError(readingHelpErrorMessage(err?.kind));
        setStatus("error");
      });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { run(); }, []);

  return (
    <Modal onClose={onClose} label={meta.label}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Icon size={18} color={meta.color} />
        <p style={{ fontSize: 15.5, fontWeight: 800, color: "#111827", margin: 0, fontFamily: "Inter,sans-serif" }}>{meta.label}</p>
      </div>

      {status === "loading" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px 0 24px" }}>
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
            <Icon size={24} color={meta.color} />
          </motion.div>
          <p style={{ fontSize: 12.5, color: "#94A3B8", margin: "12px 0 0", fontFamily: "Inter,sans-serif" }}>
            {mode === "lost" ? "Preparando um resumo do que você já leu..." : "Buscando outra forma de explicar..."}
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
        <div style={{ background: mode === "lost" ? "#EFF6FF" : "#FAF5FF", border: `1px solid ${mode === "lost" ? "#DBEAFE" : "#E9D5FF"}`, borderRadius: 14, padding: "12px 14px", marginBottom: 18 }}>
          <p style={{ fontSize: 13.5, color: "#374151", margin: 0, lineHeight: 1.6, fontFamily: "Inter,sans-serif", whiteSpace: "pre-wrap" }}>{text}</p>
        </div>
      )}

      {status !== "loading" && (
        <button onClick={onClose}
          style={{ width: "100%", height: 46, borderRadius: 14, border: "1.5px solid #E2E8F0", background: "white", color: "#374151", fontFamily: "Inter,sans-serif", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
          Continuar daqui
        </button>
      )}
    </Modal>
  );
}

// "Me perdi" — o estudante avisa que perdeu o fio da leitura; explicação
// curta do necessário para continuar, sem avançar assunto novo.
export function LostHelpSheet(props) {
  return <ReadingHelpBody mode="lost" {...props} />;
}

// "Outro jeito" — reexplica o trecho atual preservando o significado.
export function RephraseHelpSheet(props) {
  return <ReadingHelpBody mode="rephrase" {...props} />;
}
