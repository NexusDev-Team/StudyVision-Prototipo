import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";
import Card from "../ui/Card";
import ProgressRing from "../ui/ProgressRing";
import { PLUS_METRICS } from "../../data/plusMetrics";

function DeltaTag({ value, suffix = "% este mês" }) {
  const up = value >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  const color = up ? "#16A34A" : "#DC2626";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 700, color }}>
      <Icon size={13} />
      {up ? "+" : ""}{value}{suffix}
    </span>
  );
}

function formatMinutes(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m.toString().padStart(2, "0")}min`;
}

export default function MetricCards() {
  const { mastery, masteryDelta, studyMinutes, studyDelta, contents } = PLUS_METRICS;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
      <Card initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 16 }}>
        <ProgressRing value={mastery} size={72} stroke={8} color="#2563EB">
          <span style={{ fontFamily: "Inter,sans-serif", fontSize: 18, fontWeight: 800, color: "#111827" }}>{mastery}%</span>
        </ProgressRing>
        <div>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#64748B", margin: "0 0 4px", fontWeight: 600 }}>Domínio estimado</p>
          <DeltaTag value={masteryDelta} suffix="% este mês" />
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} style={{ padding: "16px" }}>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 18, fontWeight: 800, color: "#111827", margin: "0 0 2px" }}>{formatMinutes(studyMinutes)}</p>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#64748B", margin: "0 0 8px" }}>tempo estudado</p>
          <DeltaTag value={studyDelta} suffix="% vs. período anterior" />
        </Card>
        <Card initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} style={{ padding: "16px" }}>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 18, fontWeight: 800, color: "#111827", margin: "0 0 2px" }}>{contents} conteúdos</p>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#64748B", margin: 0 }}>organizados e revisados</p>
        </Card>
      </div>
    </div>
  );
}
