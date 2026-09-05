import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, CalendarClock, CreditCard, ListChecks, HelpCircle, ChevronRight, Trash2 } from "lucide-react";
import CapturedPageVisual from "../components/brand/CapturedPageVisual";
import ContentBlocks from "../components/study/ContentBlocks";
import PhotosSection from "../components/study/PhotosSection";
import ExportSection from "../components/study/ExportSection";
import CommitmentsSection from "../components/study/CommitmentsSection";
import SubjectPickerModal from "../components/study/SubjectPickerModal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { useContentStore } from "../context/ContentStoreContext.jsx";
import {
  getReviewsForContent,
  nextPendingReview,
  isContentDueForReview,
  formatDue,
  reviewReasonLabel,
} from "../services/reviewService";
import { getEventsForContent, createEventEntry, updateEvent, unlinkContentFromEvent } from "../services/eventService";
import { moveContentToSubject, deleteContent, removeImageFromContent } from "../services/contentService";
import { getContentPerformance } from "../services/performanceService";
import { getSubjectVisual, getMasteryMeta, UNASSIGNED_SUBJECT_LABEL } from "../constants";

export default function ContentDetailScreen({ content, onBack, onDeleted, onFlashcards, onQuestions, onQuiz, onVisionPlus, onToast, onAddPhoto, onViewPhoto }) {
  const { mutate, subjects, contents } = useContentStore();
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const visual = getSubjectVisual(content.subjectName);

  const reviews = getReviewsForContent(content.id);
  const next = nextPendingReview(content.id);
  const due = isContentDueForReview(content.id);
  const doneCount = reviews.filter((r) => r.status !== "pending").length;

  const mastery = getMasteryMeta(content.mastery?.level);
  const masteryScore = content.mastery?.score ?? 0;
  const hasMastery = (content.mastery?.level || "not_started") !== "not_started";
  const performance = getContentPerformance(content.id);

  // Um conteúdo pode ter N eventos; a seção de compromissos lista todos, não
  // só o mais recente.
  const events = getEventsForContent(content.id);

  const handleCreateEvent = async (payload) => {
    try {
      mutate(() => createEventEntry(payload));
      onToast?.("✓ Compromisso criado");
    } catch (err) {
      onToast?.(err.message || "Não foi possível criar o compromisso.");
    }
  };

  const handleEditEvent = async (eventId, payload) => {
    try {
      mutate(() => updateEvent(eventId, payload));
      onToast?.("✓ Compromisso atualizado");
    } catch (err) {
      onToast?.(err.message || "Não foi possível salvar as alterações.");
    }
  };

  const handleUnlinkEvent = (event) => {
    try {
      mutate(() => unlinkContentFromEvent(event.id, content.id));
      onToast?.("✓ Compromisso desvinculado");
    } catch {
      onToast?.("Não foi possível desvincular o compromisso.");
    }
  };

  const handleSubjectSelect = (subjectId, subjectName) => {
    try {
      mutate(() => moveContentToSubject(content.id, subjectId, subjectName));
    } catch {
      onToast?.("Não foi possível atualizar a matéria.");
      return;
    }
    setSubjectPickerOpen(false);
    onToast?.("✓ Matéria atualizada");
  };

  const handleRemovePhoto = (imageId) => {
    mutate(() => removeImageFromContent(content.id, imageId));
    onToast?.("✓ Foto removida");
  };

  const handleDelete = () => {
    try {
      mutate(() => deleteContent(content.id));
    } catch {
      onToast?.("Não foi possível excluir o conteúdo.");
      setConfirmDeleteOpen(false);
      return;
    }
    setConfirmDeleteOpen(false);
    onToast?.("✓ Conteúdo excluído");
    onDeleted?.();
  };

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F8FAFC", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "white", padding: "52px 20px 14px", borderBottom: "1px solid #F1F5F9", flexShrink: 0 }}>
        <button onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: 12 }}>
          <ChevronLeft size={20} color="#2563EB" />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#2563EB", fontFamily: "Inter,sans-serif" }}>Biblioteca</span>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: visual.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, flexShrink: 0 }}>
            {visual.emoji}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0 }}>{content.title}</p>
            <button onClick={() => setSubjectPickerOpen(true)}
              style={{ display: "flex", alignItems: "center", gap: 2, background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: 2 }}>
              <span style={{ fontSize: 13, color: "#64748B" }}>{content.subjectName || UNASSIGNED_SUBJECT_LABEL} · {content.topic}</span>
              <ChevronRight size={13} color="#94A3B8" />
            </button>
          </div>
        </div>
      </div>

      {/* Scroll */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 20px" }}>
        {/* Captured image */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 12 }}>
          <CapturedPageVisual content={content} height={120} />
        </motion.div>

        <PhotosSection
          content={content}
          onAddPhoto={onAddPhoto}
          onRemovePhoto={handleRemovePhoto}
          onSelectPhoto={(index) => onViewPhoto?.(content, index)}
        />

        {/* Domínio */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: "white", borderRadius: 20, padding: "12px 16px", marginBottom: 12, boxShadow: "0 1px 8px rgba(0,0,0,0.05)", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: 1.2, margin: 0 }}>DOMÍNIO</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: "#111827", margin: "3px 0 0", fontFamily: "Inter,sans-serif" }}>
              {hasMastery ? `${masteryScore}% · ${mastery.label}` : "Ainda sem tentativas"}
            </p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: mastery.color, background: mastery.bg, borderRadius: 8, padding: "4px 10px" }}>{mastery.label}</span>
        </motion.div>

        {/* Desempenho */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: "white", borderRadius: 20, padding: "12px 16px", marginBottom: 12, boxShadow: "0 1px 8px rgba(0,0,0,0.05)", border: "1px solid #E2E8F0" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8", letterSpacing: 1.2, margin: "0 0 8px" }}>DESEMPENHO</p>
          {!performance.hasActivity ? (
            <p style={{ fontSize: 12, color: "#94A3B8", margin: 0, fontFamily: "Inter,sans-serif" }}>Ainda não há dados suficientes.</p>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
              <div style={{ textAlign: "center", flex: 1 }}>
                <p style={{ fontSize: 16, fontWeight: 800, color: "#111827", margin: 0 }}>{performance.quiz.accuracyRate != null ? `${performance.quiz.accuracyRate}%` : "—"}</p>
                <p style={{ fontSize: 10, color: "#94A3B8", margin: "2px 0 0" }}>Quiz</p>
              </div>
              <div style={{ textAlign: "center", flex: 1, borderLeft: "1px solid #F1F5F9", borderRight: "1px solid #F1F5F9" }}>
                <p style={{ fontSize: 16, fontWeight: 800, color: "#111827", margin: 0 }}>{performance.flashcards.accuracyRate != null ? `${performance.flashcards.accuracyRate}%` : "—"}</p>
                <p style={{ fontSize: 10, color: "#94A3B8", margin: "2px 0 0" }}>Flashcards</p>
              </div>
              <div style={{ textAlign: "center", flex: 1 }}>
                <p style={{ fontSize: 16, fontWeight: 800, color: "#111827", margin: 0 }}>{performance.overall != null ? `${performance.overall}%` : "—"}</p>
                <p style={{ fontSize: 10, color: "#94A3B8", margin: "2px 0 0" }}>Geral</p>
              </div>
            </div>
          )}
        </motion.div>

        {/* Review status */}
        {next && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: due ? "#FEF2F2" : "white", borderRadius: 20, padding: "14px 18px", marginBottom: 12, boxShadow: "0 1px 8px rgba(0,0,0,0.05)", border: `1px solid ${due ? "#FECACA" : "#E2E8F0"}`, display: "flex", alignItems: "center", gap: 10 }}>
            <CalendarClock size={18} color={due ? "#DC2626" : "#64748B"} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: due ? "#DC2626" : "#111827", margin: 0, fontFamily: "Inter,sans-serif" }}>
                {due ? "Revisão pendente hoje" : `Próxima revisão: ${reviewReasonLabel(next.reason)} · ${formatDue(next.scheduledFor)}`}
              </p>
              <p style={{ fontSize: 11, color: "#94A3B8", margin: "2px 0 0", fontFamily: "Inter,sans-serif" }}>{doneCount} {doneCount === 1 ? "revisão concluída" : "revisões concluídas"}</p>
            </div>
          </motion.div>
        )}

        <ContentBlocks content={content} variant="detail" />

        <ExportSection content={content} onToast={onToast} />
        <CommitmentsSection
          content={content}
          events={events}
          contents={contents}
          onCreate={handleCreateEvent}
          onEdit={handleEditEvent}
          onUnlink={handleUnlinkEvent}
        />

        {/* Action buttons */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.32 }}
          style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 4, paddingBottom: 8 }}>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onFlashcards}
            style={{ flex: "1 1 100px", height: 52, borderRadius: 16, background: "white", border: "1.5px solid #E2E8F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <CreditCard size={17} color="#7C3AED" />
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#7C3AED" }}>Flashcards</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onQuiz}
            style={{ flex: "1 1 100px", height: 52, borderRadius: 16, background: "white", border: "1.5px solid #E2E8F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <ListChecks size={17} color="#EA580C" />
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#EA580C" }}>Quiz</span>
          </motion.button>
          <motion.button whileTap={{ scale: 0.95 }} onClick={onQuestions}
            style={{ flex: "1 1 100px", height: 52, borderRadius: 16, background: "white", border: "1.5px solid #E2E8F0", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <HelpCircle size={17} color="#2563EB" />
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#2563EB" }}>Perguntas</span>
          </motion.button>
        </motion.div>

        {/* Excluir conteúdo */}
        <motion.button whileTap={{ scale: 0.97 }} onClick={() => setConfirmDeleteOpen(true)}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%", height: 46, borderRadius: 14, background: "none", border: "1.5px dashed #FCA5A5", cursor: "pointer", marginTop: 4, marginBottom: 8 }}>
          <Trash2 size={15} color="#DC2626" />
          <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#DC2626" }}>Excluir conteúdo</span>
        </motion.button>
      </div>

      <AnimatePresence>
        {subjectPickerOpen && (
          <SubjectPickerModal
            subjects={subjects}
            currentSubjectId={content.subjectId}
            onSelect={handleSubjectSelect}
            onClose={() => setSubjectPickerOpen(false)}
            mutate={mutate}
          />
        )}
        {confirmDeleteOpen && (
          <ConfirmDialog
            title="Excluir este conteúdo?"
            description={`Fotos, flashcards, quizzes, tentativas e revisões de "${content.title}" serão apagados junto. Compromissos do calendário vinculados a outros conteúdos não são afetados; se este for o único conteúdo vinculado, o compromisso também será removido.`}
            confirmLabel="Excluir conteúdo"
            onConfirm={handleDelete}
            onCancel={() => setConfirmDeleteOpen(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
