import Card from "../ui/Card";
import SectionLabel from "../ui/SectionLabel";
import Badge from "../ui/Badge";

// Renders the RESUMO / CONCEITOS / PALAVRAS-CHAVE trio shared by SummaryScreen
// and ContentDetailScreen. They differ only in label wording, concept pill
// color (fixed blue on Summary vs. the item's subject color on Detail),
// entrance delay/margin and motion.div spread props.
export default function ContentBlocks({ item, variant = "summary" }) {
  const isSummary = variant === "summary";
  const conceptsLabel = isSummary ? "CONCEITOS ENCONTRADOS" : "CONCEITOS";
  const conceptColor = isSummary ? "#2563EB" : item.subjectColor;
  const conceptBg = isSummary ? "#EFF6FF" : item.subjectBg;
  const marginBottom = isSummary ? 12 : 10;
  const delays = isSummary ? [0.25, 0.35, 0.45] : [0.08, 0.16, 0.24];

  return (
    <>
      <Card style={{ marginBottom }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delays[0] }}>
        <SectionLabel>RESUMO INTELIGENTE</SectionLabel>
        <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, lineHeight: 1.75, color: "#374151", margin: 0 }}>{item.summary}</p>
      </Card>

      <Card style={{ marginBottom }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delays[1] }}>
        <SectionLabel>{conceptsLabel}</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {item.concepts.map((c, i) => (
            <Badge key={i} color={conceptColor} background={conceptBg} fontSize={12} fontWeight={600} padding="5px 14px">{c}</Badge>
          ))}
        </div>
      </Card>

      <Card style={{ marginBottom }} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delays[2] }}>
        <SectionLabel>PALAVRAS-CHAVE</SectionLabel>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {item.keywords.map((k, i) => (
            <Badge key={i} color="#64748B" background="#F1F5F9" fontSize={12} fontWeight={500} padding="4px 12px">#{k}</Badge>
          ))}
        </div>
      </Card>
    </>
  );
}
