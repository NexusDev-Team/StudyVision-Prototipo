import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Star, Search, BookOpen } from "lucide-react";
import LogoSVG from "../components/brand/LogoSVG";
import ContentCard from "../components/study/ContentCard";
import SubjectFolderGrid from "../components/ui/SubjectFolderGrid";
import { useContentStore } from "../context/ContentStoreContext.jsx";
import { endOfTodayIso } from "../utils/date";
import { matchesQuery } from "../utils/search";
import { UNASSIGNED_SUBJECT_LABEL } from "../constants";

const ALL_FILTER_ID = "all";
const UNASSIGNED_FILTER_ID = "unassigned";

export default function LibraryScreen({ onOpenItem, onVisionPlus }) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState(ALL_FILTER_ID);
  const { contents, subjects, reviews, events } = useContentStore();

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

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F8FAFC", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ background: "white", padding: "52px 20px 14px", borderBottom: "1px solid #F1F5F9", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <LogoSVG size={22} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", letterSpacing: 0.5 }}>JOVI · STUDY VISION</span>
          </div>
          <motion.button whileTap={{ scale: 0.94 }} onClick={onVisionPlus}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 12px", borderRadius: 20, background: "linear-gradient(135deg,#2563EB,#7C3AED)", border: "none", cursor: "pointer" }}>
            <Star size={11} fill="white" color="white" />
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 700, color: "white" }}>Vision+</span>
          </motion.button>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 }}>Biblioteca</h1>
        <p style={{ fontSize: 13, color: "#64748B", margin: "2px 0 12px" }}>{filtered.length} conteúdo{filtered.length !== 1 ? "s" : ""} organizado{filtered.length !== 1 ? "s" : ""}</p>

        {/* Search */}
        <div style={{ position: "relative" }}>
          <Search size={15} color="#94A3B8" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar conteúdo..."
            style={{ width: "100%", height: 42, borderRadius: 12, paddingLeft: 38, paddingRight: 14, border: "1.5px solid #E2E8F0", background: "#F8FAFC", fontFamily: "Inter,sans-serif", fontSize: 14, color: "#111827", outline: "none", boxSizing: "border-box" }} />
        </div>

        {/* Filters */}
        <SubjectFolderGrid options={subjectFilters} activeId={activeFilter} onSelect={setActiveFilter} />
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px 24px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", paddingTop: 60, color: "#94A3B8" }}>
            <BookOpen size={40} style={{ margin: "0 auto 12px", display: "block" }} />
            {hasQuery ? (
              <p style={{ fontSize: 14, fontFamily: "Inter,sans-serif" }}>Nada encontrado para "{search.trim()}"</p>
            ) : contents.length === 0 ? (
              <>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#475569", fontFamily: "Inter,sans-serif", margin: "0 0 4px" }}>Você ainda não possui conteúdos</p>
                <p style={{ fontSize: 13, fontFamily: "Inter,sans-serif" }}>Capture uma matéria ou adicione seu primeiro conteúdo para começar.</p>
              </>
            ) : (
              <p style={{ fontSize: 14, fontFamily: "Inter,sans-serif" }}>Nenhum conteúdo nesta matéria ainda</p>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((content, i) => (
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
    </div>
  );
}
