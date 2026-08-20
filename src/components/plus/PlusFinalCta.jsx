import { Sparkles } from "lucide-react";
import Button from "../ui/Button";

// Closing CTA at the end of the page — the last of the four intentional
// placements (hero, blocked sections, benefícios, final), not a fifth extra.
export default function PlusFinalCta({ onStartTrial }) {
  return (
    <div style={{ textAlign: "center", marginTop: 4 }}>
      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 12px" }}>
        Estude. Revise. Evolua.
      </p>
      <Button variant="primary" onClick={onStartTrial} style={{ width: "100%", height: 52, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <Sparkles size={17} />
        Começar 7 dias grátis
      </Button>
      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#94A3B8", margin: "10px 0 0" }}>R$ 9,90/mês depois do teste · cancele quando quiser</p>
    </div>
  );
}
