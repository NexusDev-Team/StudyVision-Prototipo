import { CheckCircle2 } from "lucide-react";
import Card from "../ui/Card";
import { PLUS_METRICS } from "../../data/plusMetrics";

export default function StrengthsCard() {
  return (
    <Card style={{ padding: "18px 20px", marginBottom: 12, background: "var(--sv-green-bg)", border: "1px solid var(--sv-green-border)" }}>
      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 800, color: "#16A34A", margin: "0 0 10px" }}>Seus pontos fortes</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
        {PLUS_METRICS.strengths.map(name => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <CheckCircle2 size={16} color="#16A34A" />
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600, color: "#111827" }}>{name}</span>
          </div>
        ))}
      </div>
      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#166534", margin: 0 }}>Você apresenta melhor desempenho nesses conteúdos.</p>
    </Card>
  );
}
