// Parser puro do "summary" (string única) gerado pela IA — sem React, sem DOM,
// testável em node. Reconhece os marcadores que o Modo Inclusão instrui a IA a
// emitir (ver lib/prompts.js): "- "/"• " = item de lista; "1. "/"1)" = item
// numerado (ou etapa, ver `stepMode`); linha terminada em ":" = subtítulo;
// "Etapa N:"/"Passo N:" = etapa de processo, isolada OU com texto na mesma
// linha. Um resumo sem "\n" (todo o conteúdo legado) cai num único parágrafo,
// visualmente idêntico ao anterior.
//
// `stepMode` (true quando a preferência "manySteps" está ativa) muda como uma
// lista numerada solta ("1. texto") é interpretada: sem stepMode ela é um
// item de lista ordenada de verdade (comportamento legado, intocado); com
// stepMode ela vira um bloco de etapa — fallback para quando o modelo, apesar
// do prompt, ainda devolve a numeração compacta que a necessidade existe para
// evitar.
//
// Tipos de bloco devolvidos: "heading", "paragraph", "list" ({ordered, items})
// e "step" ({number, label, text}) — `text` vem preenchido quando a etapa e o
// texto estavam na mesma linha; vazio quando a etapa era um cabeçalho isolado
// (o corpo chega como blocos de parágrafo seguintes).

const BULLET_RE = /^[-•]\s+(.*)$/;
const NUMBERED_RE = /^(\d+)[.)]\s+(.*)$/;
const STEP_ISOLATED_RE = /^(?:Etapa|Passo)\s+(\d+)\s*:?\s*$/iu;
const STEP_INLINE_RE = /^(?:Etapa|Passo)\s+(\d+)\s*:\s+(\S.*)$/iu;

// Rótulo curto no início da linha: 1ª letra maiúscula, só letras/espaços antes
// do ":". "u" para acentos (Conceito, Aplicação). Etapa/Passo com número tem
// regex própria acima — esta cobre os demais rótulos ("Rótulo: texto").
const INLINE_LABEL_RE = /^(\p{Lu}[\p{L} ]{1,26}):\s+(\S.*)$/u;

export function parseSummaryBlocks(text, { stepMode = false } = {}) {
  const raw = String(text || "");
  const lines = raw.split("\n");
  if (lines.length <= 1) return [{ kind: "paragraph", text: raw }];

  const blocks = [];
  let list = null; // { ordered: boolean, items: string[] }

  const flushList = () => {
    if (!list) return;
    blocks.push({ kind: "list", ordered: list.ordered, items: list.items });
    list = null;
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) { flushList(); return; }

    const stepIsolated = trimmed.match(STEP_ISOLATED_RE);
    if (stepIsolated) {
      flushList();
      blocks.push({ kind: "step", number: stepIsolated[1], label: `Etapa ${stepIsolated[1]}:`, text: "" });
      return;
    }

    const stepInline = trimmed.match(STEP_INLINE_RE);
    if (stepInline) {
      flushList();
      blocks.push({ kind: "step", number: stepInline[1], label: `Etapa ${stepInline[1]}:`, text: stepInline[2] });
      return;
    }

    const bullet = trimmed.match(BULLET_RE);
    if (bullet) {
      if (!list || list.ordered) { flushList(); list = { ordered: false, items: [] }; }
      list.items.push(bullet[1]);
      return;
    }

    const numbered = trimmed.match(NUMBERED_RE);
    if (numbered) {
      if (stepMode) {
        // Fallback: o modelo devolveu lista numerada mesmo com manySteps
        // ativo. Em vez de renderizar a pilha compacta que a necessidade
        // existe para evitar, cada item vira um bloco de etapa.
        flushList();
        blocks.push({ kind: "step", number: numbered[1], label: `Etapa ${numbered[1]}:`, text: numbered[2] });
        return;
      }
      if (!list || !list.ordered) { flushList(); list = { ordered: true, items: [] }; }
      list.items.push(numbered[2]);
      return;
    }

    flushList();

    // Subtítulo sozinho na linha (formato canônico).
    if (/:$/.test(trimmed) && trimmed.length <= 60) {
      blocks.push({ kind: "heading", text: trimmed });
      return;
    }
    // Tolerância: "Rótulo: texto" na mesma linha → subtítulo + parágrafo.
    const inline = trimmed.match(INLINE_LABEL_RE);
    if (inline) {
      blocks.push({ kind: "heading", text: `${inline[1]}:` });
      blocks.push({ kind: "paragraph", text: inline[2] });
      return;
    }
    blocks.push({ kind: "paragraph", text: trimmed });
  });
  flushList();

  return blocks;
}
