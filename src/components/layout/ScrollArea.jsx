import { forwardRef } from "react";
import styles from "./ScrollArea.module.css";

const ScrollArea = forwardRef(function ScrollArea({ padding = "14px 20px 20px", flexColumn = false, children }, ref) {
  return (
    <div ref={ref} className={styles.scroll} style={{ padding, display: flexColumn ? "flex" : undefined, flexDirection: flexColumn ? "column" : undefined }}>
      {children}
    </div>
  );
});

export default ScrollArea;
