import { motion } from "framer-motion";

// Horizontal progress bar. Animates its width from 0 to `value` once in view.
export default function ProgressBar({ value, color = "#2563EB", track = "#F1F5F9", height = 8, style }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div style={{ width: "100%", height, borderRadius: height / 2, background: track, overflow: "hidden", ...style }}>
      <motion.div
        initial={{ width: 0 }}
        whileInView={{ width: `${pct}%` }}
        viewport={{ once: true }}
        transition={{ type: "spring", stiffness: 120, damping: 22 }}
        style={{ height: "100%", borderRadius: height / 2, background: color }}
      />
    </div>
  );
}
