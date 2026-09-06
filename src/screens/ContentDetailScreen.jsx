import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, CalendarClock, CreditCard, ListChecks, HelpCircle, ChevronRight, Trash2, Pencil, Check, X, RotateCcw } from "lucide-react";
import CapturedPageVisual from "../components/brand/CapturedPageVisual";
import ContentBlocks from "../components/study/ContentBlocks";
import PhotosSection from "../components/study/PhotosSection";
import NotesSection from "../components/study/NotesSection";
import ExportSection from "../components/study/ExportSection";
import CommitmentsSection from "../components/study/CommitmentsSection";
import ReviewPlanPicker from "../components/study/ReviewPlanPicker";
import SubjectPickerModal from "../components/study/SubjectPickerModal";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { useContentStore } from "../context/ContentStoreContext.jsx";
import {
  getReviewsForContent,
  nextPendingReview,
  isContentDueForReview,
  formatDue,
  reviewLabel,
  applyReviewPlan,
} from "../services/reviewService";
import { getEventsForContent, createEventEntry, updateEvent, unlinkContentFromEvent, deleteEvent } from "../services/eventService";
import { moveContentToSubject, deleteContent, updateNotes, updateContent } from "../services/contentService";
import { getContentPerformance } from "../services/performanceService";
import { getSubjectVisual, UNASSIGNED_SUBJECT_LABEL } from "../constants";

export default function ContentDetailScreen({ content, onBack, onDeleted, onFlashcards, onQuestions, onQuiz, onVisionPlus, onToast, onAddPhoto, onViewPhoto }) {
  const { mutate, subjects, contents, reviews: allReviews, events: allEvents } = useContentStore();
  const [subjectPickerOpen, setSubjectPickerOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(content.title);
  const visual = getSubjectVisual(content.subjectName);

  // Presas ao snapshot do store (não a `content`, que também muda a cada
  // mutação) para não recalcular a cada render sem necessidade — e nunca
  // disparam a IA, só leem dados já persistidos.
  const reviews = useMemo(() => getReviewsForContent(content.id), [content.id, allReviews]);
  const next = useMemo(() => nextPendingReview(content.id), [content.id, allReviews]);
  const due = useMemo(() => isContentDueForReview(content.id), [content.id, allReviews]);
  const doneCount = reviews.filter((r) => r.status !== "pending").length;

  const needsReview = content.mastery?.level === "needs_review";
  const performance = useMemo(() => getContentPerformance(content.id), [content.id, content.flashcards, content.quizzes]);

  // Um conteúdo pode ter N eventos; a seção de compromissos lista todos, não
  // só o mais recente.
  const events = useMemo(() => getEventsForContent(content.id), [content.id, allEvents]);

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

  const handleReviewPlanChange = (plan) => {
    if (plan === (content.reviewPlan || "none")) return;
    mutate(() => {
      updateContent(content.id, { reviewPlan: plan });
      // reschedule: a revisão de plano pendente pula para o novo período.
      applyReviewPlan(content.id, undefined, { reschedule: true });
    });
    onToast?.("✓ Plano de revisão atualizado");
  };

  const handleDeleteEvent = (event) => {
    try {
      mutate(() => deleteEvent(event.id));
      onToast?.("✓ Compromisso excluído");
    } catch {
      onToast?.("Não foi possível excluir o compromisso.");
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

  const handleStartEditTitle = () => {
    setTitleDraft(content.title);
    setEditingTitle(true);
  };

  const handleSaveTitle = () => {
    const trimmed = titleDraft.trim();
    if (!trimmed) {
      onToast?.("O título não pode ficar em branco.");
      return;
    }
    mutate(() => updateContent(content.id, { title: trimmed }));
    setEditingTitle(false);
  };

  const handleSaveSummary = (summary) => {
    mutate(() => updateContent(content.id, { summary }));
    onToast?.("✓ Resumo atualizado");
  };

  const handleSaveNotes = (notes) => {
    mutate(() => updateNotes(content.id, notes));
    onToast?.("✓ Nota salva");
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
            {editingTitle ? (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <input autoFocus value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveTitle(); if (e.key === "Escape") setEditingTitle(false); }}
                  style={{ flex: 1, minWidth: 0, fontSize: 18, fontWeight: 800, color: "#111827", border: "1.5px solid #2563EB", borderRadius: 8, padding: "4px 8px", fontFamily: "Inter,sans-serif", outline: "none" }} />
                <button onClick={handleSaveTitle} aria-label="Salvar título"
                  style={{ width: 32, height: 32, borderRadius: 8, background: "#2563EB", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Check size={15} color="white" />
                </button>
                <button onClick={() => setEditingTitle(false)} aria-label="Cancelar edição do título"
                  style={{ width: 32, height: 32, borderRadius: 8, background: "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <X size={15} color="#64748B" />
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <p style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{content.title}</p>
                <button onClick={handleStartEditTitle} aria-label="Editar título"
                  style={{ width: 28, height: 28, borderRadius: 8, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Pencil size={13} color="#94A3B8" />
                </button>
              </div>
            )}
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
          onSelectPhoto={(index) => onViewPhoto?.(content, index)}
        />

        {/* Aviso de reforço — só quando o desempenho real ficou baixo. */}
        {needsReview && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: "rgba(180,83,9,0.08)", borderRadius: 20, padding: "12px 16px", marginBottom: 12, border: "1px solid rgba(180,83,9,0.2)", display: "flex", alignItems: "center", gap: 10 }}>
            <RotateCcw size={18} color="#B45309" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: 13, fontWeight: 600, color: "#92400E", margin: 0, fontFamily: "Inter,sans-serif" }}>
              Você não foi tão bem aqui — vale reestudar este conteúdo.
            </p>
          </motion.div>
        )}

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
                {next.overdue
                  ? `Revisão atrasada · ${reviewLabel(next)}`
                  : due
                  ? `Revisão pendente hoje · ${reviewLabel(next)}`
                  : `Próxima revisão: ${reviewLabel(next)} · ${formatDue(next.scheduledFor)}`}
              </p>
              <p style={{ fontSize: 11, color: "#94A3B8", margin: "2px 0 0", fontFamily: "Inter,sans-serif" }}>{doneCount} {doneCount === 1 ? "revisão concluída" : "revisões concluídas"}</p>
            </div>
          </motion.div>
        )}

        <ReviewPlanPicker value={content.reviewPlan || "none"} onChange={handleReviewPlanChange} delay={0.1} />
        <div style={{ height: 12 }} />

        <ContentBlocks content={content} variant="detail" onSaveSummary={handleSaveSummary} />
        <NotesSection content={content} onSave={handleSaveNotes} />

        <ExportSection content={content} onToast={onToast} />
        <CommitmentsSection
          content={content}
          events={events}
          contents={contents}
          onCreate={handleCreateEvent}
          onEdit={handleEditEvent}
          onUnlink={handleUnlinkEvent}
          onDelete={handleDeleteEvent}
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
