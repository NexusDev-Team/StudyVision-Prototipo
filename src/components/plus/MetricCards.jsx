import Card from "../ui/Card";
import ProgressRing from "../ui/ProgressRing";

// Só métricas medidas: domínio médio, conteúdos criados e taxa de acerto no
// quiz. Sem tempo de estudo nem deltas — não há série histórica para comparar.
export default function MetricCards({ summary }) {
  const { averageMasteryScore, contentsCreated, quizAccuracyRate, flashcardAccuracyRate } = summary;
  const hasMastery = averageMasteryScore != null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
      <Card initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ padding: "18px 20px", margin: 0, display: "flex", alignItems: "center", gap: 16 }}>
        <ProgressRing value={hasMastery ? averageMasteryScore : 0} size={72} stroke={8} color="#2563EB">
          <span style={{ fontFamily: "Inter,sans-serif", fontSize: 18, fontWeight: 800, color: "#111827" }}>
            {hasMastery ? `${averageMasteryScore}%` : "—"}
          </span>
        </ProgressRing>
        <div>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#64748B", margin: "0 0 4px", fontWeight: 600 }}>Domínio médio</p>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#94A3B8", margin: 0 }}>
            {hasMastery ? "média dos conteúdos já estudados" : "responda um quiz ou revise flashcards"}
          </p>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Card initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} style={{ padding: "16px", margin: 0 }}>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 18, fontWeight: 800, color: "#111827", margin: "0 0 2px" }}>{contentsCreated}</p>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#64748B", margin: 0 }}>conteúdos organizados</p>
        </Card>
        <Card initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }} style={{ padding: "16px", margin: 0 }}>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 18, fontWeight: 800, color: "#111827", margin: "0 0 2px" }}>
            {quizAccuracyRate != null ? `${quizAccuracyRate}%` : "—"}
          </p>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#64748B", margin: 0 }}>
            acerto no quiz{flashcardAccuracyRate != null ? ` · ${flashcardAccuracyRate}% nos flashcards` : ""}
          </p>
        </Card>
      </div>
    </div>
  );
}
