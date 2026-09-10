export const FREE_FLASHCARD_LIMIT = 5;

// Fonte única do preço e do teste do Study Vision+ — qualquer tela que
// mostre valor ou duração do teste lê daqui, nunca escreve o número solto.
export const TRIAL_DAYS = 7;
export const PLUS_PRICE_LABEL = "R$ 9,90";
export const PLUS_PRICE_PERIOD = "/mês";
export const PLUS_PRICE_FULL = "R$ 9,90/mês";

export const FREE_BENEFITS = [
  "Captura inteligente", "Leitura inteligente", "Resumos", "Biblioteca",
  "Revisões", "Flashcards dentro do limite gratuito", "Perguntas dentro do limite gratuito",
  "Calendário de revisões", "Evolução completa",
];

export const PLUS_BENEFITS = [
  "Tudo do Free", "Flashcards personalizados ilimitados", "Quizzes ilimitados",
  "Personalização avançada", "Insights detalhados da sua evolução", "Recursos avançados de estudo",
];

// Rótulo do bucket de conteúdos sem matéria (subjectId/subjectName ausentes) —
// captura recém-feita, IA sem classificação, ou ainda não organizado pelo usuário.
export const UNASSIGNED_SUBJECT_LABEL = "Sem matéria";

// Nível de domínio (content.mastery.level) → rótulo e cores para os selos.
export const MASTERY_META = {
  not_started: { label: "Não iniciado", color: "#64748B", bg: "rgba(100,116,139,0.12)" },
  needs_review: { label: "Rever", color: "#DC2626", bg: "rgba(220,38,38,0.1)" },
  developing: { label: "Em progresso", color: "#D97706", bg: "rgba(217,119,6,0.12)" },
  mastered: { label: "Dominado", color: "#16A34A", bg: "rgba(22,163,74,0.12)" },
};

export function getMasteryMeta(level) {
  return MASTERY_META[level] || MASTERY_META.not_started;
}

// Tags de notificação de reforço — aparecem só quando o conteúdo precisa.
// Não são estado permanente do conteúdo; somem quando a condição deixa de valer.
export const REVIEW_FLAG_META = {
  needs_review: { label: "Rever", color: "#DC2626", bg: "rgba(220,38,38,0.1)" },
  overdue: { label: "Revisão atrasada", color: "#B45309", bg: "rgba(180,83,9,0.1)" },
};

// Modo Inclusão — necessidades de acessibilidade DECLARADAS pelo estudante.
// O usuário informa onde encontra dificuldade nos estudos; o Study Vision usa
// isso para adaptar a APRESENTAÇÃO do conteúdo (nunca a verdade acadêmica).
// NÃO é diagnóstico: nada de "Modo TDAH", dislexia, autismo ou rótulo médico.
// Estas chaves são o contrato canônico — o mesmo conjunto é replicado em
// lib/prompts.js (a função serverless não importa src/) e um teste de paridade
// trava o drift. Trocar o conjunto exige bumpar LEARNING_KEYS_VERSION em
// src/data/storage/db.js (ver o carimbo keysVersion na preferência).
export const LEARNING_PREFERENCE_KEYS = [
  "concentration",
  "longText",
  "textTracking",
  "complexContent",
  "manySteps",
];

export const LEARNING_PREFERENCE_META = {
  concentration: {
    emoji: "🧠",
    label: "Tenho dificuldade para me concentrar",
    description: "Reduza estímulos e divida o conteúdo em pequenas partes.",
  },
  longText: {
    emoji: "📖",
    label: "Tenho dificuldade para ler textos longos",
    description: "Transforme textos extensos em partes menores e mais objetivas.",
  },
  textTracking: {
    emoji: "🔤",
    label: "Tenho dificuldade para acompanhar textos",
    description: "Organize a leitura para facilitar o acompanhamento linha por linha.",
  },
  complexContent: {
    emoji: "🧩",
    label: "Tenho dificuldade para entender conteúdos complexos",
    description: "Explique conceitos difíceis de forma gradual e concreta.",
  },
  manySteps: {
    emoji: "✋",
    label: "Tenho dificuldade para acompanhar muitas etapas",
    description: "Divida processos e exercícios em uma etapa por vez.",
  },
};

// Objeto de opções com todas as necessidades desligadas — o padrão de fábrica.
// Deriva das chaves para não sair de sincronia ao mudar o conjunto.
export function emptyPreferenceOptions() {
  return Object.fromEntries(LEARNING_PREFERENCE_KEYS.map((key) => [key, false]));
}

export const PLANNING_TYPES = ["Prova", "Trabalho", "Revisão"];

export const REMINDER_OPTIONS = [
  { days: 7, label: "7 dias antes" },
  { days: 3, label: "3 dias antes" },
  { days: 1, label: "1 dia antes" },
  { days: 0, label: "No dia" },
];

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
  if (subjectName === UNASSIGNED_SUBJECT_LABEL || !subjectName) {
    return { icon: "FolderOpen", color: "#64748B", bg: "#F1F5F9" };
  }
  if (SUBJECT_META[subjectName]) return SUBJECT_META[subjectName];
  const color = FALLBACK_COLORS[hashString(subjectName || "") % FALLBACK_COLORS.length];
  return { icon: "BookOpen", color, bg: `${color}14` };
}

// Trio visual (emoji + cor + fundo) resolvido a partir do nome da matéria —
// as telas leem o Content canônico (que só guarda subjectName) e derivam o
// resto daqui, no lugar dos antigos campos subjectIcon/subjectColor/subjectBg
// que o adaptador legado injetava.
export function getSubjectVisual(subjectName) {
  if (!subjectName) return { emoji: "🗂️", color: "#64748B", bg: "#F1F5F9" };
  const meta = getSubjectMeta(subjectName);
  return { emoji: getSubjectEmoji(subjectName), color: meta.color, bg: meta.bg };
}
