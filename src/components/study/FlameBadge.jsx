import { useId } from "react";
import { Flame } from "lucide-react";

// Indicador compacto da Chama do Conhecimento (Fase 8) para o header da
// Review — não compete com a função principal da tela, só contextualiza.
// Toda a regra de negócio já vem pronta em `state`
// (knowledgeFlameService.getKnowledgeFlameState()).
export default function FlameBadge({ state }) {
  const gradientId = useId().replace(/:/g, "");
  if (!state) return null;

  const { completed, target, srLabel } = state;
  const active = completed > 0;

  return (
    <div
      role="status"
      aria-label={srLabel}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "5px 10px",
        borderRadius: 999,
        background: active ? "linear-gradient(135deg,#FFF1F2,#FFEDD5)" : "#F1F5F9",
        boxShadow: active ? "0 2px 8px -3px rgba(249,115,22,0.55)" : "none",
        flexShrink: 0,
      }}
    >
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <linearGradient id={`flamebadge-${gradientId}`} x1="0%" y1="0%" x2="20%" y2="100%">
            <stop offset="0%" stopColor="#FB7185" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
        </defs>
      </svg>
      <Flame
        size={14}
        color={active ? `url(#flamebadge-${gradientId})` : "#94A3B8"}
        fill={active ? `url(#flamebadge-${gradientId})` : "none"}
        stroke={active ? `url(#flamebadge-${gradientId})` : "#94A3B8"}
        aria-hidden="true"
      />
      <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 700, color: active ? "#9A3412" : "#64748B" }}>
        {Math.min(completed, target)}/{target}
      </span>
    </div>
  );
}
