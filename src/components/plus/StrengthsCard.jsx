import { CheckCircle2 } from "lucide-react";
import Card from "../ui/Card";

// Matérias com taxa de acerto real >= 80%. Sem nenhuma: estado vazio.
export default function StrengthsCard({ subjects = [] }) {
  return (
    <Card style={{ padding: "18px 20px", marginBottom: 12, background: "var(--sv-green-bg)", border: "1px solid var(--sv-green-border)" }}>
      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 800, color: "#16A34A", margin: "0 0 10px" }}>Seus pontos fortes</p>
      {subjects.length === 0 ? (
        <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#166534", margin: 0 }}>
          Alcance 80% de acerto numa matéria para ela aparecer aqui.
        </p>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
            {subjects.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <CheckCircle2 size={16} color="#16A34A" />
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600, color: "#111827" }}>{s.name}</span>
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 700, color: "#16A34A", marginLeft: "auto" }}>{s.accuracyRate}%</span>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#166534", margin: 0 }}>Você apresenta melhor desempenho nessas matérias.</p>
        </>
      )}
    </Card>
  );
}
