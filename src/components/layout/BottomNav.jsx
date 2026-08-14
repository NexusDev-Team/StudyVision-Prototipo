import { motion } from "framer-motion";
import { Camera, BookMarked, CalendarClock, Star } from "lucide-react";
import styles from "./BottomNav.module.css";

const NAV_ITEMS = [
  { id: "camera", icon: <Camera size={22} />, label: "Câmera" },
  { id: "library", icon: <BookMarked size={22} />, label: "Biblioteca" },
  { id: "review", icon: <CalendarClock size={22} />, label: "Revisão" },
  { id: "visionplus", icon: <Star size={22} />, label: "Vision+" },
];

export default function BottomNav({ active, onGo, dueCount = 0 }) {
  return (
    <div className={styles.nav}>
      {NAV_ITEMS.map(item => {
        const isActive = active === item.id;
        return (
          <button key={item.id} className={styles.item} onClick={() => onGo(item.id)}>
            <div className={styles.iconWrap}>
              <motion.span animate={{ color: isActive ? "#2563EB" : "#94A3B8" }} transition={{ duration: 0.2 }}>
                {item.icon}
              </motion.span>
              {item.id === "review" && dueCount > 0 && (
                <span className={styles.badge}>{dueCount}</span>
              )}
            </div>
            <span className={styles.label} style={{ color: isActive ? "#2563EB" : "#94A3B8" }}>{item.label}</span>
            {isActive && <motion.div layoutId="navdot" className={styles.dot} />}
          </button>
        );
      })}
    </div>
  );
}
