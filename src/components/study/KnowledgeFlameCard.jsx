import { Flame } from "lucide-react";
import Card from "../ui/Card";
import ProgressBar from "../ui/ProgressBar";

// Chama do Conhecimento (Fase 8) — indicador de constância semanal, não de
// streak diário. Toda regra de negócio já vem pronta em `state`
// (knowledgeFlameService.getKnowledgeFlameState()); este componente só
// exibe. A cor não é a única pista de estado: `state.srLabel` garante o
// mesmo significado em texto puro.
export default function KnowledgeFlameCard({ state }) {
  if (!state) return null;

  const { completed, target, streakWeeks, isFirstTime, message, srLabel } = state;
  const flameColor = completed > 0 ? "#F97316" : "#CBD5E1";
  const streakLabel = isFirstTime ? "Acenda sua Chama" : `${streakWeeks} ${streakWeeks === 1 ? "semana" : "semanas"}`;

  return (
    <Card
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ padding: "18px 20px", margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 12 }}
      aria-label={srLabel}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          aria-hidden="true"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: completed > 0 ? "#FFF7ED" : "#F1F5F9",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Flame size={24} color={flameColor} fill={completed > 0 ? flameColor : "none"} />
        </div>
        <div>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 16, fontWeight: 800, color: "#111827", margin: 0 }}>
            {streakLabel}
          </p>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#64748B", margin: "2px 0 0" }}>
            Chama do Conhecimento
          </p>
        </div>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12.5, color: "#374151", fontWeight: 600 }}>
            {completed}/{target} atividades nesta semana
          </span>
        </div>
        <ProgressBar value={(Math.min(completed, target) / target) * 100} color="#F97316" />
      </div>

      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12.5, color: "#64748B", margin: 0 }}>{message}</p>

      {/* Reforço acessível: mesma informação da chama, só em texto, para quem
          não percebe cor/ícone. */}
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        {srLabel}
      </span>
    </Card>
  );
}
