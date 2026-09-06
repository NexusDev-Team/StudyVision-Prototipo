import { Flame } from "lucide-react";

// Indicador compacto da Chama do Conhecimento (Fase 8) para o header da
// Review — não compete com a função principal da tela, só contextualiza.
// Toda a regra de negócio já vem pronta em `state`
// (knowledgeFlameService.getKnowledgeFlameState()).
export default function FlameBadge({ state }) {
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
        gap: 4,
        padding: "5px 10px",
        borderRadius: 999,
        background: active ? "#FFF7ED" : "#F1F5F9",
        flexShrink: 0,
      }}
    >
      <Flame size={14} color={active ? "#F97316" : "#94A3B8"} fill={active ? "#F97316" : "none"} aria-hidden="true" />
      <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12, fontWeight: 700, color: active ? "#9A3412" : "#64748B" }}>
        {Math.min(completed, target)}/{target}
      </span>
    </div>
  );
}
