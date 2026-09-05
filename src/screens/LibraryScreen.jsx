import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Search, BookOpen, ArrowUpDown, Check } from "lucide-react";
import LogoSVG from "../components/brand/LogoSVG";
import ContentCard from "../components/study/ContentCard";
import SubjectFolderGrid from "../components/ui/SubjectFolderGrid";
import SubjectManagerModal from "../components/study/SubjectManagerModal";
import EmptyState from "../components/ui/EmptyState";
import { useContentStore } from "../context/ContentStoreContext.jsx";
import { endOfTodayIso } from "../utils/date";
import { matchesQuery } from "../utils/search";
import { UNASSIGNED_SUBJECT_LABEL } from "../constants";

const ALL_FILTER_ID = "all";
const UNASSIGNED_FILTER_ID = "unassigned";

const SORT_OPTIONS = ["Mais recentes", "Mais antigos", "Nome"];

// `initialSubjectId` (opcional) abre a tela já filtrada por uma matéria —
// usado pelo drill-down da tela de Evolução.
export default function LibraryScreen({ onOpenItem, onVisionPlus, onToast, initialSubjectId }) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState(initialSubjectId || ALL_FILTER_ID);
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const { contents, subjects, reviews, events, mutate } = useContentStore();

  // Revisão pendente (para o selo "Revisar hoje") e próximo evento, indexados
  // por conteúdo — derivados uma vez do estado do store.
  const { dueByContent, eventByContent } = useMemo(() => {
    const endOfToday = new Date(endOfTodayIso()).getTime();
    const due = new Set(
      reviews
        .filter((r) => r.status === "pending" && new Date(r.scheduledFor).getTime() <= endOfToday)
        .map((r) => r.contentId)
    );
    const evt = new Map();
    for (const e of events) {
      for (const cid of e.contentIds) {
        if (!evt.has(cid)) evt.set(cid, e);
      }
    }
    return { dueByContent: due, eventByContent: evt };
  }, [reviews, events]);

  // Filtros por matéria a partir das matérias reais cadastradas — não do texto
  // livre em cada conteúdo — mais o bucket "Sem matéria" para os que ainda não
  // foram organizados (subjectId === null). Contagem por opção ajuda a achar
  // rápido onde estão os conteúdos.
  const subjectFilters = useMemo(() => {
    const unassignedCount = contents.filter((c) => !c.subjectId).length;
    const bySubject = subjects.map((s) => ({
      id: s.id,
      label: s.name,
      count: contents.filter((c) => c.subjectId === s.id).length,
    }));
    const options = [{ id: ALL_FILTER_ID, label: "Todos", count: contents.length }, ...bySubject];
    if (unassignedCount > 0) {
      options.push({ id: UNASSIGNED_FILTER_ID, label: UNASSIGNED_SUBJECT_LABEL, count: unassignedCount });
    }
    return options;
  }, [contents, subjects]);

  const filtered = contents.filter((c) => {
    const matchSearch = matchesQuery(c, search);
    const matchFilter =
      activeFilter === ALL_FILTER_ID ||
      (activeFilter === UNASSIGNED_FILTER_ID ? !c.subjectId : c.subjectId === activeFilter);
    return matchSearch && matchFilter;
  });
  const hasQuery = search.trim().length > 0;

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "Nome") return (a.title || "").localeCompare(b.title || "", "pt-BR");
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sortBy === "Mais antigos" ? diff : -diff;
  });

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F8FAFC", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "white", padding: "52px 20px 14px", borderBottom: "1px solid #F1F5F9", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <LogoSVG size={22} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", letterSpacing: 0.5 }}>JOVI · STUDY VISION</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>
            <button onClick={() => setSortMenuOpen((v) => !v)} aria-label="Ordenar" aria-haspopup="true" aria-expanded={sortMenuOpen}
              style={{ width: 30, height: 30, borderRadius: 10, background: sortMenuOpen ? "#E2E8F0" : "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ArrowUpDown size={15} color="#475569" />
            </button>
            {sortMenuOpen && (
              <>
                <div onClick={() => setSortMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                <div role="menu" style={{
                  position: "absolute", top: 36, right: 0, zIndex: 41, minWidth: 150,
                  background: "white", borderRadius: 12, border: "1px solid #E2E8F0",
                  boxShadow: "0 8px 24px rgba(15,23,42,0.12)", padding: 6,
                }}>
                  {SORT_OPTIONS.map((opt) => {
                    const isActive = sortBy === opt;
                    return (
                      <button key={opt} role="menuitemradio" aria-checked={isActive}
                        onClick={() => { setSortBy(opt); setSortMenuOpen(false); }}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
                          width: "100%", minHeight: 38, padding: "0 10px", borderRadius: 8, border: "none",
                          background: isActive ? "#F1F5F9" : "transparent", cursor: "pointer",
                          fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600,
                          color: isActive ? "#111827" : "#475569", textAlign: "left",
                        }}>
                        {opt}
                        {isActive && <Check size={14} color="#2563EB" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            <motion.button whileTap={{ scale: 0.94 }} onClick={onVisionPlus}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 20, background: "linear-gradient(135deg,#2563EB,#7C3AED)", border: "none", cursor: "pointer" }}>
              <Star size={11} fill="white" color="white" />
              <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 700, color: "white" }}>Vision+</span>
            </motion.button>
          </div>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 }}>Biblioteca</h1>
        <p style={{ fontSize: 13, color: "#64748B", margin: "2px 0 12px" }}>{sorted.length} conteúdo{sorted.length !== 1 ? "s" : ""} organizado{sorted.length !== 1 ? "s" : ""}</p>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <label htmlFor="library-search" style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>Buscar conteúdo na biblioteca</label>
          <Search size={15} color="#94A3B8" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
          <input id="library-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar conteúdo..."
            style={{ width: "100%", height: 42, borderRadius: 12, paddingLeft: 38, paddingRight: 14, border: "1.5px solid #E2E8F0", background: "#F8FAFC", fontFamily: "Inter,sans-serif", fontSize: 14, color: "#111827", outline: "none", boxSizing: "border-box" }} />
        </div>

        {/* Filters */}
        <SubjectFolderGrid options={subjectFilters} activeId={activeFilter} onSelect={setActiveFilter} onAdd={() => setManageOpen(true)} />
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 24px" }}>
        {sorted.length === 0 ? (
          hasQuery ? (
            <EmptyState icon={<BookOpen size={40} style={{ margin: "0 auto 12px", display: "block", color: "#94A3B8" }} />} message={`Nada encontrado para "${search.trim()}"`} />
          ) : contents.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={40} style={{ margin: "0 auto 12px", display: "block", color: "#94A3B8" }} />}
              title="Você ainda não possui conteúdos"
              description="Capture uma matéria ou adicione seu primeiro conteúdo para começar."
            />
          ) : (
            <EmptyState icon={<BookOpen size={40} style={{ margin: "0 auto 12px", display: "block", color: "#94A3B8" }} />} message="Nenhum conteúdo nesta matéria ainda" />
          )
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sorted.map((content, i) => (
              <ContentCard
                key={content.id}
                content={content}
                index={i}
                isDue={dueByContent.has(content.id)}
                nextEvent={eventByContent.get(content.id) || null}
                onClick={() => onOpenItem(content)}
              />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {manageOpen && (
          <SubjectManagerModal
            subjects={subjects}
            contents={contents}
            mutate={mutate}
            onClose={() => setManageOpen(false)}
            onToast={onToast}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
