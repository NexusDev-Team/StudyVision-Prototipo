import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, BookOpen, ArrowUpDown, Check } from "lucide-react";
import VisionPlusButton from "../components/plus/VisionPlusButton";
import LogoSVG from "../components/brand/LogoSVG";
import ContentCard from "../components/study/ContentCard";
import SubjectFolderGrid from "../components/ui/SubjectFolderGrid";
import SubjectManagerModal from "../components/study/SubjectManagerModal";
import EmptyState from "../components/ui/EmptyState";
import { useContentStore } from "../context/ContentStoreContext.jsx";
import { endOfTodayIso, startOfTodayIso } from "../utils/date";
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
  const { dueByContent, overdueByContent, eventByContent } = useMemo(() => {
    const endOfToday = new Date(endOfTodayIso()).getTime();
    const startOfToday = new Date(startOfTodayIso()).getTime();
    const due = new Set(
      reviews
        .filter((r) => r.status === "pending" && new Date(r.scheduledFor).getTime() <= endOfToday)
        .map((r) => r.contentId)
    );
    const overdue = new Set(
      reviews
        .filter((r) => r.status === "pending" && new Date(r.scheduledFor).getTime() < startOfToday)
        .map((r) => r.contentId)
    );
    const evt = new Map();
    for (const e of events) {
      for (const cid of e.contentIds) {
        if (!evt.has(cid)) evt.set(cid, e);
      }
    }
    return { dueByContent: due, overdueByContent: overdue, eventByContent: evt };
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
    <div className="flex h-full w-full flex-col overflow-hidden bg-sv-bg font-sans">
      {/* Header */}
      <div className="shrink-0 border-b border-sv-line-soft bg-white px-5 pt-7 pb-3.5">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-[7px]">
            <LogoSVG size={22} />
            <span className="text-[11px] font-bold tracking-[0.5px] text-sv-blue">JOVI · STUDY VISION</span>
          </div>
          <div className="relative flex items-center gap-2">
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
            <VisionPlusButton onClick={onVisionPlus} />
          </div>
        </div>
        <h1 className="m-0 text-2xl font-extrabold text-sv-ink">Biblioteca</h1>
        <p className="mt-0.5 mb-3 text-[13px] text-sv-muted">{sorted.length} conteúdo{sorted.length !== 1 ? "s" : ""} organizado{sorted.length !== 1 ? "s" : ""}</p>

        {/* Search */}
        <div className="relative">
          <label htmlFor="library-search" className="sr-only">Buscar conteúdo na biblioteca</label>
          <Search size={15} color="#94A3B8" className="absolute top-1/2 left-[13px] -translate-y-1/2" />
          <input id="library-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar conteúdo..."
            className="box-border h-[42px] w-full rounded-sv-md border-[1.5px] border-solid border-sv-line bg-sv-bg pr-3.5 pl-[38px] font-sans text-sm text-sv-ink outline-none" />
        </div>

        {/* Filters */}
        <SubjectFolderGrid options={subjectFilters} activeId={activeFilter} onSelect={setActiveFilter} onAdd={() => setManageOpen(true)} />
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-5 pt-3.5 pb-6">
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
          <div className="flex flex-col gap-2.5 md:grid md:grid-cols-2">
            {sorted.map((content, i) => (
              <ContentCard
                key={content.id}
                content={content}
                index={i}
                isDue={dueByContent.has(content.id)}
                isOverdue={overdueByContent.has(content.id)}
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
