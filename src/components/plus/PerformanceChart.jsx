import Card from "../ui/Card";
import SectionLabel from "../ui/SectionLabel";
import { MASTERY_META } from "../../constants";

const ORDER = ["mastered", "developing", "needs_review", "not_started"];

// Distribuição de domínio dos conteúdos — medível, ao contrário da série
// semanal que não é. Uma barra por nível, proporcional à contagem. Gratuito
// por decisão de produto (Fase 5): sem paywall aqui.
export default function PerformanceChart({ breakdown = {}, hasActivity = false }) {
  const total = ORDER.reduce((sum, k) => sum + (breakdown[k] || 0), 0);

  return (
    <div style={{ marginBottom: 20 }}>
      <SectionLabel>Distribuição de domínio</SectionLabel>
      <Card style={{ padding: "18px 20px", margin: 0 }}>
        {total === 0 || !hasActivity ? (
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#64748B", margin: 0, textAlign: "center" }}>
            Ainda sem tentativas. Responda um quiz para começar a medir seu domínio.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {ORDER.map((key) => {
              const count = breakdown[key] || 0;
              const meta = MASTERY_META[key];
              const pct = total > 0 ? Math.round((count / total) * 100) : 0;
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 700, color: meta.color }}>{meta.label}</span>
                    <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 700, color: "#64748B" }}>{count}</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "#F1F5F9", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: meta.color, borderRadius: 4 }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
