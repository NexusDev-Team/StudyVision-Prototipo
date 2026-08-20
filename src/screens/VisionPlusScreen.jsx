import { ChevronLeft } from "lucide-react";
import Screen from "../components/layout/Screen";
import ScrollArea from "../components/layout/ScrollArea";
import PlusHeader from "../components/plus/PlusHeader";
import PlusHero from "../components/plus/PlusHero";
import MetricCards from "../components/plus/MetricCards";
import SubjectProgress from "../components/plus/SubjectProgress";
import PerformanceChart from "../components/plus/PerformanceChart";
import StrengthsCard from "../components/plus/StrengthsCard";
import AttentionCard from "../components/plus/AttentionCard";
import InsightCard from "../components/plus/InsightCard";
import PremiumFeatures from "../components/plus/PremiumFeatures";

export default function VisionPlusScreen({ onBack, isPlus, daysRemaining, onStartTrial, onResetToFree, onToast }) {
  return (
    <Screen>
      <div style={{ padding: "52px 20px 0", flexShrink: 0 }}>
        <button onClick={onBack} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
          <ChevronLeft size={20} color="#64748B" />
          <span style={{ fontSize: 14, fontWeight: 600, color: "#64748B" }}>Voltar</span>
        </button>
      </div>
      <ScrollArea padding="18px 20px 30px" flexColumn>
        <PlusHeader />
        {!isPlus && <PlusHero onStartTrial={onStartTrial} />}
        <MetricCards />
        <SubjectProgress locked={!isPlus} onStartTrial={onStartTrial} />
        <PerformanceChart locked={!isPlus} onStartTrial={onStartTrial} />
        <StrengthsCard />
        <AttentionCard hideNames={!isPlus} />
        <InsightCard locked={!isPlus} onStartTrial={onStartTrial} />
        <PremiumFeatures />
        {/* Comparação de planos entra em T3.1 */}
      </ScrollArea>
    </Screen>
  );
}
