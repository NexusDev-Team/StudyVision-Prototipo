import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import Card from "../ui/Card";
import SectionLabel from "../ui/SectionLabel";
import Badge from "../ui/Badge";
import { getSubjectVisual } from "../../constants";
import { getPreferenceOptions } from "../../services/learningPreferencesService";
import { parseSummaryBlocks } from "../../utils/summaryBlocks";

const P_STYLE = { fontFamily: "Inter,sans-serif", fontSize: 14, lineHeight: 1.75, color: "#374151", margin: 0 };

// Perfil de leitura. `comfort` = necessidade "ler e acompanhar textos"
// (longText) ativa AGORA na preferência do usuário: mais espaço entre linhas e
// blocos, corpo ligeiramente maior, subtítulos mais destacados — vale para todo
// conteúdo, inclusive o antigo. `steps` = necessidade "acompanhar muitas
// etapas" (manySteps) ativa AGORA: mais respiro entre um bloco de etapa e o
// próximo. Os dois eixos são independentes e combináveis; ambos falsos →
// styles idênticos aos de antes.
function readingStyles(comfort, steps) {
  const p = comfort
    ? { ...P_STYLE, fontSize: 15, lineHeight: 2.05 }
    : P_STYLE;
  return {
    p,
    h: { ...p, fontWeight: 700, color: "#1F2937", margin: comfort ? "18px 0 6px" : "8px 0 2px" },
    paraMargin: comfort ? 12 : 6,
    liMargin: comfort ? 8 : 4,
    listMargin: comfort ? "6px 0 12px" : "4px 0 8px",
    listPad: comfort ? 24 : 20,
    stepGap: steps ? 20 : 10,
    stepPad: steps ? "14px 16px" : "10px 12px",
  };
}

// Pílula numerada + rótulo + parágrafo da etapa — nunca um item de <ol>. A
// hierarquia não depende só de cor: o número em pílula, o rótulo em negrito e
// o espaçamento do bloco já carregam a informação (contraste do texto sobre
// fundo claro ≥ 4.5:1).
function StepBlock({ number, label, text, s }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: s.stepPad, marginBottom: s.stepGap, background: "#F8FAFC", borderRadius: 12, borderLeft: "3px solid #2563EB" }}>
      <span aria-hidden="true" style={{ flexShrink: 0, width: 24, height: 24, borderRadius: "50%", background: "#2563EB", color: "white", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
        {number}
      </span>
      <div style={{ minWidth: 0 }}>
        <p style={{ ...s.p, fontWeight: 700, color: "#1F2937", margin: 0 }}>{label}</p>
        {text && <p style={{ ...s.p, margin: "2px 0 0" }}>{text}</p>}
      </div>
    </div>
  );
}

// Renderiza o resumo (string única) a partir dos blocos de src/utils/summaryBlocks.js
// (parser puro, testado em node — ver scripts/test-data-layer.mjs F12-9..16).
// `stepMode` (= manySteps ativo) manda o parser converter até uma lista
// numerada solta em blocos de etapa (fallback caso o modelo, apesar do
// prompt, ainda devolva a numeração compacta).
function SummaryBody({ text, comfort = false, stepMode = false }) {
  const s = readingStyles(comfort, stepMode);
  const blocks = parseSummaryBlocks(text, { stepMode });

  // Resumo sem "\n" (todo o conteúdo legado): um único <p>, sem marginBottom,
  // visualmente idêntico ao de antes da extração do parser.
  if (blocks.length === 1 && blocks[0].kind === "paragraph") {
    return <p style={s.p}>{blocks[0].text}</p>;
  }

  // Corpo de uma etapa isolada ("Etapa N:" sozinha na linha) chega como o
  // bloco de parágrafo seguinte — junta os dois na mesma StepBlock em vez de
  // exibir a etapa vazia seguida de um parágrafo solto.
  const merged = [];
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.kind === "step" && block.text === "" && blocks[i + 1]?.kind === "paragraph") {
      merged.push({ ...block, text: blocks[i + 1].text });
      i += 1;
      continue;
    }
    merged.push(block);
  }

  return (
    <div>
      {merged.map((block, i) => {
        const key = `b${i}`;
        if (block.kind === "step") {
          return <StepBlock key={key} number={block.number} label={block.label} text={block.text} s={s} />;
        }
        if (block.kind === "heading") {
          return <p key={key} style={s.h}>{block.text}</p>;
        }
        if (block.kind === "list") {
          const Tag = block.ordered ? "ol" : "ul";
          return (
            <Tag key={key} style={{ margin: s.listMargin, paddingLeft: s.listPad, ...s.p }}>
              {block.items.map((it, j) => (
                <li key={j} style={{ marginBottom: s.liMargin }}>{it}</li>
              ))}
            </Tag>
          );
        }
        return <p key={key} style={{ ...s.p, marginBottom: s.paraMargin }}>{block.text}</p>;
      })}
    </div>
  );
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
  // Conforto de leitura ("ler e acompanhar textos") e modo de etapas
  // ("acompanhar muitas etapas") — necessidades ativas AGORA na preferência do
  // usuário (não no snapshot do conteúdo), lidas uma vez.
  const [{ comfort, stepMode }] = useState(() => {
    try {
      const options = getPreferenceOptions();
      return { comfort: options.longText === true, stepMode: options.manySteps === true };
    } catch {
      return { comfort: false, stepMode: false };
    }
  });

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
          <SummaryBody text={content.summary} comfort={comfort} stepMode={stepMode} />
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
