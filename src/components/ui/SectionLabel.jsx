import styles from "./SectionLabel.module.css";

export default function SectionLabel({ children, style }) {
  return <p className={styles.label} style={style}>{children}</p>;
}
