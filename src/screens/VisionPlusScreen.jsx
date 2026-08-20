import { useRef } from "react";
import { ChevronLeft } from "lucide-react";
import Screen from "../components/layout/Screen";
import ScrollArea from "../components/layout/ScrollArea";
import PlusHeader from "../components/plus/PlusHeader";
import PlusHero from "../components/plus/PlusHero";
import PlusActiveStatus from "../components/plus/PlusActiveStatus";
import MetricCards from "../components/plus/MetricCards";
import SubjectProgress from "../components/plus/SubjectProgress";
import PerformanceChart from "../components/plus/PerformanceChart";
import StrengthsCard from "../components/plus/StrengthsCard";
import AttentionCard from "../components/plus/AttentionCard";
import InsightCard from "../components/plus/InsightCard";
import PremiumFeatures from "../components/plus/PremiumFeatures";
import PlanComparison from "../components/plus/PlanComparison";

export default function VisionPlusScreen({ onBack, isPlus, daysRemaining, onStartTrial, onResetToFree, onToast }) {
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
        {isPlus ? <PlusActiveStatus daysRemaining={daysRemaining} /> : <PlusHero onStartTrial={handleStartTrial} />}
        <MetricCards />
        <SubjectProgress locked={!isPlus} onStartTrial={handleStartTrial} />
        <PerformanceChart locked={!isPlus} onStartTrial={handleStartTrial} />
        <StrengthsCard />
        <AttentionCard hideNames={!isPlus} />
        <InsightCard locked={!isPlus} onStartTrial={handleStartTrial} />
        <PremiumFeatures />
        <PlanComparison />
        {isPlus && (
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: "#94A3B8", textAlign: "center", margin: "4px 0 0" }}>
            Depois do teste, R$ 9,90/mês · cancele quando quiser
          </p>
        )}
      </ScrollArea>
    </Screen>
  );
}
