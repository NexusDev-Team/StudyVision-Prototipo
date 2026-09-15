// Metadados visuais por tipo de step do Modo Foco — separado de
// FocusStepRenderer.jsx (que tem JSX) para que a tabela em si seja testável
// diretamente pelo runner Node (scripts/test-data-layer.mjs), sem depender
// de um transform de JSX.
//
// FOCUS_STEP_TYPES tem 6 valores; "explanation" é o fallback seguro tanto
// aqui quanto no modelo (createFocusStep já troca qualquer type desconhecido
// por "explanation" antes disso rodar) — mas getStepVisual também cobre esse
// caso por segurança, sem depender só do model.

import { BookOpen, Lightbulb, PenLine, HelpCircle, Sparkles } from "lucide-react";

export const FOCUS_STEP_VISUALS = {
  concept: { label: "Conceito", icon: BookOpen, accent: "#2563EB" },
  explanation: { label: "Explicação", icon: BookOpen, accent: "#2563EB" },
  example: { label: "Exemplo", icon: Lightbulb, accent: "#EA580C" },
  practice: { label: "Prática", icon: PenLine, accent: "#7C3AED" },
  question: { label: "Verificação rápida", icon: HelpCircle, accent: "#16A34A" },
  summary: { label: "Resumo", icon: Sparkles, accent: "#0891B2" },
};

export function getStepVisual(type) {
  return FOCUS_STEP_VISUALS[type] || FOCUS_STEP_VISUALS.explanation;
}
