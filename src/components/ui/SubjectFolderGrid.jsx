import { LayoutGrid, Calculator, Landmark, FlaskConical, Atom, BookA, Code2 } from "lucide-react";
import { motion } from "framer-motion";
import { SUBJECT_META } from "../../constants";
import styles from "./SubjectFolderGrid.module.css";

const ICONS = { LayoutGrid, Calculator, Landmark, FlaskConical, Atom, BookA, Code2 };

export default function SubjectFolderGrid({ options, active, onSelect }) {
  return (
    <div className={styles.row}>
      {options.map(opt => {
        const meta = SUBJECT_META[opt] || SUBJECT_META.Todos;
        const Icon = ICONS[meta.icon];
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
  );
}
