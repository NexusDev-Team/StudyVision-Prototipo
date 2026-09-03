// Ponte entre os tipos em português usados pelo modal de planejamento
// (src/constants.js PLANNING_TYPES) e os tipos canônicos de AcademicEvent
// (exam|assignment|class|deadline|other). "Revisão" nunca aparece aqui —
// vira uma Review avulsa, nunca um AcademicEvent (ver services/calendarService.js).
// Também usado pela migração v1→v2 e pela projeção de tipo em telas de leitura.
export const LEGACY_TO_CANONICAL_EVENT_TYPE = {
  Prova: "exam",
  Trabalho: "assignment",
  Apresentação: "class",
};

export const CANONICAL_TO_LEGACY_EVENT_TYPE = {
  exam: "Prova",
  assignment: "Trabalho",
  class: "Apresentação",
  deadline: "Trabalho",
  other: "Trabalho",
};
