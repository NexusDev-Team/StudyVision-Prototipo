// Coherent mocked academic metrics for the Study Vision+ dashboard.
// weeks[] ends at `mastery`; masteryDelta reflects the first->last week gap.
export const PLUS_METRICS = {
  mastery: 78,
  masteryDelta: 12,
  studyMinutes: 1122, // 18h 42min
  studyDelta: 18,
  contents: 42,
  weeks: [58, 64, 71, 78],
  subjects: [
    { name: "Matemática", value: 82, delta: 14 },
    { name: "História", value: 91, delta: 4 },
    { name: "Física", value: 74, delta: -3 },
    { name: "Programação", value: 68, delta: 7 },
  ],
  strengths: ["História", "Álgebra", "Redação"],
  attention: ["Cálculo", "Física"],
  insight: "Você evoluiu 14% em Matemática nas últimas 3 semanas. Cálculo continua sendo seu ponto de atenção.",
};
