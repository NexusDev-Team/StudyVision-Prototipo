// Ponte entre os tipos em português usados pelo modal de planejamento
// (src/constants.js PLANNING_TYPES) e os tipos canônicos de AcademicEvent
// (exam|assignment|deadline|other). "Revisão" nunca aparece aqui —
// vira uma Review avulsa, nunca um AcademicEvent (ver services/calendarService.js).
// Também usado pela migração v1→v2 e pela projeção de tipo em telas de leitura.
export const LEGACY_TO_CANONICAL_EVENT_TYPE = {
  Prova: "exam",
  Trabalho: "assignment",
  // "Apresentação" foi removido dos compromissos — cai no fallback "other".
};

export const CANONICAL_TO_LEGACY_EVENT_TYPE = {
  exam: "Prova",
  assignment: "Trabalho",
  deadline: "Trabalho",
  other: "Trabalho",
};
