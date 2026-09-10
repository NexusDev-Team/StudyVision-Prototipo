import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import Card from "../ui/Card";
import SectionLabel from "../ui/SectionLabel";
import Badge from "../ui/Badge";
import { getSubjectVisual } from "../../constants";

const P_STYLE = { fontFamily: "Inter,sans-serif", fontSize: 14, lineHeight: 1.75, color: "#374151", margin: 0 };

// Renderiza o resumo (string única) reconhecendo os marcadores que o Modo
// Inclusão (Visual / Passo a passo) instrui a IA a emitir — ver lib/prompts.js.
// CONTRATO: "- "/"• " no início da linha = item de lista; "1. "/"1) " = etapa
// numerada; linha terminada em ":" = subtítulo. Tolerância: se a IA juntar
// "Rótulo: texto" na mesma linha, o rótulo vira subtítulo e o texto, parágrafo.
// Um resumo sem "\n" (todo o conteúdo legado) cai no caminho de um único <p>,
// visualmente idêntico ao anterior.
const H_STYLE = { ...P_STYLE, fontWeight: 700, color: "#1F2937", margin: "8px 0 2px" };
// Rótulo curto no início da linha: 1ª letra maiúscula, só letras/espaços antes
// do ":". "u" para acentos (Conceito, Aplicação).
const INLINE_LABEL_RE = /^(\p{Lu}[\p{L} ]{1,26}):\s+(\S.*)$/u;

function SummaryBody({ text }) {
  const raw = String(text || "");
  const lines = raw.split("\n");
  if (lines.length <= 1) return <p style={P_STYLE}>{raw}</p>;

  const blocks = [];
  let list = null; // { ordered: boolean, items: string[] }

  const flushList = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={`l${blocks.length}`} style={{ margin: "4px 0 8px", paddingLeft: 20, ...P_STYLE }}>
        {list.items.map((it, i) => (
          <li key={i} style={{ marginBottom: 4 }}>{it}</li>
        ))}
      </Tag>
    );
    list = null;
  };

  const pushHeading = (label, key) => blocks.push(<p key={key} style={H_STYLE}>{label}</p>);
  const pushParagraph = (t, key) => blocks.push(<p key={key} style={{ ...P_STYLE, marginBottom: 6 }}>{t}</p>);

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) { flushList(); return; }

    const bullet = trimmed.match(/^[-•]\s+(.*)$/);
    const step = trimmed.match(/^\d+[.)]\s+(.*)$/);

    if (bullet) {
      if (!list || list.ordered) { flushList(); list = { ordered: false, items: [] }; }
      list.items.push(bullet[1]);
      return;
    }
    if (step) {
      if (!list || !list.ordered) { flushList(); list = { ordered: true, items: [] }; }
      list.items.push(step[1]);
      return;
    }

    flushList();

    // Subtítulo sozinho na linha (formato canônico).
    if (/:$/.test(trimmed) && trimmed.length <= 60) {
      pushHeading(trimmed, `h${idx}`);
      return;
    }
    // Tolerância: "Rótulo: texto" na mesma linha → subtítulo + parágrafo.
    const inline = trimmed.match(INLINE_LABEL_RE);
    if (inline) {
      pushHeading(`${inline[1]}:`, `hi${idx}`);
      pushParagraph(inline[2], `pi${idx}`);
      return;
    }
    pushParagraph(trimmed, `p${idx}`);
  });
  flushList();

  return <div>{blocks}</div>;
}

// Renders the RESUMO / CONCEITOS / PALAVRAS-CHAVE trio shared by SummaryScreen
// and ContentDetailScreen. They differ only in label wording, concept pill
// color (fixed blue on Summary vs. the content's subject color on Detail),
// entrance delay/margin and motion.div spread props.
//
// `onSaveSummary` habilita edição do resumo gerado pela IA — só faz sentido no
// detalhe (variant="detail"); a SummaryScreen nunca passa essa prop.
export default function ContentBlocks({ content, variant = "summary", onSaveSummary }) {
  const isSummary = variant === "summary";
  const visual = getSubjectVisual(content.subjectName);
  const conceptsLabel = isSummary ? "CONCEITOS ENCONTRADOS" : "CONCEITOS";
  const conceptColor = isSummary ? "#2563EB" : visual.color;
  const conceptBg = isSummary ? "#EFF6FF" : visual.bg;
  const marginBottom = isSummary ? 12 : 10;
  const delays = isSummary ? [0.25, 0.35, 0.45] : [0.08, 0.16, 0.24];

  const [editingSummary, setEditingSummary] = useState(false);
  const [summaryDraft, setSummaryDraft] = useState(content.summary);

  const handleStartEdit = () => {
    setSummaryDraft(content.summary);
    setEditingSummary(true);
  };

  const handleSaveSummary = () => {
    onSaveSummary(summaryDraft);
    setEditingSummary(false);
  };

  return (
    <>
      <Card style={{ marginBottom }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delays[0] }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <SectionLabel>RESUMO INTELIGENTE</SectionLabel>
          {onSaveSummary && !editingSummary && (
            <button onClick={handleStartEdit} aria-label="Editar resumo"
              style={{ width: 28, height: 28, borderRadius: 8, background: "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Pencil size={13} color="#64748B" />
            </button>
          )}
        </div>
        {editingSummary ? (
          <>
            <textarea value={summaryDraft} onChange={(e) => setSummaryDraft(e.target.value)} rows={5}
              style={{ width: "100%", boxSizing: "border-box", resize: "vertical", border: "1.5px solid #E2E8F0", borderRadius: 12, padding: "10px 12px", fontFamily: "Inter,sans-serif", fontSize: 14, lineHeight: 1.65, color: "#374151", outline: "none" }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
              <button onClick={() => setEditingSummary(false)} aria-label="Cancelar edição do resumo"
                style={{ width: 36, height: 36, borderRadius: 10, background: "#F1F5F9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <X size={15} color="#64748B" />
              </button>
              <button onClick={handleSaveSummary} aria-label="Salvar resumo"
                style={{ width: 36, height: 36, borderRadius: 10, background: "#2563EB", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Check size={15} color="white" />
              </button>
            </div>
          </>
        ) : (
          <SummaryBody text={content.summary} />
        )}
      </Card>

      <Card style={{ marginBottom }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delays[1] }}>
        <SectionLabel>{conceptsLabel}</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {content.keyConcepts.map((c, i) => (
            <Badge key={i} color={conceptColor} background={conceptBg} fontSize={12} fontWeight={600} padding="5px 14px">{c}</Badge>
          ))}
        </div>
      </Card>

      <Card style={{ marginBottom }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delays[2] }}>
        <SectionLabel>PALAVRAS-CHAVE</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {content.keywords.map((k, i) => (
            <Badge key={i} color="#64748B" background="#F1F5F9" fontSize={12} fontWeight={500} padding="4px 12px">#{k}</Badge>
          ))}
        </div>
      </Card>
    </>
  );
}
