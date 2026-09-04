import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, Search, BookOpen, FolderCog } from "lucide-react";
import LogoSVG from "../components/brand/LogoSVG";
import ContentCard from "../components/study/ContentCard";
import SubjectFolderGrid from "../components/ui/SubjectFolderGrid";
import FilterPills from "../components/ui/FilterPills";
import SubjectManagerModal from "../components/study/SubjectManagerModal";
import EmptyState from "../components/ui/EmptyState";
import { useContentStore } from "../context/ContentStoreContext.jsx";
import { endOfTodayIso } from "../utils/date";
import { matchesQuery } from "../utils/search";
import { UNASSIGNED_SUBJECT_LABEL, MASTERY_META } from "../constants";

const ALL_FILTER_ID = "all";
const UNASSIGNED_FILTER_ID = "unassigned";

const SORT_OPTIONS = ["Mais recentes", "Mais antigos", "Nome"];
const MASTERY_FILTER_OPTIONS = [
  "Todos",
  MASTERY_META.mastered.label,
  MASTERY_META.developing.label,
  MASTERY_META.needs_review.label,
  MASTERY_META.not_started.label,
];
const MASTERY_LABEL_TO_LEVEL = Object.fromEntries(
  Object.entries(MASTERY_META).map(([level, meta]) => [meta.label, level])
);

export default function LibraryScreen({ onOpenItem, onVisionPlus, onToast }) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState(ALL_FILTER_ID);
  const [sortBy, setSortBy] = useState(SORT_OPTIONS[0]);
  const [masteryFilter, setMasteryFilter] = useState(MASTERY_FILTER_OPTIONS[0]);
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
    const matchMastery =
      masteryFilter === "Todos" || (c.mastery?.level || "not_started") === MASTERY_LABEL_TO_LEVEL[masteryFilter];
    return matchSearch && matchFilter && matchMastery;
  });
  const hasQuery = search.trim().length > 0;
  const hasNarrowingFilter = hasQuery || masteryFilter !== "Todos";

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
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button onClick={() => setManageOpen(true)} aria-label="Gerenciar matérias"
              style={{ width: 30, height: 30, borderRadius: 10, background: "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <FolderCog size={15} color="#475569" />
            </button>
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
        <SubjectFolderGrid options={subjectFilters} activeId={activeFilter} onSelect={setActiveFilter} />

        {/* Ordenação e domínio */}
        <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
          <FilterPills options={SORT_OPTIONS} active={sortBy} onSelect={setSortBy}
            padding="5px 12px" activeBg="#111827" activeColor="white" inactiveColor="#64748B" />
          <FilterPills options={MASTERY_FILTER_OPTIONS} active={masteryFilter} onSelect={setMasteryFilter}
            padding="5px 12px" activeBg="#7C3AED" activeColor="white" inactiveColor="#64748B" />
        </div>
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
          ) : hasNarrowingFilter ? (
            <EmptyState icon={<BookOpen size={40} style={{ margin: "0 auto 12px", display: "block", color: "#94A3B8" }} />} message="Nenhum conteúdo corresponde aos filtros" />
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
