import styles from "./FilterPills.module.css";

// Selectable pill row used by the Library subject filters and the Planning
// type picker — same shape, different active/inactive colors and layout mode.
export default function FilterPills({
  options, active, onSelect, layout = "scroll",
  padding = "5px 14px",
  activeBg = "#2563EB", activeColor = "white",
  inactiveBg = "white", inactiveColor = "#64748B", inactiveBorder = "1.5px solid #E2E8F0",
  style,
}) {
  return (
    <div className={`${styles.row} ${layout === "scroll" ? styles.scroll : styles.wrap}`} style={style}>
      {options.map(opt => {
        const isActive = active === opt;
        return (
          <button key={opt} className={styles.pill} onClick={() => onSelect(opt)}
            style={{
              padding,
              background: isActive ? activeBg : inactiveBg,
              color: isActive ? activeColor : inactiveColor,
              border: isActive ? "none" : inactiveBorder,
            }}>
            {opt}
          </button>
        );
      })}
    </div>
  );
}
