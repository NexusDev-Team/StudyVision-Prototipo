// Focus Lock — experiência imersiva do Modo Foco (Etapa 2). Uma etapa por
// vez, timer não punitivo, saída com progresso salvo, retomada sem nova
// chamada ao Gemini (o hook só lê a sessão já persistida) e conclusão.
//
// Este componente não fala com /api/focus em nenhum momento: toda a
// orquestração de geração já aconteceu antes de chegar aqui (FocusEntryCard
// + FocusDurationSheet). Aqui só se navega dentro de uma FocusSession que
// já existe.

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Pause, Play, CheckCircle2 } from "lucide-react";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import ProgressBar from "../components/ui/ProgressBar";
import FocusStepRenderer from "../components/study/FocusStepRenderer";
import { LostRecapSheet, RephraseSheet } from "../components/study/FocusHelpSheet";
import { useFocusSession } from "../hooks/useFocusSession.js";
import { getFocusElapsedMs } from "../services/focusSessionService.js";
import { buildLostRecap } from "../utils/focusRecap.js";
import { fadeUp } from "../styles/motion";

function formatClock(ms) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function FocusScreen({ content, onExit }) {
  const { session, status, advance, goBackStep, complete, startTimer, pauseTimer, resumeTimer } = useFocusSession(content.id);
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);
  const [helpMode, setHelpMode] = useState(null); // null | "lost" | "rephrase"
  const [tick, setTick] = useState(() => Date.now());

  // Inicia o relógio assim que a sessão está disponível — no-op se já tiver
  // sido iniciada antes (retomada/reload não reinicia a contagem).
  useEffect(() => {
    if (session && !session.timerStartedAt) startTimer();
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Único setInterval ativo por vez: para (cleanup) sempre que a sessão muda
  // de estado (pausada, concluída) ou o componente desmonta — nunca duplica.
  useEffect(() => {
    if (!session || session.status === "completed" || session.pausedAt) return undefined;
    const id = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [session?.id, session?.status, session?.pausedAt, session?.timerStartedAt]);

  const elapsedMs = session ? getFocusElapsedMs(session, tick) : 0;
  const plannedMs = session ? session.durationMinutes * 60 * 1000 : 0;
  const remainingMs = plannedMs - elapsedMs;
  const timeUp = session ? remainingMs <= 0 : false;

  const comfortReading = session?.inclusionPreferencesSnapshot?.longText === true;
  const lowStimulus = session?.inclusionPreferencesSnapshot?.concentration === true;
  const stepMode = session?.inclusionPreferencesSnapshot?.manySteps === true;

  const currentStep = useMemo(() => session?.steps?.[session.currentStepIndex] || null, [session]);
  const totalSteps = session?.steps?.length || 0;
  const stepNumber = (session?.currentStepIndex || 0) + 1;
  const isLastStep = stepNumber >= totalSteps;

  const handleExit = () => {
    if (!session || session.currentStepIndex === 0) {
      onExit?.();
      return;
    }
    setConfirmExitOpen(true);
  };

  const handleConfirmExit = () => {
    setConfirmExitOpen(false);
    onExit?.();
  };

  const handlePauseToggle = () => {
    if (session?.pausedAt) resumeTimer();
    else pauseTimer();
  };

  const handlePrimaryAction = () => {
    if (isLastStep) complete();
    else advance();
  };

  if (!session) {
    // Sessão inexistente/corrompida — nunca tela em branco (seção 45/60).
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 32, textAlign: "center", background: "#F8FAFC" }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0, fontFamily: "Inter,sans-serif" }}>
          Não encontramos esta sessão de foco.
        </p>
        <button onClick={onExit}
          style={{ padding: "12px 24px", borderRadius: 14, background: "#2563EB", color: "white", border: "none", fontFamily: "Inter,sans-serif", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
          Voltar ao conteúdo
        </button>
      </div>
    );
  }

  if (session.status === "completed") {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 32, textAlign: "center", background: "linear-gradient(160deg,#EFF6FF,#F5F3FF)" }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          style={{ width: 64, height: 64, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 18px rgba(37,99,235,0.2)" }}>
          <CheckCircle2 size={32} color="#16A34A" />
        </motion.div>
        <p style={{ fontSize: 19, fontWeight: 800, color: "#111827", margin: 0, fontFamily: "Inter,sans-serif" }}>Sessão concluída</p>
        <p style={{ fontSize: 13.5, color: "#475569", margin: 0, maxWidth: 260, lineHeight: 1.5, fontFamily: "Inter,sans-serif" }}>
          Você concluiu sua revisão focada de {content.title}.
        </p>
        <p style={{ fontSize: 12, color: "#64748B", margin: 0, fontFamily: "Inter,sans-serif" }}>
          {session.durationMinutes} minutos planejados · {session.steps.length} {session.steps.length === 1 ? "etapa concluída" : "etapas concluídas"}
        </p>
        <button onClick={onExit}
          style={{ marginTop: 8, padding: "13px 28px", borderRadius: 14, background: "linear-gradient(135deg,#2563EB,#7C3AED)", color: "white", border: "none", fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          Voltar ao conteúdo
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F8FAFC", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      {/* Header mínimo — só sair, título curto, tempo e pausa. */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "52px 16px 14px", flexShrink: 0 }}>
        <button onClick={handleExit} aria-label="Sair do Modo Foco"
          style={{ width: 44, height: 44, borderRadius: 12, background: "white", border: "1px solid #E2E8F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={20} color="#374151" />
        </button>
        <p style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 700, color: "#374151", margin: "0 8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {content.title}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span aria-live="off" style={{ fontSize: 13, fontWeight: 800, color: timeUp ? "#16A34A" : "#111827", fontVariantNumeric: "tabular-nums", minWidth: 44, textAlign: "right" }}>
            {timeUp ? "✓" : formatClock(remainingMs)}
          </span>
          <button onClick={handlePauseToggle} aria-label={session.pausedAt ? "Retomar temporizador" : "Pausar temporizador"}
            style={{ width: 44, height: 44, borderRadius: 12, background: "white", border: "1px solid #E2E8F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {session.pausedAt ? <Play size={16} color="#2563EB" /> : <Pause size={16} color="#2563EB" />}
          </button>
        </div>
      </div>

      {/* Progresso — texto + barra, nunca só cor. */}
      <div style={{ padding: "0 20px 14px", flexShrink: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#64748B", margin: "0 0 6px", fontFamily: "Inter,sans-serif" }}>
          Etapa {stepNumber} de {totalSteps}
        </p>
        <ProgressBar value={(stepNumber / totalSteps) * 100} height={6} />
        {timeUp && (
          <p style={{ fontSize: 11.5, color: "#16A34A", margin: "8px 0 0", fontFamily: "Inter,sans-serif" }}>
            Tempo planejado concluído. Finalize esta etapa no seu ritmo.
          </p>
        )}
      </div>

      {/* Conteúdo — uma etapa por vez, sem menu, sem navegação global. */}
      <div style={{ flex: 1, overflowY: "auto", padding: lowStimulus ? "8px 20px 20px" : "8px 20px 24px" }}>
        <AnimatePresence mode="wait">
          <motion.div key={session.currentStepIndex} {...fadeUp}>
            <FocusStepRenderer step={currentStep} comfortReading={comfortReading} stepMode={stepMode} />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Ação principal */}
      <div style={{ padding: "12px 20px 24px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 10 }}>
          {stepNumber > 1 && (
            <button onClick={goBackStep}
              style={{ height: 50, minWidth: 88, borderRadius: 14, border: "1.5px solid #E2E8F0", background: "white", color: "#374151", fontFamily: "Inter,sans-serif", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
              Voltar
            </button>
          )}
          <motion.button whileTap={{ scale: 0.97 }} onClick={handlePrimaryAction}
            style={{ flex: 1, height: 50, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#2563EB,#7C3AED)", color: "white", fontFamily: "Inter,sans-serif", fontSize: 14.5, fontWeight: 800, cursor: "pointer" }}>
            {isLastStep ? "Concluir sessão" : "Continuar"}
          </motion.button>
        </div>

        {/* Auxílio contextual discreto — nunca compete com a ação principal.
            Com "dificuldade de concentração" declarada, some daqui: interface
            mais limpa, menos elementos secundários (seção 36). A recapitulação
            e a reexplicação continuam existindo, só não ficam à mostra por
            padrão nesse caso. */}
        {!lowStimulus && (
          <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
            <button onClick={() => setHelpMode("lost")}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#94A3B8", fontFamily: "Inter,sans-serif", padding: "10px 4px", minHeight: 44 }}>
              Me perdi
            </button>
            <button onClick={() => setHelpMode("rephrase")}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#94A3B8", fontFamily: "Inter,sans-serif", padding: "10px 4px", minHeight: 44 }}>
              Outro jeito
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {confirmExitOpen && (
          <ConfirmDialog
            title="Sair da sessão?"
            description="Seu progresso será salvo."
            confirmLabel="Sair"
            cancelLabel="Continuar estudando"
            onConfirm={handleConfirmExit}
            onCancel={() => setConfirmExitOpen(false)}
          />
        )}
        {helpMode === "lost" && (
          <LostRecapSheet recap={buildLostRecap(session)} onClose={() => setHelpMode(null)} />
        )}
        {helpMode === "rephrase" && currentStep && (
          <RephraseSheet step={currentStep} preferences={session.inclusionPreferencesSnapshot} onClose={() => setHelpMode(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
