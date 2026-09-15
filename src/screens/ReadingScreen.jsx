// Ler Comigo — experiência imersiva de leitura guiada (Etapa 3). Um trecho
// por vez, narrado pela Web Speech API sobre o texto que o Study Vision já
// gerou (nunca a imagem, nunca OCR, nunca nova análise multimodal — ver
// readingService.js). Estrutura própria (não reaproveita/refatora
// FocusScreen.jsx), mas segue os mesmos princípios de Focus Lock: header
// mínimo, progresso textual + barra, uma etapa em destaque, saída com
// confirmação e telas terminais sempre desenhadas (nunca em branco).

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, Play, Pause, SkipBack, SkipForward, BookOpenCheck, VolumeX } from "lucide-react";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import ProgressBar from "../components/ui/ProgressBar";
import { LostHelpSheet, RephraseHelpSheet } from "../components/study/ReadingHelpSheet";
import { useReadingSession } from "../hooks/useReadingSession.js";
import { useSpeechSynthesis } from "../hooks/useSpeechSynthesis.js";
import { READING_RATES } from "../constants.js";
import { fadeUp } from "../styles/motion";

export default function ReadingScreen({ content, onExit }) {
  const {
    segments,
    hasEnough,
    preferences,
    progress,
    index,
    rate,
    status,
    total,
    isLastSegment,
    goTo,
    setRate,
    complete,
  } = useReadingSession(content);

  const { supported, status: speechStatus, speak, pause, resume, cancel } = useSpeechSynthesis();
  const [confirmExitOpen, setConfirmExitOpen] = useState(false);
  const [helpMode, setHelpMode] = useState(null); // null | "lost" | "rephrase"

  const comfortReading = preferences?.longText === true;
  const lowStimulus = preferences?.concentration === true;

  // Encadeia a fala de um trecho até o próximo, sem depender do state do
  // hook (que só atualiza no próximo render) — evita ler o índice antigo ao
  // encadear muito rápido. `playFromRef` sempre aponta para a versão mais
  // recente, então o `onEnd` de uma fala em andamento nunca chama uma
  // closure obsoleta mesmo se segments/rate mudarem entre o play e o fim.
  const playFromRef = useRef(() => {});

  const playFrom = useCallback(
    (segIndex, rateOverride) => {
      const text = segments[segIndex];
      if (!text) return;
      speak(text, {
        rate: rateOverride ?? rate,
        lang: "pt-BR",
        onEnd: () => {
          const nextIndex = segIndex + 1;
          if (nextIndex >= segments.length) {
            complete();
            return;
          }
          goTo(nextIndex);
          playFromRef.current(nextIndex);
        },
      });
    },
    [segments, rate, speak, goTo, complete]
  );
  playFromRef.current = playFrom;

  // Regra crítica (seções 27/56 do briefing): a voz NUNCA sobrevive a sair
  // desta tela, trocar de conteúdo ou desmontar o componente.
  useEffect(() => {
    return () => cancel();
  }, [content?.id, cancel]);

  const handlePlayPauseToggle = () => {
    if (!supported) return;
    if (speechStatus === "speaking") {
      pause();
      return;
    }
    if (speechStatus === "paused") {
      resume({
        text: segments[index],
        rate,
        lang: "pt-BR",
        onEnd: () => {
          const nextIndex = index + 1;
          if (nextIndex >= segments.length) {
            complete();
            return;
          }
          goTo(nextIndex);
          playFromRef.current(nextIndex);
        },
      });
      return;
    }
    playFrom(index);
  };

  const handleNext = () => {
    const wasActive = speechStatus === "speaking" || speechStatus === "paused";
    cancel();
    const nextIndex = Math.min(index + 1, total - 1);
    goTo(nextIndex);
    if (wasActive) playFrom(nextIndex);
  };

  const handlePrevious = () => {
    const wasActive = speechStatus === "speaking" || speechStatus === "paused";
    cancel();
    const prevIndex = Math.max(index - 1, 0);
    goTo(prevIndex);
    if (wasActive) playFrom(prevIndex);
  };

  const handleRateChange = (newRate) => {
    const wasActive = speechStatus === "speaking" || speechStatus === "paused";
    setRate(newRate);
    if (wasActive) {
      cancel();
      playFrom(index, newRate);
    }
  };

  const handleExit = () => {
    cancel();
    if (!progress || index === 0) {
      onExit?.();
      return;
    }
    setConfirmExitOpen(true);
  };

  const handleConfirmExit = () => {
    setConfirmExitOpen(false);
    cancel();
    onExit?.();
  };

  // "Me perdi" / "Outro jeito" (seção 39/42 do briefing): pausa/cancela a
  // leitura antes de abrir a folha — nunca fala e mostra o auxílio ao mesmo
  // tempo. Contexto mínimo: só o trecho atual + até 2 trechos anteriores.
  const openHelp = (mode) => {
    cancel();
    setHelpMode(mode);
  };

  // Conteúdo sem texto suficiente — nunca deveria chegar aqui (o
  // ReadingEntryCard bloqueia a entrada), mas nunca tela em branco se
  // acontecer (seção 54).
  if (!hasEnough || segments.length === 0) {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 32, textAlign: "center", background: "#F8FAFC" }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: "#111827", margin: 0, fontFamily: "Inter,sans-serif" }}>
          Este conteúdo ainda não possui texto suficiente para iniciar a leitura.
        </p>
        <button onClick={() => { cancel(); onExit?.(); }}
          style={{ padding: "12px 24px", borderRadius: 14, background: "#2563EB", color: "white", border: "none", fontFamily: "Inter,sans-serif", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
          Voltar ao conteúdo
        </button>
      </div>
    );
  }

  if (status === "completed") {
    return (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 32, textAlign: "center", background: "linear-gradient(160deg,#F0FDF4,#EFF6FF)" }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          style={{ width: 64, height: 64, borderRadius: "50%", background: "white", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 18px rgba(22,163,74,0.2)" }}>
          <BookOpenCheck size={30} color="#16A34A" />
        </motion.div>
        <p style={{ fontSize: 19, fontWeight: 800, color: "#111827", margin: 0, fontFamily: "Inter,sans-serif" }}>Leitura concluída</p>
        <p style={{ fontSize: 13.5, color: "#475569", margin: 0, maxWidth: 260, lineHeight: 1.5, fontFamily: "Inter,sans-serif" }}>
          Você terminou este conteúdo.
        </p>
        <button onClick={() => { cancel(); onExit?.(); }}
          style={{ marginTop: 8, padding: "13px 28px", borderRadius: 14, background: "linear-gradient(135deg,#2563EB,#16A34A)", color: "white", border: "none", fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          Voltar ao conteúdo
        </button>
      </div>
    );
  }

  const segmentNumber = index + 1;
  const isPlaying = speechStatus === "speaking";
  const isPaused = speechStatus === "paused";

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F8FAFC", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      {/* Header mínimo — só sair e título. */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "52px 16px 14px", flexShrink: 0 }}>
        <button onClick={handleExit} aria-label="Sair do Ler Comigo"
          style={{ width: 44, height: 44, borderRadius: 12, background: "white", border: "1px solid #E2E8F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <ChevronLeft size={20} color="#374151" />
        </button>
        <p style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 700, color: "#374151", margin: "0 44px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {content.title}
        </p>
      </div>

      {/* Progresso — texto + barra, nunca só cor. */}
      <div style={{ padding: "0 20px 14px", flexShrink: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: "#64748B", margin: "0 0 6px", fontFamily: "Inter,sans-serif" }}>
          Trecho {segmentNumber} de {total}
        </p>
        <ProgressBar value={(segmentNumber / total) * 100} height={6} />
        {!supported && (
          <p style={{ fontSize: 11.5, color: "#B45309", margin: "8px 0 0", display: "flex", alignItems: "center", gap: 6, fontFamily: "Inter,sans-serif" }}>
            <VolumeX size={13} /> A leitura em voz não está disponível neste navegador. Você ainda pode acompanhar o texto.
          </p>
        )}
      </div>

      {/* Trecho atual em destaque — vizinhos só aparecem como contexto
          esmaecido, e somem por completo com "dificuldade de concentração"
          declarada (seção 13 do briefing: nada de parede de texto). */}
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 20px 24px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
        {!lowStimulus && index > 0 && (
          <p style={{ fontSize: comfortReading ? 13 : 12, color: "#CBD5E1", margin: 0, lineHeight: 1.5, fontFamily: "Inter,sans-serif", textAlign: "center" }}>
            {segments[index - 1]}
          </p>
        )}
        <AnimatePresence mode="wait">
          <motion.div key={index} {...fadeUp}
            style={{ background: "white", border: "1.5px solid #DBEAFE", borderRadius: 20, padding: comfortReading ? "24px 22px" : "20px 18px", boxShadow: "0 2px 10px rgba(37,99,235,0.08)" }}>
            <p aria-live="polite"
              style={{ fontSize: comfortReading ? 17 : 15.5, lineHeight: comfortReading ? 1.8 : 1.65, color: "#111827", margin: 0, fontWeight: 600, fontFamily: "Inter,sans-serif", whiteSpace: "pre-wrap" }}>
              {segments[index]}
            </p>
          </motion.div>
        </AnimatePresence>
        {!lowStimulus && !isLastSegment && (
          <p style={{ fontSize: comfortReading ? 13 : 12, color: "#CBD5E1", margin: 0, lineHeight: 1.5, fontFamily: "Inter,sans-serif", textAlign: "center" }}>
            {segments[index + 1]}
          </p>
        )}
      </div>

      {/* Controles de leitura */}
      <div style={{ padding: "12px 20px 24px", flexShrink: 0, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 18 }}>
          <button onClick={handlePrevious} disabled={index === 0} aria-label="Trecho anterior"
            style={{ width: 46, height: 46, borderRadius: 14, border: "1.5px solid #E2E8F0", background: "white", cursor: index === 0 ? "default" : "pointer", opacity: index === 0 ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SkipBack size={18} color="#374151" />
          </button>
          <motion.button whileTap={{ scale: 0.94 }} onClick={handlePlayPauseToggle} disabled={!supported}
            aria-label={isPlaying ? "Pausar leitura" : isPaused ? "Retomar leitura" : "Iniciar leitura"} aria-pressed={isPlaying}
            style={{ width: 62, height: 62, borderRadius: "50%", border: "none", background: supported ? "linear-gradient(135deg,#2563EB,#7C3AED)" : "#CBD5E1", color: "white", cursor: supported ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: supported ? "0 4px 14px rgba(37,99,235,0.3)" : "none" }}>
            {isPlaying ? <Pause size={24} /> : <Play size={24} style={{ marginLeft: 2 }} />}
          </motion.button>
          <button onClick={handleNext} disabled={isLastSegment} aria-label="Próximo trecho"
            style={{ width: 46, height: 46, borderRadius: 14, border: "1.5px solid #E2E8F0", background: "white", cursor: isLastSegment ? "default" : "pointer", opacity: isLastSegment ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <SkipForward size={18} color="#374151" />
          </button>
        </div>

        {/* Velocidade — poucas opções fixas, nunca um slider (seção 29). */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8 }} role="group" aria-label="Velocidade da leitura">
          {READING_RATES.map((r) => (
            <button key={r} onClick={() => handleRateChange(r)} aria-pressed={rate === r}
              style={{ minWidth: 52, height: 36, borderRadius: 10, border: rate === r ? "1.5px solid #2563EB" : "1.5px solid #E2E8F0", background: rate === r ? "#EFF6FF" : "white", color: rate === r ? "#2563EB" : "#64748B", fontFamily: "Inter,sans-serif", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
              {r}x
            </button>
          ))}
        </div>

        {/* Auxílio contextual discreto — some com "dificuldade de
            concentração" declarada, mesma regra do Modo Foco (interface mais
            limpa, menos elementos secundários). */}
        {!lowStimulus && (
          <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
            <button onClick={() => openHelp("lost")}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#94A3B8", fontFamily: "Inter,sans-serif", padding: "10px 4px", minHeight: 44 }}>
              Me perdi
            </button>
            <button onClick={() => openHelp("rephrase")}
              style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#94A3B8", fontFamily: "Inter,sans-serif", padding: "10px 4px", minHeight: 44 }}>
              Outro jeito
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {confirmExitOpen && (
          <ConfirmDialog
            title="Sair da leitura?"
            description="Seu progresso será salvo."
            confirmLabel="Sair"
            cancelLabel="Continuar lendo"
            onConfirm={handleConfirmExit}
            onCancel={() => setConfirmExitOpen(false)}
          />
        )}
        {helpMode === "lost" && (
          <LostHelpSheet
            topic={content.title}
            current={segments[index]}
            previous={segments.slice(Math.max(0, index - 2), index)}
            preferences={preferences}
            onClose={() => setHelpMode(null)}
          />
        )}
        {helpMode === "rephrase" && (
          <RephraseHelpSheet
            topic={content.title}
            current={segments[index]}
            previous={segments.slice(Math.max(0, index - 2), index)}
            preferences={preferences}
            onClose={() => setHelpMode(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
