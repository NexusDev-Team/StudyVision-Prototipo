import styles from "./Screen.module.css";

// Shell shared by every non-fullscreen-media screen: column layout, hidden overflow.
// `background` overrides the default light background for dark screens (Vision+).
export default function Screen({ background, children }) {
  return (
    <div className={styles.screen} style={background ? { background } : undefined}>
      {children}
    </div>
  );
}
