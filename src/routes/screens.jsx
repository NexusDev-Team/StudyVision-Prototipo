// Wrappers de rota: leem params/query da URL e o estado compartilhado do
// AppShell (useShell) e passam tudo por props às telas, que continuam
// agnósticas de roteamento.
import { Navigate, Outlet, useParams, useSearchParams } from "react-router-dom";
import { useContentStore } from "../context/ContentStoreContext.jsx";
import { nextPendingReview, markReviewDone } from "../services/reviewService";
import { addImageToContent } from "../services/contentService";
import { useAppNavigation } from "../hooks/useAppNavigation";
import { useShell } from "../hooks/useShell";
import CameraScreen from "../screens/CameraScreen";
import AnalysisScreen from "../screens/AnalysisScreen";
import SummaryScreen from "../screens/SummaryScreen";
import LibraryScreen from "../screens/LibraryScreen";
import ContentDetailScreen from "../screens/ContentDetailScreen";
import FlashcardsScreen from "../screens/FlashcardsScreen";
import QuestionsScreen from "../screens/QuestionsScreen";
import QuizScreen from "../screens/QuizScreen";
import ReviewScreen from "../screens/ReviewScreen";
import EvolutionScreen from "../screens/EvolutionScreen";
import FocusScreen from "../screens/FocusScreen";
import ReadingScreen from "../screens/ReadingScreen";
import VisionPlusScreen from "../screens/VisionPlusScreen";

// Resolve :id no store; conteúdo inexistente (link velho, excluído) volta à biblioteca.
export function ContentGate() {
  const { id } = useParams();
  const { contents } = useContentStore();
  if (!contents.some((c) => c.id === id)) return <Navigate to="/app/biblioteca" replace />;
  return <Outlet />;
}

function useRouteContent() {
  const { id } = useParams();
  const { contents } = useContentStore();
  return contents.find((c) => c.id === id);
}

export function CameraRoute() {
  const nav = useAppNavigation();
  const { analysis, showToast } = useShell();
  return (
    <CameraScreen
      mode="capture"
      onCapture={(dataUrl, prefs) => { analysis.run(dataUrl, prefs); nav.navigate("/app/analise"); }}
      onLibraryNav={() => nav.openLibrary()}
      onClose={() => nav.back("/app/biblioteca")}
      onToast={showToast}
    />
  );
}

export function AttachCameraRoute() {
  const nav = useAppNavigation();
  const { id } = useParams();
  const { mutate } = useContentStore();
  const { showToast } = useShell();
  const handleCapture = (dataUrl) => {
    const { result } = mutate(() => addImageToContent(id, { dataUrl }));
    showToast(result && result.ok === false ? "Não foi possível salvar a foto — armazenamento cheio." : "✓ Foto adicionada");
    nav.back(`/app/conteudo/${id}`);
  };
  return (
    <CameraScreen
      mode="attach"
      onCapture={handleCapture}
      onLibraryNav={() => nav.openLibrary()}
      onClose={() => nav.back(`/app/conteudo/${id}`)}
      onToast={showToast}
    />
  );
}

export function AnalysisRoute() {
  const nav = useAppNavigation();
  const { analysis } = useShell();
  // Sem análise em curso (refresh na URL): volta para a câmera.
  if (analysis.status === "idle") return <Navigate to="/app/camera" replace />;
  return (
    <AnalysisScreen
      status={analysis.status}
      error={analysis.error}
      errorKind={analysis.errorKind}
      errorRequestId={analysis.errorRequestId}
      slow={analysis.slow}
      canRetry={analysis.canRetry}
      onRetry={analysis.retry}
      onCancel={() => { nav.navigate("/app/camera", { replace: true }); analysis.reset(); }}
      onDone={() => nav.navigate("/app/resumo", { replace: true })}
    />
  );
}

export function SummaryRoute() {
  const nav = useAppNavigation();
  const { analysis, showToast } = useShell();
  const { reload } = useContentStore();
  if (!analysis.content) return <Navigate to="/app/camera" replace />;
  return (
    <SummaryScreen
      capturedContent={analysis.content}
      partial={analysis.partial}
      onSave={() => {
        showToast("✓ Conteúdo salvo com sucesso");
        reload();
        // Reset só depois de sair da rota, senão a guarda acima redireciona
        // para a câmera no meio da navegação.
        setTimeout(() => { nav.openLibrary(); analysis.reset(); }, 500);
      }}
      onLibrary={() => nav.openLibrary()}
      onToast={showToast}
      onBackToCamera={() => { nav.navigate("/app/camera", { replace: true }); analysis.reset(); }}
    />
  );
}

export function LibraryRoute() {
  const nav = useAppNavigation();
  const [params] = useSearchParams();
  const { showToast } = useShell();
  return (
    <LibraryScreen
      onOpenItem={(item) => nav.openContent(item.id)}
      onVisionPlus={nav.openPlus}
      onToast={showToast}
      initialSubjectId={params.get("materia")}
    />
  );
}

export function DetailRoute() {
  const nav = useAppNavigation();
  const content = useRouteContent();
  const { showToast, openPhotoViewer } = useShell();
  const base = `/app/conteudo/${content.id}`;
  return (
    <ContentDetailScreen
      content={content}
      onBack={() => nav.back("/app/biblioteca")}
      onDeleted={() => nav.openLibrary()}
      onFlashcards={() => nav.navigate(`${base}/flashcards`)}
      onQuestions={() => nav.navigate(`${base}/perguntas`)}
      onQuiz={() => nav.navigate(`${base}/quiz`)}
      onVisionPlus={nav.openPlus}
      onToast={showToast}
      onAddPhoto={() => nav.navigate(`${base}/anexar`)}
      onViewPhoto={openPhotoViewer}
      onFocusMode={() => nav.navigate(`${base}/foco`)}
      onReadingMode={() => nav.navigate(`${base}/leitura`)}
    />
  );
}

export function FocusRoute() {
  const nav = useAppNavigation();
  const content = useRouteContent();
  return <FocusScreen content={content} onExit={() => nav.back(`/app/conteudo/${content.id}`)} />;
}

export function ReadingRoute() {
  const nav = useAppNavigation();
  const content = useRouteContent();
  return <ReadingScreen content={content} onExit={() => nav.back(`/app/conteudo/${content.id}`)} />;
}

export function FlashcardsRoute() {
  const nav = useAppNavigation();
  const content = useRouteContent();
  const [params] = useSearchParams();
  const { mutate } = useContentStore();
  const { subscription, showToast } = useShell();
  const reviewMode = params.get("revisao") === "1";

  const handleReviewComplete = () => {
    mutate(() => {
      const next = nextPendingReview(content.id);
      if (next) markReviewDone(next.id);
    });
    showToast("✓ Revisão registrada");
    setTimeout(() => nav.navigate("/app/revisao", { replace: true }), 400);
  };

  return (
    <FlashcardsScreen
      content={content}
      onBack={() => nav.back(`/app/conteudo/${content.id}`)}
      onVisionPlus={nav.openPlus}
      isPremium={subscription.isPremium}
      reviewMode={reviewMode}
      onReviewComplete={handleReviewComplete}
    />
  );
}

export function QuestionsRoute() {
  const nav = useAppNavigation();
  const content = useRouteContent();
  const { subscription } = useShell();
  return (
    <QuestionsScreen content={content} onBack={() => nav.back(`/app/conteudo/${content.id}`)}
      isPremium={subscription.isPremium} onVisionPlus={nav.openPlus} />
  );
}

export function QuizRoute() {
  const nav = useAppNavigation();
  const content = useRouteContent();
  const { subscription } = useShell();
  return (
    <QuizScreen content={content} onBack={() => nav.back(`/app/conteudo/${content.id}`)}
      isPremium={subscription.isPremium} onVisionPlus={nav.openPlus} />
  );
}

export function ReviewRoute() {
  const nav = useAppNavigation();
  const { showToast } = useShell();
  return (
    <ReviewScreen
      onReview={(item) => nav.openContentRoute(item.id, "flashcards", "?revisao=1")}
      onOpenContent={(item) => nav.openContent(item.id, { fromReview: true })}
      onToast={showToast}
      onVisionPlus={nav.openPlus}
      onOpenEvolution={nav.openEvolution}
    />
  );
}

export function EvolutionRoute() {
  const nav = useAppNavigation();
  const { subscription, showToast, startTrial } = useShell();
  return (
    <EvolutionScreen
      isPremium={subscription.isPremium}
      onOpenContent={(id) => nav.openContent(id)}
      onOpenLibrary={(subjectId) => nav.openLibrary(subjectId)}
      onOpenReview={nav.openReview}
      onVisionPlus={nav.openPlus}
      onStartTrial={startTrial}
      onToast={showToast}
    />
  );
}

export function PlusRoute() {
  const nav = useAppNavigation();
  const { subscription, startTrial, resetToFree } = useShell();
  return (
    <VisionPlusScreen
      onBack={() => nav.back("/app/evolucao")}
      isPremium={subscription.isPremium}
      isTrialActive={subscription.isTrialActive}
      status={subscription.status}
      daysRemaining={subscription.daysRemaining}
      onStartTrial={startTrial}
      onResetToFree={resetToFree}
    />
  );
}
