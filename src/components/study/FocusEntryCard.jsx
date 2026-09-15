// Entrada do Modo Foco na página de Content — três estados possíveis:
// (1) sem sessão ativa e conteúdo elegível → botão "Modo Foco";
// (2) sessão em andamento → card de retomada, "Continuar sessão" é a ação
//     primária (seção 7 do plano: prioridade é sempre continuar);
// (3) conteúdo sem informação suficiente → aviso, sem botão quebrado.
//
// Toda geração/retomada passa pelo motor da Etapa 1 via useFocusSession —
// este componente só decide o que mostrar e abre o seletor de duração.

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target } from "lucide-react";
import Card from "../ui/Card";
import Button from "../ui/Button";
import FocusDurationSheet from "./FocusDurationSheet";
import { useFocusSession } from "../../hooks/useFocusSession.js";
import { buildFocusPayload, hasEnoughContent } from "../../services/focusModeService.js";
import { completeFocusSession } from "../../services/focusSessionService.js";

export default function FocusEntryCard({ content, onEnterFocus }) {
  const { session, status, error, start, refresh } = useFocusSession(content.id);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [replacing, setReplacing] = useState(false);

  const eligible = hasEnoughContent(buildFocusPayload(content));

  const openNewSession = () => {
    setReplacing(false);
    setSheetOpen(true);
  };

  // Não é possível pedir ao motor uma sessão nova enquanto uma está ativa —
  // startFocusSession sempre retoma a ativa (regra crítica de retomada). Para
  // permitir "nova sessão" explicitamente, a ativa é marcada concluída (dado
  // preservado, não apagado) antes de pedir a geração.
  const openReplacementSession = () => {
    setReplacing(true);
    setSheetOpen(true);
  };

  const handleConfirmDuration = async (durationMinutes) => {
    try {
      if (replacing && session) {
        completeFocusSession(session.id);
        refresh();
      }
      const s = await start(durationMinutes);
      setSheetOpen(false);
      setReplacing(false);
      onEnterFocus?.(s);
    } catch {
      // erro fica em `error`; o sheet permanece aberto mostrando o estado de falha.
    }
  };

  const handleContinue = () => {
    if (session) onEnterFocus?.(session);
  };

  if (!eligible) {
    return (
      <Card style={{ padding: "14px 16px", marginBottom: 12, background: "#F8FAFC", border: "1px dashed #E2E8F0" }}>
        <p style={{ fontSize: 12.5, color: "#64748B", margin: 0, lineHeight: 1.5, fontFamily: "Inter,sans-serif" }}>
          🎯 Este conteúdo ainda não possui informações suficientes para criar uma sessão focada.
        </p>
      </Card>
    );
  }

  if (session) {
    const stepNumber = session.currentStepIndex + 1;
    const totalSteps = session.steps.length;
    return (
      <>
        <Card
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ padding: "16px 18px", marginBottom: 12, background: "linear-gradient(135deg,#EFF6FF,#F5F3FF)", border: "1px solid #DBEAFE" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <Target size={16} color="#2563EB" />
            <p style={{ fontSize: 13, fontWeight: 800, color: "#111827", margin: 0, fontFamily: "Inter,sans-serif" }}>
              Modo Foco · {session.durationMinutes} minutos
            </p>
          </div>
          <p style={{ fontSize: 12.5, color: "#475569", margin: "0 0 12px", fontFamily: "Inter,sans-serif" }}>
            Você parou na etapa {stepNumber} de {totalSteps}.
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Button variant="primary" onClick={handleContinue} style={{ flex: 1, height: 44, fontSize: 13.5 }}>
              Continuar sessão
            </Button>
            <button onClick={openReplacementSession}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#64748B", fontFamily: "Inter,sans-serif", padding: "8px 4px", minHeight: 44 }}>
              Nova sessão
            </button>
          </div>
        </Card>
        <AnimatePresence>
          {sheetOpen && (
            <FocusDurationSheet
              status={status}
              error={error}
              replacingActiveSession={replacing}
              onClose={() => { setSheetOpen(false); setReplacing(false); }}
              onConfirm={handleConfirmDuration}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      <motion.button whileTap={{ scale: 0.97 }} onClick={openNewSession}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%", height: 52, borderRadius: 16, background: "var(--sv-grad-primary)", border: "none", cursor: "pointer", marginBottom: 12, boxShadow: "0 4px 14px rgba(37,99,235,0.25)" }}>
        <Target size={18} color="white" />
        <span style={{ fontFamily: "Inter,sans-serif", fontSize: 14.5, fontWeight: 800, color: "white" }}>Modo Foco</span>
      </motion.button>
      <AnimatePresence>
        {sheetOpen && (
          <FocusDurationSheet
            status={status}
            error={error}
            onClose={() => setSheetOpen(false)}
            onConfirm={handleConfirmDuration}
          />
        )}
      </AnimatePresence>
    </>
  );
}
