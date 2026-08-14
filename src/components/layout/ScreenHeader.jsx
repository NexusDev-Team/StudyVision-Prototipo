import styles from "./ScreenHeader.module.css";

// White header shell shared by every content screen. Content (logo/back button/
// title/subtitle) is left to the caller since it varies per screen.
export default function ScreenHeader({ paddingBottom = 14, children }) {
  return (
    <div className={styles.header} style={{ paddingBottom }}>
      {children}
    </div>
  );
}
