import { Sparkles } from "lucide-react";
import PlusPaywall from "./PlusPaywall";

// Sem texto fabricado: enquanto não há atividade, estado vazio; com dados,
// uma frase estritamente factual montada a partir dos números medidos.
function buildInsight(summary) {
  const { questionsAnswered, questionsCorrect, flashcardsReviewed, masteryBreakdown } = summary;
  const parts = [];
  if (questionsAnswered > 0) {
    parts.push(`Você respondeu ${questionsAnswered} questões de quiz, acertando ${questionsCorrect}.`);
  }
  if (flashcardsReviewed > 0) {
    parts.push(`Revisou ${flashcardsReviewed} flashcards.`);
  }
  if (masteryBreakdown.mastered > 0) {
    parts.push(`${masteryBreakdown.mastered} conteúdo(s) já em nível "Dominado".`);
  }
  return parts.join(" ");
}

export default function InsightCard({ summary, locked, onStartTrial }) {
  const text = summary.hasActivity ? buildInsight(summary) : "";

  return (
    <div style={{ marginBottom: 20 }}>
      <PlusPaywall locked={locked} compact title="Ver insight completo" onStartTrial={onStartTrial}>
        <div style={{ borderRadius: 20, padding: "18px 20px", background: "linear-gradient(135deg,#EFF6FF,#EDE9FE)", border: "1px solid #DDD6FE" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Sparkles size={16} color="#7C3AED" />
            <span style={{ fontFamily: "Inter,sans-serif", fontSize: 13, fontWeight: 800, color: "#6D28D9" }}>Seu resumo</span>
          </div>
          <p style={{ fontFamily: "Inter,sans-serif", fontSize: 14, color: "#111827", lineHeight: 1.55, margin: 0 }}>
            {text || "Continue estudando para desbloquear análises do seu desempenho."}
          </p>
        </div>
      </PlusPaywall>
    </div>
  );
}
