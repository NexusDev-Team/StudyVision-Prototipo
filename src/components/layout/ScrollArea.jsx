import styles from "./ScrollArea.module.css";

export default function ScrollArea({ padding = "14px 20px 20px", flexColumn = false, children }) {
  return (
    <div className={styles.scroll} style={{ padding, display: flexColumn ? "flex" : undefined, flexDirection: flexColumn ? "column" : undefined }}>
      {children}
    </div>
  );
}
