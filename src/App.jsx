import { motion, AnimatePresence } from "framer-motion";
import { useContentStore } from "./context/ContentStoreContext.jsx";
import { nextPendingReview, markReviewDone } from "./services/reviewService";
import { useNavigation } from "./hooks/useNavigation";
import { useToast } from "./hooks/useToast";
import { useSubscription } from "./hooks/useSubscription";
import { useAnalysis } from "./hooks/useAnalysis";
import { slideIn, fadeUp } from "./styles/motion";
import StatusBar from "./components/layout/StatusBar";
import BottomNav from "./components/layout/BottomNav";
import PhoneFrame from "./components/layout/PhoneFrame";
import Toast from "./components/ui/Toast";
import CameraScreen from "./screens/CameraScreen";
import AnalysisScreen from "./screens/AnalysisScreen";
import SummaryScreen from "./screens/SummaryScreen";
import LibraryScreen from "./screens/LibraryScreen";
import ContentDetailScreen from "./screens/ContentDetailScreen";
import FlashcardsScreen from "./screens/FlashcardsScreen";
import QuestionsScreen from "./screens/QuestionsScreen";
import QuizScreen from "./screens/QuizScreen";
import ReviewScreen from "./screens/ReviewScreen";
import EvolutionScreen from "./screens/EvolutionScreen";
import VisionPlusScreen from "./screens/VisionPlusScreen";
import { useState } from "react";

export default function App() {
  const { screen, setScreen, prevScreens, setPrevScreens, reviewMode, setReviewMode, go, goBack, goTo } = useNavigation("camera");
  const [selectedContentId, setSelectedContentId] = useState(null);
  const [libraryFilterSubjectId, setLibraryFilterSubjectId] = useState(null);
  const { toast, showToast, clearToast } = useToast();
  const analysis = useAnalysis();
  const { contents, dueCount, reload: refreshDueCount, mutate } = useContentStore();
  const { isPremium, isTrialActive, status: subscriptionStatus, daysRemaining, startTrial, resetToFree } = useSubscription();

  // Derivado do store, nunca um snapshot congelado — some a classe de bug em
  // que a tela de detalhe mostrava o estado de antes de uma edição/revisão.
  const selectedContent = contents.find((c) => c.id === selectedContentId) || null;

  // subjectId opcional: drill-down da Evolução chega já filtrado; qualquer
  // outra entrada na Biblioteca (nav, salvar conteúdo, excluir) limpa o filtro.
  const openLibrary = (subjectId = null) => { setLibraryFilterSubjectId(subjectId); goTo("library"); };

  const handleStartTrial = () => { startTrial(); showToast("✓ Study Vision+ ativado"); };
  const handleResetToFree = () => { resetToFree(); showToast("Demonstração reiniciada"); };

  const handleReviewComplete = () => {
    if (selectedContentId) {
      mutate(() => {
        const next = nextPendingReview(selectedContentId);
        if (next) markReviewDone(next.id);
      });
    }
    setReviewMode(false);
    showToast("✓ Revisão registrada");
    setTimeout(() => goTo("review"), 400);
  };

  // Bottom nav active — o detalhe de conteúdo pode ser aberto tanto pela
  // Biblioteca quanto pelo Calendário (dentro de Revisão); o item destacado
  // segue de onde a navegação veio.
  const cameFromReview = prevScreens[prevScreens.length - 1] === "review";
  const navActive = (screen === "review" || (reviewMode && screen === "flashcards")) ? "review"
    : screen === "detail" && cameFromReview ? "review"
    : ["library", "detail", "flashcards", "questions", "quiz"].includes(screen) ? "library"
    : screen === "evolution" || screen === "visionplus" ? "evolution" : "camera";

  const isLight = !["camera", "analysis"].includes(screen);
  const showNav = !["camera", "analysis"].includes(screen);

  const transitions = ["visionplus", "evolution", "library", "review"].includes(screen) ? fadeUp : slideIn;

  return (
    <PhoneFrame>
      <StatusBar light={!isLight} />

      {/* Screen transitions */}
      <AnimatePresence mode="wait">
        <motion.div key={screen} {...transitions}
          style={{ position: "absolute", inset: 0, paddingBottom: showNav ? 80 : 0 }}>
          {screen === "camera" && (
            <CameraScreen
              onCapture={(dataUrl) => { analysis.run(dataUrl); go("analysis"); }}
              onLibraryNav={() => openLibrary()}
            />
          )}
          {screen === "analysis" && (
            <AnalysisScreen
              status={analysis.status}
              error={analysis.error}
              onRetry={analysis.retry}
              onCancel={() => { analysis.reset(); goBack(); }}
              onDone={() => { setPrevScreens([]); setScreen("summary"); }}
            />
          )}
          {screen === "summary" && (
            <SummaryScreen
              capturedContent={analysis.content}
              onSave={() => { showToast("✓ Conteúdo salvo com sucesso"); refreshDueCount(); setTimeout(() => openLibrary(), 500); }}
              onLibrary={() => openLibrary()}
              onToast={showToast}
            />
          )}
          {screen === "library" && (
            <LibraryScreen
              onOpenItem={(item) => { setSelectedContentId(item.id); go("detail"); }}
              onVisionPlus={() => go("visionplus")}
              onToast={showToast}
              initialSubjectId={libraryFilterSubjectId}
            />
          )}
          {screen === "detail" && selectedContent && (
            <ContentDetailScreen
              content={selectedContent}
              onBack={goBack}
              onDeleted={() => { setSelectedContentId(null); openLibrary(); }}
              onFlashcards={() => go("flashcards")}
              onQuestions={() => go("questions")}
              onQuiz={() => go("quiz")}
              onVisionPlus={() => go("visionplus")}
              onToast={showToast}
            />
          )}
          {screen === "flashcards" && selectedContent && (
            <FlashcardsScreen
              content={selectedContent}
              onBack={goBack}
              onVisionPlus={() => go("visionplus")}
              isPremium={isPremium}
              reviewMode={reviewMode}
              onReviewComplete={handleReviewComplete}
            />
          )}
          {screen === "questions" && selectedContent && (
            <QuestionsScreen content={selectedContent} onBack={goBack} isPremium={isPremium} onVisionPlus={() => go("visionplus")} />
          )}
          {screen === "quiz" && selectedContent && (
            <QuizScreen content={selectedContent} onBack={goBack} isPremium={isPremium} onVisionPlus={() => go("visionplus")} />
          )}
          {screen === "review" && (
            <ReviewScreen
              onReview={(item) => { setSelectedContentId(item.id); setReviewMode(true); go("flashcards"); }}
              onOpenContent={(item) => { setSelectedContentId(item.id); go("detail"); }}
              onToast={showToast}
            />
          )}
          {screen === "evolution" && (
            <EvolutionScreen
              isPremium={isPremium}
              onOpenContent={(id) => { setSelectedContentId(id); go("detail"); }}
              onOpenLibrary={(subjectId) => openLibrary(subjectId)}
              onOpenReview={() => goTo("review")}
              onVisionPlus={() => go("visionplus")}
            />
          )}
          {screen === "visionplus" && (
            <VisionPlusScreen
              onBack={goBack}
              isPremium={isPremium}
              isTrialActive={isTrialActive}
              status={subscriptionStatus}
              daysRemaining={daysRemaining}
              onStartTrial={handleStartTrial}
              onResetToFree={handleResetToFree}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom nav */}
      {showNav && (
        <BottomNav active={navActive} dueCount={dueCount}
          onGo={(id) => {
            if (id === "camera") goTo("camera");
            else if (id === "library") openLibrary();
            else if (id === "review") goTo("review");
            else if (id === "evolution") goTo("evolution");
          }}
        />
      )}

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast key={toast} message={toast} onDone={clearToast} />}
      </AnimatePresence>
    </PhoneFrame>
  );
}
