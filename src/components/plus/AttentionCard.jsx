import { AlertTriangle } from "lucide-react";
import Card from "../ui/Card";

// Orientação, não erro — âmbar, não vermelho. Matérias com acerto real < 60%.
export default function AttentionCard({ subjects = [], hideNames }) {
  return (
    <Card style={{ padding: "18px 20px", marginBottom: 20, background: "var(--sv-amber-bg)", border: "1px solid var(--sv-amber-border)" }}>
      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 800, color: "var(--sv-amber-text)", margin: "0 0 10px" }}>Precisa de atenção</p>
      {subjects.length === 0 ? (
        <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "var(--sv-amber-text)", margin: 0 }}>
          Nenhuma matéria abaixo de 60% de acerto. Continue assim!
        </p>
      ) : (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
            {subjects.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle size={16} color="#F59E0B" />
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 600, color: "#111827", filter: hideNames ? "blur(4px)" : "none" }}>
                  {s.name}
                </span>
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 700, color: "#B45309", marginLeft: "auto" }}>{s.accuracyRate}%</span>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "var(--sv-amber-text)", margin: 0 }}>Essas matérias estão com menor taxa de acerto.</p>
        </>
      )}
    </Card>
  );
}
