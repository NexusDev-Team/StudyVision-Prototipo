import { TrendingUp } from "lucide-react";
import LogoSVG from "../components/brand/LogoSVG";
import SectionLabel from "../components/ui/SectionLabel";
import Card from "../components/ui/Card";
import ProgressRing from "../components/ui/ProgressRing";
import EmptyState from "../components/ui/EmptyState";
import PerformanceChart from "../components/plus/PerformanceChart";
import SubjectProgress from "../components/plus/SubjectProgress";
import SparkChart from "../components/ui/SparkChart";
import { getEvolutionSummary, getSubjectPerformances, getProgressHistory } from "../services/evolutionService";

function StatCard({ value, label, delay = 0 }) {
  return (
    <Card initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} style={{ padding: "16px", margin: 0 }}>
      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 18, fontWeight: 800, color: "#111827", margin: "0 0 2px" }}>{value}</p>
      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#64748B", margin: 0 }}>{label}</p>
    </Card>
  );
}

// Tela de evolução (Fase 5) — todo valor vem de evolutionService, nunca
// calculado aqui. RESUMO e DESEMPENHO (T11); demais seções nas próximas
// tarefas.
export default function EvolutionScreen({ isPremium, onOpenContent, onOpenLibrary, onOpenReview, onVisionPlus }) {
  const summary = getEvolutionSummary();
  const subjectRows = getSubjectPerformances().map((s) => ({ id: s.subjectId, name: s.name, accuracyRate: s.accuracy }));
  const history = getProgressHistory({ weeks: 8 });

  const breakdown = {
    not_started: summary.notStartedContents,
    needs_review: summary.needsReviewContents,
    developing: summary.developingContents,
    mastered: summary.masteredContents,
  };

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
        {summary.totalContents === 0 ? (
          <EmptyState
            icon={<TrendingUp size={32} color="#94A3B8" style={{ margin: "0 auto 12px" }} />}
            title="Você ainda não tem dados de evolução"
            description="Capture seu primeiro conteúdo e comece a estudar para acompanhar seu progresso."
          />
        ) : (
          <>
            <SectionLabel>Resumo</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <StatCard value={summary.contentsStudied} label="conteúdos estudados" />
              <StatCard value={summary.questionsAnswered} label="questões respondidas" delay={0.05} />
              <StatCard
                value={summary.overallAccuracy != null ? `${summary.overallAccuracy}%` : "Sem dados ainda"}
                label="taxa de acerto"
                delay={0.1}
              />
              <StatCard value={summary.reviewsCompleted} label="reviews concluídas" delay={0.15} />
            </div>

            <SectionLabel>Desempenho</SectionLabel>
            <Card style={{ padding: "18px 20px", margin: "0 0 20px", display: "flex", alignItems: "center", gap: 16 }}>
              <ProgressRing value={summary.overallAccuracy ?? 0} size={72} stroke={8} color="#2563EB">
                <span style={{ fontFamily: "Inter,sans-serif", fontSize: 18, fontWeight: 800, color: "#111827" }}>
                  {summary.overallAccuracy != null ? `${summary.overallAccuracy}%` : "—"}
                </span>
              </ProgressRing>
              <div>
                <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#64748B", margin: "0 0 4px", fontWeight: 600 }}>Desempenho geral</p>
                <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#94A3B8", margin: 0 }}>
                  {summary.overallAccuracy != null ? "quiz e flashcards combinados" : "responda um quiz ou revise flashcards"}
                </p>
              </div>
            </Card>
            <PerformanceChart breakdown={breakdown} hasActivity={summary.hasActivity} locked={false} />

            <SubjectProgress subjects={subjectRows} locked={false} onSelect={onOpenLibrary} />

            <SectionLabel>Evolução</SectionLabel>
            {history.length === 0 ? (
              <Card style={{ padding: "22px 20px", margin: "0 0 20px", textAlign: "center" }}>
                <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#64748B", margin: 0 }}>
                  Responda questões para acompanhar sua evolução ao longo do tempo.
                </p>
              </Card>
            ) : (
              <Card style={{ padding: "18px 20px", margin: "0 0 20px" }}>
                {history.length >= 2 && (
                  <SparkChart
                    points={history.map((h) => h.accuracy ?? 0)}
                    labels={history.map((h) => h.label)}
                  />
                )}
                <ul style={{ listStyle: "none", margin: history.length >= 2 ? "14px 0 0" : 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  {history.map((h) => (
                    <li key={h.weekStart} style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#64748B" }}>
                      Semana {h.label} — {h.answered} {h.answered === 1 ? "questão" : "questões"}, {h.accuracy}% de acerto
                    </li>
                  ))}
                </ul>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
