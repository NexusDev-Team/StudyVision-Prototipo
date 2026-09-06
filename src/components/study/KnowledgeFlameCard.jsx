import { useId } from "react";
import { Flame } from "lucide-react";
import Card from "../ui/Card";
import ProgressBar from "../ui/ProgressBar";

// Chama do Conhecimento (Fase 8) — indicador de constância semanal, não de
// streak diário. Toda regra de negócio já vem pronta em `state`
// (knowledgeFlameService.getKnowledgeFlameState()); este componente só
// exibe. A cor não é a única pista de estado: `state.srLabel` garante o
// mesmo significado em texto puro.
export default function KnowledgeFlameCard({ state }) {
  const gradientId = useId().replace(/:/g, "");
  if (!state) return null;

  const { completed, target, streakWeeks, isFirstTime, message, srLabel } = state;
  const active = completed > 0;
  const pct = (Math.min(completed, target) / target) * 100;

  return (
    <Card
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ padding: "20px 20px 18px", margin: "0 0 20px", display: "flex", flexDirection: "column", gap: 14 }}
      aria-label={srLabel}
    >
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <linearGradient id={`flame-${gradientId}`} x1="0%" y1="0%" x2="20%" y2="100%">
            <stop offset="0%" stopColor="#FB7185" />
            <stop offset="100%" stopColor="#F97316" />
          </linearGradient>
        </defs>
      </svg>

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          {isFirstTime ? (
            <p style={{ fontFamily: "Inter,sans-serif", fontSize: 19, fontWeight: 800, color: "#111827", margin: 0, letterSpacing: -0.3 }}>
              Acenda sua Chama
            </p>
          ) : (
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontFamily: "Inter,sans-serif", fontSize: 34, fontWeight: 800, color: "#111827", lineHeight: 1, letterSpacing: -1 }}>
                {streakWeeks}
              </span>
              <span style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, color: "#111827" }}>
                {streakWeeks === 1 ? "semana" : "semanas"}
              </span>
            </div>
          )}
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, fontWeight: 700, color: "#94A3B8", margin: "3px 0 0", textTransform: "uppercase", letterSpacing: 0.6 }}>
            Chama do Conhecimento
          </p>
        </div>

        <div
          aria-hidden="true"
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: active ? "linear-gradient(155deg,#FFF1F2,#FFEDD5)" : "#F1F5F9",
            boxShadow: active ? "0 6px 18px -6px rgba(249,115,22,0.45)" : "none",
          }}
        >
          <Flame
            size={26}
            color={active ? `url(#flame-${gradientId})` : "#CBD5E1"}
            fill={active ? `url(#flame-${gradientId})` : "none"}
            stroke={active ? `url(#flame-${gradientId})` : "#CBD5E1"}
          />
        </div>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontFamily: "Inter,sans-serif", fontSize: 12.5, color: "#374151", fontWeight: 600 }}>
            {Math.min(completed, target)}/{target} atividades nesta semana
          </span>
        </div>
        <ProgressBar value={pct} color="#F97316" />
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "9px 12px",
          borderRadius: 12,
          background: "linear-gradient(135deg,#FFF7ED,#FFF1F2)",
        }}
      >
        <Flame size={14} color="#F97316" fill="#F97316" aria-hidden="true" style={{ flexShrink: 0 }} />
        <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12.5, color: "#9A3412", margin: 0, fontWeight: 600 }}>{message}</p>
      </div>

      {/* Reforço acessível: mesma informação da chama, só em texto, para quem
          não percebe cor/ícone. */}
      <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
        {srLabel}
      </span>
    </Card>
  );
}
