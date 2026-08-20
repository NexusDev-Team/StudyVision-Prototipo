import { Sparkles } from "lucide-react";
import { PLUS_METRICS } from "../../data/plusMetrics";

export default function InsightCard() {
  return (
    <div style={{ borderRadius: 20, padding: "18px 20px", marginBottom: 20, background: "linear-gradient(135deg,#EFF6FF,#EDE9FE)", border: "1px solid #DDD6FE" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <Sparkles size={16} color="#7C3AED" />
        <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 800, color: "#6D28D9" }}>Insight da semana</span>
      </div>
      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: "#111827", lineHeight: 1.55, margin: 0 }}>{PLUS_METRICS.insight}</p>
    </div>
  );
}
