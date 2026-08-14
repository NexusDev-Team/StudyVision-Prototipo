import { motion } from "framer-motion";
import styles from "./Card.module.css";

// White rounded card used across every screen. Pass framer-motion props
// (initial/animate/exit/transition) to animate it in; pass `style` to override
// background/border for stateful variants (e.g. the "due today" red card).
export default function Card({ children, style, className, ...motionProps }) {
  return (
    <motion.div className={className ? `${styles.card} ${className}` : styles.card} style={style} {...motionProps}>
      {children}
    </motion.div>
  );
}
