import { buildReviewSchedule, DAY_MS } from "../services/reviewEngine";
import exemploFoto1 from "../assets/exemplo-foto1.png";
import exemploFisica from "../assets/exemplo2_fisica.jpg";
import exemploPortugues from "../assets/exemplo3_portugues.jpg";

export const SAMPLE_ITEMS = [
  {
    id: "s1",
    subject: "Matemática",
    subjectIcon: "📘",
    subjectColor: "#2563EB",
    subjectBg: "#EFF6FF",
    topic: "Cálculo Diferencial",
    concept: "Derivadas",
    time: "Há 2 dias",
    photo: exemploFoto1,
    summary: "Uma derivada mede a taxa de variação instantânea de uma função em relação a uma de suas variáveis. É um conceito fundamental no cálculo diferencial, representado pela notação f\'(x) ou dy/dx. Geometricamente, representa a inclinação da reta tangente à curva no ponto.",
    concepts: ["Derivadas", "Limites", "Regra da Cadeia", "Cálculo Diferencial"],
    keywords: ["taxa de variação", "f\'(x)", "dy/dx", "tangente", "instantânea"],
    flashcards: [
      { front: "O que é uma derivada?", back: "A taxa de variação instantânea de uma função em relação a uma variável, representada por f\'(x) ou dy/dx." },
      { front: "O que é a Regra da Cadeia?", back: "Uma fórmula para calcular a derivada de uma função composta: (f∘g)\'(x) = f\'(g(x)) · g\'(x)." },
      { front: "O que representa a derivada geometricamente?", back: "A inclinação (coeficiente angular) da reta tangente ao gráfico da função no ponto considerado." },
      { front: "Qual a notação de Leibniz para derivada?", back: "dy/dx, que representa a variação infinitesimal de y em relação a x." },
      { front: "Quando uma função é dita derivável em um ponto?", back: "Quando o limite que define a derivada existe e é finito naquele ponto." },
    ],
    questions: [
      "Qual é a definição formal de derivada de uma função?",
      "Como aplicar a Regra da Cadeia no cálculo de derivadas compostas?",
      "Qual a relação entre derivadas e taxas de variação instantânea?",
    ],
    quiz: [
      { type: "mc", question: "A derivada de uma função representa geometricamente:", options: ["A área sob a curva", "A inclinação da reta tangente", "O valor máximo da função", "O ponto de interseção com o eixo Y"], answer: 1 },
      { type: "vf", question: "A Regra da Cadeia é usada para derivar funções compostas.", answer: true },
      { type: "mc", question: "A notação dy/dx foi introduzida por:", options: ["Newton", "Leibniz", "Euler", "Gauss"], answer: 1 },
      { type: "vf", question: "Toda função contínua é derivável em todos os pontos.", answer: false },
    ],
    reviewSchedule: buildReviewSchedule(Date.now() - 2 * DAY_MS).map((r, i) => i === 0 ? { ...r, done: true } : r),
  },
  {
    id: "s2",
    subject: "História",
    subjectIcon: "📗",
    subjectColor: "#16A34A",
    subjectBg: "#F0FDF4",
    topic: "Século XX",
    concept: "Segunda Guerra Mundial",
    time: "Há 6 dias",
    summary: "A Segunda Guerra Mundial foi o conflito armado mais destrutivo da história, envolvendo a maioria das nações do mundo entre 1939 e 1945. Dividiu o mundo em dois blocos: os Aliados e o Eixo. Resultou em mais de 70 milhões de mortes e remodelou completamente a geopolítica global.",
    concepts: ["Nazismo", "Holocausto", "Aliados", "Eixo", "Blitzkrieg"],
    keywords: ["1939-1945", "Hitler", "Segunda Guerra", "frentes de batalha", "rendição"],
    flashcards: [
      { front: "Quando ocorreu a Segunda Guerra Mundial?", back: "Entre 1939 e 1945, envolvendo a maioria das nações do mundo divididas entre Aliados e Eixo." },
      { front: "O que foi o Blitzkrieg?", back: "Tática de guerra relâmpago alemã que combinava aviação, blindados e infantaria motorizada para ataques rápidos e devastadores." },
      { front: "Quais formavam os países do Eixo?", back: "Principalmente Alemanha, Itália e Japão." },
      { front: "O que foi o Holocausto?", back: "O extermínio sistemático de cerca de 6 milhões de judeus e outras minorias pelo regime nazista." },
    ],
    questions: [
      "Quais foram as principais causas da Segunda Guerra Mundial?",
      "Como o Holocausto impactou a criação da ONU e os Direitos Humanos?",
      "Qual foi o papel do Brasil na Segunda Guerra Mundial?",
    ],
    quiz: [
      { type: "mc", question: "A Segunda Guerra Mundial ocorreu entre:", options: ["1914-1918", "1939-1945", "1945-1950", "1929-1939"], answer: 1 },
      { type: "vf", question: "O Brasil enviou tropas para lutar na Itália durante a guerra.", answer: true },
      { type: "mc", question: "O Blitzkrieg é uma tática caracterizada por:", options: ["Guerra de trincheiras", "Ataques navais isolados", "Ofensivas rápidas e coordenadas", "Bloqueio econômico"], answer: 2 },
    ],
    reviewSchedule: buildReviewSchedule(Date.now() - 6 * DAY_MS).map((r, i) => i <= 1 ? { ...r, done: true } : r),
  },
  {
    id: "s3",
    subject: "Química",
    subjectIcon: "🧪",
    subjectColor: "#EA580C",
    subjectBg: "#FFF7ED",
    topic: "Físico-Química",
    concept: "Ligações Químicas",
    time: "Há 15 dias",
    summary: "Ligações químicas são forças de atração que unem átomos formando moléculas ou compostos. Os três tipos principais são: iônica (transferência de elétrons entre metal e não metal), covalente (compartilhamento de elétrons entre não metais) e metálica (nuvem de elétrons livres entre átomos de metais).",
    concepts: ["Ligação Iônica", "Ligação Covalente", "Ligação Metálica", "Eletronegatividade"],
    keywords: ["elétrons de valência", "octeto", "compartilhamento", "transferência", "metais"],
    flashcards: [
      { front: "O que é uma ligação iônica?", back: "Transferência de elétrons entre um átomo metálico e um não metálico, formando íons de cargas opostas que se atraem." },
      { front: "O que é uma ligação covalente?", back: "Compartilhamento de pares de elétrons entre átomos, geralmente entre não metais." },
      { front: "O que é a regra do octeto?", back: "Tendência dos átomos de ganhar, perder ou compartilhar elétrons para atingir 8 elétrons na camada de valência." },
    ],
    questions: [
      "Qual a diferença entre ligação iônica e covalente?",
      "Por que os metais formam ligações metálicas e não covalentes?",
      "Como a eletronegatividade influencia o tipo de ligação formada?",
    ],
    quiz: [
      { type: "mc", question: "Uma ligação formada por transferência de elétrons é chamada de:", options: ["Covalente", "Metálica", "Iônica", "Dativa"], answer: 2 },
      { type: "vf", question: "Ligações covalentes envolvem compartilhamento de elétrons.", answer: true },
    ],
    reviewSchedule: buildReviewSchedule(Date.now() - 15 * DAY_MS).map((r, i) => i <= 2 ? { ...r, done: true } : r),
  },
  {
    id: "s4",
    subject: "Física",
    subjectIcon: "⚛️",
    subjectColor: "#7C3AED",
    subjectBg: "#EDE9FE",
    topic: "Eletrodinâmica",
    concept: "Leis de Ohm",
    time: "Há 1 dia",
    photo: exemploFisica,
    summary: "As Leis de Ohm descrevem a relação entre tensão (U), corrente elétrica (i) e resistência elétrica (R) em um circuito. A 1ª Lei mostra que, mantendo a temperatura constante, a corrente é diretamente proporcional à tensão aplicada. A 2ª Lei mostra que a resistência de um condutor depende de suas características físicas: comprimento, área da seção transversal e resistividade do material.",
    concepts: ["1ª Lei de Ohm", "2ª Lei de Ohm", "Resistividade", "Resistência Elétrica"],
    keywords: ["U = R · i", "R = ρ · L / A", "ohm (Ω)", "resistividade", "condutor"],
    flashcards: [
      { front: "Qual a fórmula da 1ª Lei de Ohm?", back: "U = R · i, onde U é a tensão, R é a resistência e i é a corrente elétrica." },
      { front: "O que diz a 2ª Lei de Ohm?", back: "A resistência elétrica de um condutor depende de suas características físicas e do material do qual é feito: R = ρ · L / A." },
      { front: "Qual a fórmula da 2ª Lei de Ohm?", back: "R = ρ · L / A, onde ρ é a resistividade, L o comprimento e A a área da seção transversal." },
      { front: "O que é resistividade (ρ)?", back: "Uma propriedade de cada material que indica sua resistência à passagem de corrente elétrica." },
      { front: "Qual a unidade SI de resistência elétrica?", back: "Ohm (Ω), onde 1 Ω = 1 V/A." },
    ],
    questions: [
      "Como a resistência varia com o comprimento e a área do condutor?",
      "Qual a diferença entre a 1ª e a 2ª Lei de Ohm?",
      "Por que materiais diferentes têm resistividades diferentes?",
    ],
    quiz: [
      { type: "mc", question: "Segundo a 1ª Lei de Ohm, mantendo a temperatura constante:", options: ["U e i são inversamente proporcionais", "U e i são diretamente proporcionais", "R não depende de U", "i não depende de U"], answer: 1 },
      { type: "vf", question: "A resistência elétrica é diretamente proporcional ao comprimento do condutor.", answer: true },
      { type: "vf", question: "Quanto maior a área da seção transversal, maior a resistência.", answer: false },
      { type: "mc", question: "A unidade de resistência elétrica no SI é:", options: ["Volt", "Ampère", "Ohm", "Watt"], answer: 2 },
    ],
    reviewSchedule: buildReviewSchedule(Date.now() - 1 * DAY_MS).map((r, i) => i === 0 ? { ...r, done: true } : r),
  },
  {
    id: "s5",
    subject: "Português",
    subjectIcon: "📖",
    subjectColor: "#DB2777",
    subjectBg: "#FDF2F8",
    topic: "Interpretação de Texto",
    concept: "Absolutismo",
    time: "Há 3 dias",
    photo: exemploPortugues,
    summary: "A partir do século XI, várias regiões da Europa iniciaram o processo de formação dos Estados modernos. A burguesia apoiou e foi importante nesse processo de centralização, pois tinha interesse em ampliar suas atividades comerciais, que seriam favorecidas com uma moeda única e um sistema de pesos e medidas. Nesse processo, os reis se tornaram a figura central dos Estados modernos. No início da Idade Moderna, os reis consolidaram seu poder.",
    concepts: ["Formação dos Estados Modernos", "Centralização do Poder", "Burguesia", "Absolutismo"],
    keywords: ["século XI", "burguesia", "centralização", "moeda única", "Idade Moderna"],
    flashcards: [
      { front: "Quando começou a formação dos Estados modernos na Europa?", back: "A partir do século XI, com o início do processo de centralização do poder em várias regiões." },
      { front: "Por que a burguesia apoiou a centralização do poder?", back: "Porque tinha interesse em ampliar suas atividades comerciais, favorecidas por uma moeda única e um sistema de pesos e medidas." },
      { front: "Quem se tornou a figura central dos Estados modernos?", back: "O rei, que consolidou seu poder no início da Idade Moderna." },
      { front: "O que a burguesia esperava ganhar com um sistema de pesos e medidas único?", back: "Facilidade para ampliar suas atividades comerciais entre as diferentes regiões." },
      { front: "Quando os reis consolidaram seu poder?", back: "No início da Idade Moderna." },
    ],
    questions: [
      "Qual foi o papel da burguesia no processo de centralização política?",
      "Como a criação de uma moeda única favoreceu o comércio?",
      "Por que o rei se tornou a figura central dos Estados modernos?",
    ],
    quiz: [
      { type: "mc", question: "A formação dos Estados modernos na Europa começou a partir de qual século?", options: ["Século IX", "Século XI", "Século XV", "Século XVIII"], answer: 1 },
      { type: "vf", question: "A burguesia se opôs ao processo de centralização do poder.", answer: false },
      { type: "mc", question: "O interesse da burguesia na centralização estava ligado a:", options: ["Expansão territorial militar", "Ampliação das atividades comerciais", "Redução de impostos religiosos", "Fim da servidão"], answer: 1 },
      { type: "vf", question: "No início da Idade Moderna, os reis consolidaram seu poder como figura central dos Estados.", answer: true },
    ],
    reviewSchedule: buildReviewSchedule(Date.now() - 3 * DAY_MS).map((r, i) => i === 0 ? { ...r, done: true } : r),
  },
];

// Pool of possible "captures" — the demo camera cycles through these to
// simulate different content being recognized, instead of always the same one.
// Only items with a real captured photo are eligible, so the viewfinder and
// summary card always show a matching real image.
export const CAPTURE_POOL = SAMPLE_ITEMS.filter(i => i.photo);
let captureIndex = 0;
export function peekCaptureTemplate() {
  return CAPTURE_POOL[captureIndex % CAPTURE_POOL.length];
}
export function nextCaptureTemplate() {
  const template = peekCaptureTemplate();
  captureIndex += 1;
  return template;
}
