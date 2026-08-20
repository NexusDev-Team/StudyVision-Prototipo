export const FREE_FLASHCARD_LIMIT = 5;

export const PLANNING_TYPES = ["Prova", "Trabalho", "Apresentação", "Revisão"];

export const REMINDER_OPTIONS = [
  { days: 7, label: "7 dias antes" },
  { days: 3, label: "3 dias antes" },
  { days: 1, label: "1 dia antes" },
  { days: 0, label: "No dia" },
];

export const SUBJECT_FILTERS = ["Todos", "Matemática", "História", "Química"];

export const SUBJECT_META = {
  Todos: { icon: "LayoutGrid", color: "#64748B", bg: "#F1F5F9" },
  Matemática: { icon: "Calculator", color: "#2563EB", bg: "#EFF6FF" },
  História: { icon: "Landmark", color: "#16A34A", bg: "#F0FDF4" },
  Química: { icon: "FlaskConical", color: "#EA580C", bg: "#FFF7ED" },
  Física: { icon: "Atom", color: "#7C3AED", bg: "#EDE9FE" },
  Programação: { icon: "Code2", color: "#14B8A6", bg: "#F0FDFA" },
};
