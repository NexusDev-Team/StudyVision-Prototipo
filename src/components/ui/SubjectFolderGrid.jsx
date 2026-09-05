import { useEffect, useRef, useState, useCallback } from "react";
import {
  LayoutGrid, Calculator, Landmark, FlaskConical, Atom, BookA, Code2, ChevronLeft, ChevronRight,
  Leaf, Globe2, BrainCircuit, Users, Languages, Palette, PenLine, BookOpen, FolderOpen, Plus,
} from "lucide-react";
import { motion } from "framer-motion";
import { getSubjectMeta } from "../../constants";
import styles from "./SubjectFolderGrid.module.css";

const ICONS = {
  LayoutGrid, Calculator, Landmark, FlaskConical, Atom, BookA, Code2,
  Leaf, Globe2, BrainCircuit, Users, Languages, Palette, PenLine, BookOpen, FolderOpen,
};
const SCROLL_EDGE_SLACK = 4;

// options: [{ id, label, count }]. id é o valor comparado/enviado ao selecionar
// ("all" e "unassigned" são ids especiais para "Todos" e "Sem matéria"); label
// decide o ícone/cor via getSubjectMeta (mesma matéria = mesma cor sempre).
// `onAdd` (opcional): quando presente, acrescenta ao fim da fileira uma pasta
// "+" semi-transparente para criar/gerenciar matérias — substitui o antigo
// ícone de "gerenciar matérias" isolado no header.
export default function SubjectFolderGrid({ options, activeId, onSelect, onAdd }) {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > SCROLL_EDGE_SLACK);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - SCROLL_EDGE_SLACK);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [updateScrollState, options]);

  const scrollBy = (dir) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: "smooth" });
  };

  return (
    <div className={styles.wrap}>
      <motion.button animate={{ opacity: canScrollLeft ? 1 : 0 }} transition={{ duration: 0.15 }}
        whileTap={canScrollLeft ? { scale: 0.9 } : undefined} onClick={() => scrollBy(-1)} aria-label="Ver matérias anteriores"
        className={styles.navBtn} style={{ pointerEvents: canScrollLeft ? "auto" : "none" }}>
        <ChevronLeft size={15} strokeWidth={2.75} color="#475569" />
      </motion.button>

      <div ref={scrollRef} className={styles.row}>
        {options.map(opt => {
          const meta = getSubjectMeta(opt.label);
          const Icon = ICONS[meta.icon] || BookOpen;
          const isActive = activeId === opt.id;
          return (
            <motion.button key={opt.id} className={styles.folder} whileTap={{ scale: 0.95 }} onClick={() => onSelect(opt.id)}
              aria-pressed={isActive}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 4, width: 72, height: 64, borderRadius: 14, cursor: "pointer",
                position: "relative",
                background: isActive ? meta.color : meta.bg,
                border: isActive ? `1.5px solid ${meta.color}` : `1.5px solid ${meta.bg}`,
                boxShadow: isActive ? `0 4px 10px ${meta.color}40` : "none",
              }}>
              <span style={{
                position: "absolute", top: -6, left: 10, width: 22, height: 8, borderRadius: "6px 6px 0 0",
                background: isActive ? meta.color : meta.bg,
              }} />
              <Icon size={18} color={isActive ? "white" : meta.color} />
              <span style={{
                fontFamily: "Inter,sans-serif", fontSize: 10.5, fontWeight: 700,
                color: isActive ? "white" : meta.color,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 64,
              }}>{opt.label}{typeof opt.count === "number" ? ` (${opt.count})` : ""}</span>
            </motion.button>
          );
        })}
        {onAdd && (
          <motion.button className={styles.folder} whileTap={{ scale: 0.95 }} onClick={onAdd}
            aria-label="Gerenciar matéria"
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 4, width: 72, height: 64, borderRadius: 14, cursor: "pointer",
              background: "rgba(100,116,139,0.08)", border: "1.5px dashed rgba(100,116,139,0.35)",
              opacity: 0.7,
            }}>
            <Plus size={16} color="#64748B" />
            <span style={{
              fontFamily: "Inter,sans-serif", fontSize: 9, fontWeight: 700, color: "#64748B",
              whiteSpace: "normal", lineHeight: 1.2, textAlign: "center", maxWidth: 62,
            }}>Gerenciar<br />Matéria</span>
          </motion.button>
        )}
      </div>

      <motion.button animate={{ opacity: canScrollRight ? 1 : 0 }} transition={{ duration: 0.15 }}
        whileTap={canScrollRight ? { scale: 0.9 } : undefined} onClick={() => scrollBy(1)} aria-label="Ver mais matérias"
        className={styles.navBtn} style={{ pointerEvents: canScrollRight ? "auto" : "none" }}>
        <ChevronRight size={15} strokeWidth={2.75} color="#475569" />
      </motion.button>
    </div>
  );
}
