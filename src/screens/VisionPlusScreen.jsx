import { ChevronLeft } from "lucide-react";
import Screen from "../components/layout/Screen";
import ScrollArea from "../components/layout/ScrollArea";

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
        {/* Header, hero e dashboard entram nas próximas tarefas do plano */}
      </ScrollArea>
    </Screen>
  );
}
