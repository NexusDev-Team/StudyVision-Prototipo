import { useEffect, useRef, useState, useCallback } from "react";
import {
  LayoutGrid, Calculator, Landmark, FlaskConical, Atom, BookA, Code2, ChevronLeft, ChevronRight,
  Leaf, Globe2, BrainCircuit, Users, Languages, Palette, PenLine, BookOpen,
} from "lucide-react";
import { motion } from "framer-motion";
import { getSubjectMeta } from "../../constants";
import styles from "./SubjectFolderGrid.module.css";

const ICONS = {
  LayoutGrid, Calculator, Landmark, FlaskConical, Atom, BookA, Code2,
  Leaf, Globe2, BrainCircuit, Users, Languages, Palette, PenLine, BookOpen,
};
const SCROLL_EDGE_SLACK = 4;

export default function SubjectFolderGrid({ options, active, onSelect }) {
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
          const meta = getSubjectMeta(opt);
          const Icon = ICONS[meta.icon] || BookOpen;
          const isActive = active === opt;
          return (
            <motion.button key={opt} className={styles.folder} whileTap={{ scale: 0.95 }} onClick={() => onSelect(opt)}
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
              }}>{opt}</span>
            </motion.button>
          );
        })}
      </div>

      <motion.button animate={{ opacity: canScrollRight ? 1 : 0 }} transition={{ duration: 0.15 }}
        whileTap={canScrollRight ? { scale: 0.9 } : undefined} onClick={() => scrollBy(1)} aria-label="Ver mais matérias"
        className={styles.navBtn} style={{ pointerEvents: canScrollRight ? "auto" : "none" }}>
        <ChevronRight size={15} strokeWidth={2.75} color="#475569" />
      </motion.button>
    </div>
  );
}
