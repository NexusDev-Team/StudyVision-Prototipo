import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import LogoSVG from "../components/brand/LogoSVG";
import VisionPlusButton from "../components/plus/VisionPlusButton";
import SectionLabel from "../components/ui/SectionLabel";
import Card from "../components/ui/Card";
import ProgressRing from "../components/ui/ProgressRing";
import EmptyState from "../components/ui/EmptyState";
import SubjectProgress from "../components/plus/SubjectProgress";
import ReviewNeededCard from "../components/plus/ReviewNeededCard";
import InsightsPanel from "../components/plus/InsightsPanel";
import PlusPaywall from "../components/plus/PlusPaywall";
import PlusFinalCta from "../components/plus/PlusFinalCta";
import SparkChart from "../components/ui/SparkChart";
import Button from "../components/ui/Button";
import KnowledgeFlameCard from "../components/study/KnowledgeFlameCard";
import { useContentStore } from "../context/ContentStoreContext.jsx";
import {
  getEvolutionSummary,
  getSubjectPerformances,
  getProgressHistory,
  getWeakContents,
  getReviewProgress,
  getStrongSubjects,
  getRecommendations,
  getAccuracyDelta,
  getSubjectsToReview,
} from "../services/evolutionService";
import { getKnowledgeFlameState } from "../services/knowledgeFlameService";

function StatCard({ value, label, delay = 0 }) {
  return (
    <Card initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} style={{ padding: "16px", margin: 0 }}>
      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 18, fontWeight: 800, color: "#111827", margin: "0 0 2px" }}>{value}</p>
      <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#64748B", margin: 0 }}>{label}</p>
    </Card>
  );
}

// Tela de evolução (Fase 5) — todo valor vem de evolutionService, nunca
// calculado aqui. Os cálculos ficam em useMemo presos ao snapshot do store
// para a tela refletir mutações (quiz respondido, review concluída) sem
// depender só do remount de navegação.
export default function EvolutionScreen({ isPremium, onOpenContent, onOpenLibrary, onOpenReview, onVisionPlus, onStartTrial }) {
  const { contents, reviews } = useContentStore();

  const summary = useMemo(() => getEvolutionSummary(), [contents, reviews]);
  const subjectRows = useMemo(
    () => getSubjectPerformances().map((s) => ({ id: s.subjectId, name: s.name, accuracyRate: s.accuracy })),
    [contents]
  );
  const history = useMemo(() => getProgressHistory({ weeks: 8 }), [contents]);
  const weakContents = useMemo(() => getWeakContents({ limit: 5 }), [contents, reviews]);
  const reviewProgress = useMemo(() => getReviewProgress(), [reviews]);
  const strongSubjects = useMemo(
    () => getStrongSubjects({ limit: 3 }).map((s) => ({ id: s.subjectId, name: s.name, accuracyRate: s.accuracy })),
    [contents]
  );
  const recommendations = useMemo(() => getRecommendations({ limit: 3 }), [contents, reviews]);
  const delta = useMemo(() => getAccuracyDelta(), [contents]);
  const subjectsToReview = useMemo(() => getSubjectsToReview(), [contents, reviews]);
  const flameState = useMemo(() => getKnowledgeFlameState(), [contents, reviews]);

  const historyAccuracies = history.map((h) => h.accuracy ?? 0);
  const yLabels = history.length >= 2
    ? { max: `${Math.max(...historyAccuracies)}%`, min: `${Math.min(...historyAccuracies)}%` }
    : null;

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#F8FAFC", fontFamily: "Inter,sans-serif", overflow: "hidden" }}>
      <div style={{ background: "white", padding: "52px 20px 16px", borderBottom: "1px solid #F1F5F9", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <LogoSVG size={24} />
            <span style={{ fontSize: 11, fontWeight: 700, color: "#2563EB", letterSpacing: 1 }}>STUDY VISION</span>
          </div>
          <VisionPlusButton onClick={onVisionPlus} />
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
            <KnowledgeFlameCard state={flameState} />

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
            <ReviewNeededCard subjects={subjectsToReview} onSelect={onOpenLibrary} />

            <SubjectProgress subjects={subjectRows} onSelect={onOpenLibrary} />

            <SectionLabel>Evolução</SectionLabel>
            <PlusPaywall
              locked={!isPremium}
              compact
              title="Acompanhe sua evolução ao longo do tempo"
              onStartTrial={onVisionPlus}
            >
              {history.length < 2 ? (
                <Card style={{ padding: "22px 20px", margin: "0 0 20px", textAlign: "center" }}>
                  <p style={{ fontFamily: "Inter,sans-serif", fontSize: 13, color: "#64748B", margin: 0 }}>
                    Responda questões para acompanhar sua evolução ao longo do tempo.
                  </p>
                </Card>
              ) : (
                <Card style={{ padding: "18px 20px", margin: "0 0 20px" }}>
                  <SparkChart
                    points={historyAccuracies}
                    labels={history.map((h) => h.label)}
                    yLabels={yLabels}
                    height={140}
                  />
                  <ul aria-label="Evolução semanal da taxa de acerto" style={{ listStyle: "none", margin: "14px 0 0", padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    {history.map((h) => (
                      <li key={h.weekStart} style={{ fontFamily: "Inter,sans-serif", fontSize: 12, color: "#64748B" }}>
                        Semana {h.label} — {h.answered} {h.answered === 1 ? "questão" : "questões"}, {h.accuracy}% de acerto
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </PlusPaywall>

            <SectionLabel>Reviews</SectionLabel>
            <Card style={{ padding: "18px 20px", margin: "0 0 20px" }}>
              <div style={{ display: "flex", gap: 16, marginBottom: reviewProgress.contentsInReview.length > 0 ? 14 : 0 }}>
                <div>
                  <p style={{ fontFamily: "Inter,sans-serif", fontSize: 18, fontWeight: 800, color: "#111827", margin: 0 }}>{reviewProgress.pending}</p>
                  <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: "#64748B", margin: 0 }}>pendentes</p>
                </div>
                <div>
                  <p style={{ fontFamily: "Inter,sans-serif", fontSize: 18, fontWeight: 800, color: "#111827", margin: 0 }}>{reviewProgress.completed}</p>
                  <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: "#64748B", margin: 0 }}>concluídas</p>
                </div>
                <div>
                  <p style={{ fontFamily: "Inter,sans-serif", fontSize: 18, fontWeight: 800, color: reviewProgress.overdue > 0 ? "#DC2626" : "#111827", margin: 0 }}>
                    {reviewProgress.overdue}
                  </p>
                  <p style={{ fontFamily: "Inter,sans-serif", fontSize: 11, color: "#64748B", margin: 0 }}>atrasadas</p>
                </div>
              </div>

              {reviewProgress.contentsInReview.length === 0 ? (
                <p style={{ fontFamily: "Inter,sans-serif", fontSize: 12.5, color: "#94A3B8", margin: "0 0 12px" }}>
                  Nenhuma revisão pendente. Elas aparecem aqui depois que você estuda um conteúdo.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                  {reviewProgress.contentsInReview.slice(0, 3).map((r, i) => (
                    <div key={`${r.contentId}-${i}`} style={{ display: "flex", justifyContent: "space-between", fontFamily: "Inter,sans-serif", fontSize: 12.5 }}>
                      <span style={{ color: "#111827", fontWeight: 600 }}>{r.title}</span>
                      <span style={{ color: "#64748B" }}>{r.reasonLabel}</span>
                    </div>
                  ))}
                </div>
              )}

              <Button variant="outline" onClick={onOpenReview} style={{ width: "100%", height: 44 }}>
                Ver revisões
              </Button>
            </Card>

            <SectionLabel>Insights</SectionLabel>
            <PlusPaywall
              locked={!isPremium}
              compact
              title="Ver insights da sua evolução"
              onStartTrial={onVisionPlus}
            >
              <InsightsPanel
                delta={delta}
                strongSubjects={strongSubjects}
                weakContents={weakContents}
                recommendations={recommendations}
                onOpenContent={onOpenContent}
              />
            </PlusPaywall>

            {!isPremium && (
              <div style={{ marginTop: 8 }}>
                <PlusFinalCta onStartTrial={onStartTrial} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
