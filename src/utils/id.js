// Identificadores estáveis para as entidades do modelo de dados.
// Cada entidade recebe um prefixo curto para que um id solto continue legível
// em logs e no localStorage ("cnt_...", "fc_...") sem precisar de contexto.
export const ID_PREFIX = {
  content: "cnt",
  subject: "sub",
  image: "img",
  flashcard: "fc",
  quiz: "qz",
  question: "qs",
  openQuestion: "oq",
  flashcardAttempt: "fa",
  quizAttempt: "qa",
  review: "rev",
  event: "evt",
  focusSession: "fcs",
  focusStep: "fst",
};

function randomPart() {
  // crypto.randomUUID não existe em contexto inseguro (http em rede local) nem
  // em runtimes antigos — o fallback continua colidindo apenas se dois ids
  // forem gerados no mesmo milissegundo E sortearem o mesmo sufixo aleatório.
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
  }
  const rand = Math.random().toString(36).slice(2, 10);
  return `${Date.now().toString(36)}${rand}`;
}

export function newId(prefix = "id") {
  return `${prefix}_${randomPart()}`;
}
