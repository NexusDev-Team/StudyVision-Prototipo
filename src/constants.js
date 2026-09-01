export const FREE_FLASHCARD_LIMIT = 5;

export const PLANNING_TYPES = ["Prova", "Trabalho", "Apresentação", "Revisão"];

export const REMINDER_OPTIONS = [
  { days: 7, label: "7 dias antes" },
  { days: 3, label: "3 dias antes" },
  { days: 1, label: "1 dia antes" },
  { days: 0, label: "No dia" },
];

export const SUBJECT_FILTERS = ["Todos", "Matemática", "História", "Química", "Física", "Português"];

export const SUBJECT_META = {
  Todos: { icon: "LayoutGrid", color: "#64748B", bg: "#F1F5F9" },
  Matemática: { icon: "Calculator", color: "#2563EB", bg: "#EFF6FF" },
  História: { icon: "Landmark", color: "#16A34A", bg: "#F0FDF4" },
  Química: { icon: "FlaskConical", color: "#EA580C", bg: "#FFF7ED" },
  Física: { icon: "Atom", color: "#7C3AED", bg: "#EDE9FE" },
  Português: { icon: "BookA", color: "#DB2777", bg: "#FDF2F8" },
  Programação: { icon: "Code2", color: "#14B8A6", bg: "#F0FDFA" },
  Biologia: { icon: "Leaf", color: "#059669", bg: "#ECFDF5" },
  Geografia: { icon: "Globe2", color: "#0891B2", bg: "#ECFEFF" },
  Filosofia: { icon: "BrainCircuit", color: "#9333EA", bg: "#FAF5FF" },
  Sociologia: { icon: "Users", color: "#D97706", bg: "#FFFBEB" },
  Inglês: { icon: "Languages", color: "#DC2626", bg: "#FEF2F2" },
  Artes: { icon: "Palette", color: "#DB2777", bg: "#FDF2F8" },
  Redação: { icon: "PenLine", color: "#4F46E5", bg: "#EEF2FF" },
};

// Fallback determinístico para matérias geradas pela IA que não estão no mapa acima
// (ex: "Filosofia Antiga", "Geometria Espacial") — mesma matéria sempre recebe a mesma cor.
const FALLBACK_COLORS = ["#2563EB", "#16A34A", "#EA580C", "#7C3AED", "#DB2777", "#0891B2", "#D97706", "#059669"];

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash;
}

const SUBJECT_EMOJI = {
  Matemática: "📘",
  História: "📗",
  Química: "🧪",
  Física: "⚛️",
  Português: "📖",
  Programação: "💻",
  Biologia: "🧬",
  Geografia: "🌎",
  Filosofia: "🧠",
  Sociologia: "👥",
  Inglês: "🔤",
  Artes: "🎨",
  Redação: "✍️",
};

export function getSubjectEmoji(subjectName) {
  return SUBJECT_EMOJI[subjectName] || "📚";
}

export function getSubjectMeta(subjectName) {
  if (SUBJECT_META[subjectName]) return SUBJECT_META[subjectName];
  const color = FALLBACK_COLORS[hashString(subjectName || "") % FALLBACK_COLORS.length];
  return { icon: "BookOpen", color, bg: `${color}14` };
}
