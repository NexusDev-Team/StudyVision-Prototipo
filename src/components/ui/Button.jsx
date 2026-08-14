import { motion } from "framer-motion";
import styles from "./Button.module.css";

// variant: "primary" (gradient CTA) | "outline" (white bordered) | "ghost" (bare)
export default function Button({
  variant = "primary", children, style, onClick, disabled, whileTap = { scale: 0.95 },
  ...rest
}) {
  return (
    <motion.button
      whileTap={whileTap}
      onClick={onClick}
      disabled={disabled}
      className={`${styles.btn} ${styles[variant]}`}
      style={style}
      {...rest}
    >
      {children}
    </motion.button>
  );
}
