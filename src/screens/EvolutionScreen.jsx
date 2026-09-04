import LogoSVG from "../components/brand/LogoSVG";
import SectionLabel from "../components/ui/SectionLabel";

// Esqueleto da tela de evolução (Fase 5, T10) — header e seções vazias;
// cada seção ganha dados reais nas tarefas seguintes (T11-T16).
export default function EvolutionScreen({ isPremium, onOpenContent, onOpenLibrary, onOpenReview, onVisionPlus }) {
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F8FAFC", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      <div style={{ background: "white", padding: "52px 20px 16px", borderBottom: "1px solid #F1F5F9", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <LogoSVG size={24} />
          <span style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", letterSpacing: 1 }}>STUDY VISION</span>
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#111827", margin: 0 }}>Minha evolução</h1>
        <p style={{ fontSize: 13, color: "#64748B", margin: "2px 0 0" }}>Acompanhe como você está aprendendo.</p>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 24px" }}>
        <SectionLabel>Resumo</SectionLabel>
        <SectionLabel style={{ marginTop: 24 }}>Desempenho</SectionLabel>
        <SectionLabel style={{ marginTop: 24 }}>Matérias</SectionLabel>
        <SectionLabel style={{ marginTop: 24 }}>Evolução</SectionLabel>
        <SectionLabel style={{ marginTop: 24 }}>Precisa de reforço</SectionLabel>
        <SectionLabel style={{ marginTop: 24 }}>Reviews</SectionLabel>
        <SectionLabel style={{ marginTop: 24 }}>Pontos fortes</SectionLabel>
        <SectionLabel style={{ marginTop: 24 }}>Insights</SectionLabel>
      </div>
    </div>
  );
}
