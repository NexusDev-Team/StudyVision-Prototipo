import { useRef } from "react";
import { ChevronLeft } from "lucide-react";
import Screen from "../components/layout/Screen";
import ScrollArea from "../components/layout/ScrollArea";
import PlusHeader from "../components/plus/PlusHeader";
import PlusHero from "../components/plus/PlusHero";
import PlusActiveStatus from "../components/plus/PlusActiveStatus";
import PlanComparison from "../components/plus/PlanComparison";
import PlusFinalCta from "../components/plus/PlusFinalCta";
import { PLUS_PRICE_FULL } from "../constants";

// Tela de oferta do Study Vision+ (Fase 5) — vende profundidade e escala,
// não bloqueia o aprendizado básico. O dashboard de evolução em si vive na
// tela de Evolução (gratuita); esta tela só apresenta o plano e o CTA.
export default function VisionPlusScreen({ onBack, isPremium, isTrialActive, status, daysRemaining, onStartTrial, onResetToFree }) {
  const scrollRef = useRef(null);

  const handleStartTrial = () => {
    onStartTrial();
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <Screen>
      <div style={{ padding: "52px 20px 0", flexShrink: 0 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <ChevronLeft size={20} color="#64748B" />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#64748B" }}>Voltar</span>
        </button>
      </div>
      <ScrollArea ref={scrollRef} padding="18px 20px 30px" flexColumn>
        <PlusHeader onResetToFree={onResetToFree} />
        {isPremium ? (
          <PlusActiveStatus daysRemaining={daysRemaining} isTrialActive={isTrialActive} />
        ) : (
          <>
            {status === "expired" && (
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#B45309", textAlign: "center", margin: "0 0 16px" }}>
                Seu teste terminou — continue com {PLUS_PRICE_FULL}
              </p>
            )}
            <PlusHero onStartTrial={handleStartTrial} />
          </>
        )}

        <PlanComparison />

        {!isPremium && <PlusFinalCta onStartTrial={handleStartTrial} />}
      </ScrollArea>
    </Screen>
  );
}
