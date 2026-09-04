import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle, Bookmark, BookMarked, GraduationCap } from "lucide-react";
import LogoSVG from "../components/brand/LogoSVG";
import CapturedPageVisual from "../components/brand/CapturedPageVisual";
import ContentBlocks from "../components/study/ContentBlocks";
import ExportSection from "../components/study/ExportSection";
import PlanningSection from "../components/study/PlanningSection";
import { createContentEntry } from "../services/contentService";
import { ensureSubject } from "../services/subjectService";
import { scheduleInitialReview } from "../services/reviewService";
import { scheduleCommitment } from "../services/calendarService";
import { getSubjectVisual } from "../constants";
import { fadeUp } from "../styles/motion";

// capturedContent: Content normalizado ainda não persistido (vem de useAnalysis).
// Quem salva de verdade é handleSave aqui, ao clicar em "Salvar".
export default function SummaryScreen({ capturedContent, onSave, onLibrary, onToast }) {
  const [saving, setSaving] = useState(false);
  const [calendarEvent, setCalendarEvent] = useState(null);

  if (!capturedContent) return null;
  const visual = getSubjectVisual(capturedContent.subjectName);

  // O agendamento fica só em memória até o usuário confirmar "Salvar" — não
  // persiste um conteúdo pela metade se ele fechar a tela sem salvar.
  const handlePlanned = (event) => {
    setCalendarEvent(event);
  };

  const handleSave = () => {
    if (saving) return;
    setSaving(true);

    const subject = ensureSubject(capturedContent.subjectName);

    const { content: saved, result } = createContentEntry({
      ...capturedContent,
      subjectId: subject?.id || null,
      subjectName: subject?.name || "",
    });
    scheduleInitialReview(saved.id, saved.createdAt);
    if (calendarEvent) {
      scheduleCommitment({ contentId: saved.id, title: saved.title, ...calendarEvent });
    }

    setSaving(false);
    if (!result.ok) {
      onToast?.("Não foi possível salvar a foto — conteúdo salvo sem a imagem.");
    }
    onSave();
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F8FAFC", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "white", padding: "52px 20px 16px", borderBottom: "1px solid #F1F5F9", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <LogoSVG size={24} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", letterSpacing: 1 }}>STUDY VISION</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0, lineHeight: 1.2 }}>Resumo Inteligente</h1>
      </div>

      {/* Scroll area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 20px" }}>
        {/* Identified content */}
        <motion.div {...fadeUp} transition={{ delay: 0.1 }}
          style={{ background: "white", borderRadius: 20, padding: "16px 18px", marginBottom: 12, boxShadow: "0 1px 8px rgba(0,0,0,0.05)", border: "1px solid #E2E8F0" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: 1.2, marginBottom: 12 }}>CONTEÚDO IDENTIFICADO</p>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            <span style={{ fontSize: 36, lineHeight: 1 }}>{visual.emoji}</span>
            <div>
              <p style={{ fontSize: 18, fontWeight: 800, color: "#111827", margin: 0 }}>{capturedContent.subjectName}</p>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                <span style={{ fontSize: 11, color: "#64748B" }}>📍 {capturedContent.topic}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <GraduationCap size={12} color="#2563EB" />
                <span style={{ fontSize: 12, color: "#2563EB", fontWeight: 700 }}>{capturedContent.title}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Captured image */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }} style={{ marginBottom: 12 }}>
          <CapturedPageVisual content={capturedContent} />
        </motion.div>

        {/* Content blocks */}
        <ContentBlocks content={capturedContent} variant="summary" />

        {/* Export content */}
        <ExportSection content={capturedContent} onToast={onToast} />

        {/* Planning */}
        <PlanningSection calendarEvent={calendarEvent} onPlanned={handlePlanned} onToast={onToast} />

        {/* Action buttons */}
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
          style={{ display: "flex", gap: 10, paddingBottom: 8 }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={handleSave} disabled={saving}
            style={{ flex: 1, height: 54, borderRadius: 16, background: saving ? "#14B8A6" : "linear-gradient(135deg,#2563EB,#7C3AED)", color: "white", fontFamily: "Inter,sans-serif", fontSize: 15, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 18px rgba(37,99,235,0.3)", transition: "background 0.35s" }}>
            {saving ? <><CheckCircle size={18} /> Salvando...</> : <><Bookmark size={18} /> Salvar</>}
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onLibrary}
            style={{ width: 54, height: 54, borderRadius: 16, background: "white", border: "1.5px solid #E2E8F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <BookMarked size={20} color="#2563EB" />
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
