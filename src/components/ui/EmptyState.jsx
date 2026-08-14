import styles from "./EmptyState.module.css";

export default function EmptyState({ icon, message, paddingTop = 60 }) {
  return (
    <div className={styles.wrap} style={{ paddingTop }}>
      {icon}
      <p className={styles.text}>{message}</p>
    </div>
  );
}
