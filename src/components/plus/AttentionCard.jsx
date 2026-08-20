import { AlertTriangle } from "lucide-react";
import Card from "../ui/Card";
import { PLUS_METRICS } from "../../data/plusMetrics";

// Guidance, not an error state — amber, not red (doc: orientação, não erro).
export default function AttentionCard({ hideNames }) {
  return (
    <Card style={{ padding: "18px 20px", marginBottom: 20, background: "var(--sv-amber-bg)", border: "1px solid var(--sv-amber-border)" }}>
      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 800, color: "var(--sv-amber-text)", margin: "0 0 10px" }}>Precisa de atenção</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
        {PLUS_METRICS.attention.map(name => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={16} color="#F59E0B" />
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600, color: "#111827", filter: hideNames ? "blur(4px)" : "none" }}>
              {name}
            </span>
          </div>
        ))}
      </div>
      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "var(--sv-amber-text)", margin: 0 }}>Esses conteúdos estão apresentando menor domínio.</p>
    </Card>
  );
}
