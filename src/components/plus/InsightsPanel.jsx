import { CheckCircle2, AlertTriangle, Lightbulb } from "lucide-react";
import Card from "../ui/Card";

// Insights da evolução (atrás do PlusPaywall). Três grupos rotulados —
// pontos fortes, pontos fracos agora, dicas — alimentados só por dados reais
// já derivados pelo evolutionService. Zero IA, zero aleatoriedade.
function GroupLabel({ icon, color, children }) {
  return (
    <p style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 800, letterSpacing: 0.3, color, margin: "0 0 8px", textTransform: "uppercase" }}>
      {icon}
      {children}
    </p>
  );
}

function Empty({ children }) {
  return <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12.5, color: "#94A3B8", margin: 0 }}>{children}</p>;
}

export default function InsightsPanel({ delta, strongSubjects = [], weakContents = [], recommendations = [], onOpenContent }) {
  return (
    <Card style={{ padding: "18px 20px", margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 18 }}>
      {delta && (
        <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: delta.deltaPoints >= 0 ? "#16A34A" : "#DC2626", margin: 0 }}>
          {delta.deltaPoints >= 0 ? "+" : ""}{delta.deltaPoints} p.p. nas últimas semanas ({delta.from}% → {delta.to}%)
        </p>
      )}

      <div>
        <GroupLabel icon={<CheckCircle2 size={14} color="#16A34A" />} color="#16A34A">Pontos fortes</GroupLabel>
        {strongSubjects.length === 0 ? (
          <Empty>Alcance 80% de acerto numa matéria para ela aparecer aqui.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {strongSubjects.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600, color: "#111827" }}>{s.name}</span>
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 700, color: "#16A34A", marginLeft: "auto" }}>{s.accuracyRate}%</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <GroupLabel icon={<AlertTriangle size={14} color="#F59E0B" />} color="#B45309">Pontos fracos agora</GroupLabel>
        {weakContents.length === 0 ? (
          <Empty>Nenhum conteúdo em dificuldade no momento.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {weakContents.map((item) => {
              const label = item.reason === "overdue_review" && item.accuracy == null ? "Revisão atrasada" : `${item.accuracy}%`;
              const row = (
                <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600, color: "#111827", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.title}
                    </p>
                    {item.subjectName && (
                      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: "#94A3B8", margin: 0 }}>{item.subjectName}</p>
                    )}
                  </div>
                  <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 700, color: "#B45309", flexShrink: 0 }}>{label}</span>
                </div>
              );
              return onOpenContent ? (
                <button
                  key={item.contentId}
                  onClick={() => onOpenContent(item.contentId)}
                  style={{ display: "flex", width: "100%", textAlign: "left", background: "none", border: "none", padding: "8px 0", cursor: "pointer", minHeight: 44 }}
                >
                  {row}
                </button>
              ) : (
                <div key={item.contentId} style={{ padding: "8px 0" }}>{row}</div>
              );
            })}
          </div>
        )}
      </div>

      <div>
        <GroupLabel icon={<Lightbulb size={14} color="#2563EB" />} color="#2563EB">Dicas</GroupLabel>
        {recommendations.length === 0 ? (
          <Empty>Continue estudando para desbloquear dicas.</Empty>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recommendations.map((r) => (
              <div key={r.id}>
                <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#111827", margin: "0 0 2px" }}>{r.title}</p>
                <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12.5, color: "#64748B", margin: 0, lineHeight: 1.5 }}>{r.message}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
