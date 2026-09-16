// Renderer único de um step do Modo Foco — um layout base (título + corpo
// legível) com variações leves por tipo (ícone/rótulo/acento), em vez de uma
// tela por tipo. Sempre UM step por vez; quem decide qual step mostrar é
// FocusScreen (currentStepIndex), este componente só apresenta.
//
// O motor (Etapa 1) só produz { type, title, content } — nunca alternativas
// estruturadas para "question" (ver lib/focusPrompts.js: o schema pedido ao
// Gemini é sempre title+content em texto corrido, mesmo para question). Por
// isso "question" NÃO tenta um adapter para QuizQuestion (não há options nem
// correctAnswer para adaptar) — vira uma microchecagem de reflexão, mantendo
// o sistema de Quiz intacto e sem uma segunda implementação de quiz.

import { getStepVisual } from "../../utils/focusStepVisuals.js";

// `stepMode` = necessidade "acompanhar muitas etapas" (manySteps) ativa no
// snapshot da sessão: mais respiro entre o rótulo do tipo, o título e o corpo
// da etapa — o mesmo eixo visual de ContentBlocks.jsx, aplicado aqui porque
// cada step do Modo Foco já é exibido isoladamente (uma etapa por vez).
export default function FocusStepRenderer({ step, comfortReading = false, stepMode = false }) {
  const visual = getStepVisual(step?.type);
  const Icon = visual.icon;
  const isQuestion = step?.type === "question";

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: stepMode ? 18 : 12 }}>
        <span style={{ width: 30, height: 30, borderRadius: 10, background: `${visual.accent}1A`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={15} color={visual.accent} />
        </span>
        <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.3, textTransform: "uppercase", color: visual.accent, fontFamily: "Inter,sans-serif" }}>
          {visual.label}
        </span>
      </div>

      <h2 style={{ fontSize: 20, fontWeight: 800, color: "#111827", margin: stepMode ? "0 0 20px" : "0 0 14px", lineHeight: 1.3, fontFamily: "Inter,sans-serif" }}>
        {step?.title}
      </h2>

      <p style={{
        fontSize: comfortReading ? 16 : 15,
        lineHeight: comfortReading ? 1.8 : 1.65,
        color: "#374151",
        margin: 0,
        fontFamily: "Inter,sans-serif",
        whiteSpace: "pre-wrap",
      }}>
        {step?.content}
      </p>

      {isQuestion && (
        <p style={{ fontSize: 12.5, color: "#16A34A", background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 12, padding: "10px 12px", marginTop: 18, fontFamily: "Inter,sans-serif" }}>
          Pense na sua resposta antes de continuar para a próxima etapa.
        </p>
      )}
    </div>
  );
}
