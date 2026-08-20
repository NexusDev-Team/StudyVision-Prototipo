import { BarChart3, Infinity as InfinityIcon, CreditCard, HelpCircle, Lightbulb } from "lucide-react";
import Card from "../ui/Card";
import SectionLabel from "../ui/SectionLabel";
import Flashcard from "../study/Flashcard";
import QuizQuestion from "../study/QuizQuestion";
import { SAMPLE_ITEMS } from "../../data/sampleContent";

const previewItem = SAMPLE_ITEMS[0];

const SIMPLE_FEATURES = [
  { icon: BarChart3, title: "Análise de evolução", desc: "Entenda seu desempenho por matéria, tópico e período.", color: "#2563EB" },
  { icon: InfinityIcon, title: "Materiais ilimitados", desc: "Crie quantos flashcards, quizzes e materiais personalizados precisar.", color: "#7C3AED" },
  { icon: Lightbulb, title: "Insights inteligentes", desc: "Descubra quais conteúdos merecem mais atenção.", color: "#F59E0B" },
];

export default function PremiumFeatures() {
  return (
    <div id="plus-features" style={{ marginBottom: 20 }}>
      <SectionLabel>Desbloqueie seu potencial</SectionLabel>

      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
        {SIMPLE_FEATURES.map(f => (
          <Card key={f.title} style={{ padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${f.color}1A`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <f.icon size={18} color={f.color} />
            </div>
            <div>
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, fontWeight: 700, color: "#111827", margin: "0 0 2px" }}>{f.title}</p>
              <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#64748B", margin: 0, lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <CreditCard size={14} color="#7C3AED" />
        <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#111827" }}>Flashcards personalizados</span>
      </div>
      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#64748B", margin: "0 0 10px" }}>Crie flashcards personalizados a partir dos seus conteúdos.</p>
      <div style={{ pointerEvents: "none", marginBottom: 20 }}>
        <Flashcard card={previewItem.flashcards[0]} index={0} flipped={false} onFlip={() => {}} />
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
        <HelpCircle size={14} color="#2563EB" />
        <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 700, color: "#111827" }}>Quizzes personalizados</span>
      </div>
      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#64748B", margin: "0 0 10px" }}>Teste seu conhecimento com quizzes gerados a partir do que você estudou.</p>
      <div style={{ pointerEvents: "none" }}>
        <QuizQuestion q={previewItem.quiz[0]} index={0} selected={null} onChoose={() => {}} onNext={() => {}} isLast={false} />
      </div>
    </div>
  );
}
