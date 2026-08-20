import { motion } from "framer-motion";

// Minimalist line+area chart. viewBox scales to container width — no fixed px sizing,
// so it never causes horizontal overflow on small screens.
export default function SparkChart({ points, labels, color = "#2563EB", height = 120 }) {
  const w = 300;
  const h = 100;
  const padX = 12;
  const padY = 16;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = padX + (i / (points.length - 1)) * (w - padX * 2);
    const y = padY + (1 - (p - min) / range) * (h - padY * 2);
    return { x, y };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${h - padY} L ${coords[0].x} ${h - padY} Z`;
  const gradientId = "sparkGradient";

  return (
    <div style={{ width: "100%" }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <motion.path
          d={areaPath} fill={`url(#${gradientId})`} stroke="none"
          initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
        />
        <motion.path
          d={linePath} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 0.7, ease: "easeOut" }}
        />
        {coords.map((c, i) => (
          <motion.circle key={i} cx={c.x} cy={c.y} r={3.5} fill={color}
            initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.5 + i * 0.08 }} />
        ))}
      </svg>
      {labels && (
        <div style={{ display: "flex", justifyContent: "space-between", padding: `0 ${padX}px`, marginTop: 6 }}>
          {labels.map((l, i) => (
            <span key={i} style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>{l}</span>
          ))}
        </div>
      )}
    </div>
  );
}
