import { Check } from "lucide-react";
import Card from "../ui/Card";
import SectionLabel from "../ui/SectionLabel";

const FREE_ITEMS = [
  "Captura inteligente", "Leitura inteligente", "Resumos", "Biblioteca",
  "Revisões", "Flashcards dentro do limite gratuito", "Perguntas dentro do limite gratuito", "Calendário de revisões",
];

const PLUS_ITEMS = [
  "Tudo do Free", "Flashcards ilimitados", "Quizzes ilimitados", "Personalização avançada",
  "Dashboard de evolução", "Análise por matéria", "Análise por tópico", "Insights inteligentes",
  "Histórico de evolução", "Estatísticas avançadas",
];

function PlanColumn({ title, items, accent }) {
  return (
    <Card style={{ flex: 1, padding: "16px 14px", margin: 0, border: accent ? "1.5px solid #C4B5FD" : undefined }}>
      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 800, color: accent ? "#6D28D9" : "#111827", margin: "0 0 12px" }}>{title}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map(item => (
          <div key={item} style={{ display: "flex", alignItems: "flex-start", gap: 6 }}>
            <Check size={13} color={accent ? "#7C3AED" : "#16A34A"} style={{ marginTop: 2, flexShrink: 0 }} />
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 11.5, color: "#374151", lineHeight: 1.4 }}>{item}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

export default function PlanComparison() {
  return (
    <div style={{ marginBottom: 20 }}>
      <SectionLabel>Free vs Plus</SectionLabel>
      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#64748B", margin: "0 0 12px", lineHeight: 1.5 }}>
        O Free já resolve o problema. O Plus leva o aprendizado além.
      </p>
      <div style={{ display: "flex", gap: 10 }}>
        <PlanColumn title="Free" items={FREE_ITEMS} />
        <PlanColumn title="Plus" items={PLUS_ITEMS} accent />
      </div>
    </div>
  );
}
