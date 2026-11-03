import { motion } from "framer-motion";

const BASE = "mb-3 rounded-sv-xl border border-sv-line bg-white px-[18px] py-4 shadow-sv-card";

// White rounded card used across every screen. Pass framer-motion props
// (initial/animate/exit/transition) to animate it in; pass `style` to override
// background/border for stateful variants (e.g. the "due today" red card).
export default function Card({ children, style, className, ...motionProps }) {
  return (
    <motion.div className={className ? `${BASE} ${className}` : BASE} style={style} {...motionProps}>
      {children}
    </motion.div>
  );
}
