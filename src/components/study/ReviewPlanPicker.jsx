import Card from "../ui/Card";
import SectionLabel from "../ui/SectionLabel";

// Seletor da cadência de revisão do conteúdo (content.reviewPlan). Usado na
// captura (antes de salvar) e na tela de detalhe (edição). "Nenhum" = sem
// revisão de plano; só compromissos geram revisão.
const OPTIONS = [
  { value: "none", label: "Nenhum" },
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quinzenal" },
  { value: "monthly", label: "Mensal" },
];

const HINT = {
  none: "Sem revisões automáticas. Só compromissos (prova, trabalho) geram revisão.",
  weekly: "Uma revisão a cada 7 dias, sempre em dia útil.",
  biweekly: "Uma revisão a cada 15 dias, sempre em dia útil.",
  monthly: "Uma revisão a cada 30 dias, sempre em dia útil.",
};

export default function ReviewPlanPicker({ value = "none", onChange, delay = 0.58 }) {
  return (
    <Card initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }}>
      <SectionLabel>PLANO DE REVISÃO</SectionLabel>
      <div style={{ display: "flex", gap: 6 }}>
        {OPTIONS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              aria-pressed={active}
              style={{
                flex: 1,
                minHeight: 44,
                padding: "10px 4px",
                borderRadius: 12,
                border: active ? "1.5px solid #2563EB" : "1.5px solid #E2E8F0",
                background: active ? "#EFF6FF" : "white",
                color: active ? "#2563EB" : "#64748B",
                fontFamily: "Inter,sans-serif",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11.5, color: "#94A3B8", margin: "8px 0 0", lineHeight: 1.5 }}>
        {HINT[value] || HINT.none}
      </p>
    </Card>
  );
}
