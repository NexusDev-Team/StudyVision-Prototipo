import { motion, AnimatePresence } from "framer-motion";
import { useStudyItems } from "./hooks/useStudyItems";
import { useNavigation } from "./hooks/useNavigation";
import { useToast } from "./hooks/useToast";
import { useSubscription } from "./hooks/useSubscription";
import { nextCaptureTemplate, peekCaptureTemplate } from "./data/sampleContent";
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
import VisionPlusScreen from "./screens/VisionPlusScreen";
import { useState } from "react";

export default function App() {
  const { screen, setScreen, prevScreens, setPrevScreens, reviewMode, setReviewMode, go, goBack, goTo } = useNavigation("camera");
  const [selectedItem, setSelectedItem] = useState(null);
  const [capturedItem, setCapturedItem] = useState(null);
  const { toast, showToast, clearToast } = useToast();
  const { dueCount, reload: refreshDueCount, markDone } = useStudyItems();
  const { isPlus, daysRemaining, startTrial, resetToFree } = useSubscription();

  const handleStartTrial = () => { startTrial(); showToast("✓ Study Vision+ ativado"); };
  const handleResetToFree = () => { resetToFree(); showToast("Demonstração reiniciada"); };

  const handleReviewComplete = () => {
    const updated = markDone(selectedItem);
    setSelectedItem(updated);
    setReviewMode(false);
    showToast("✓ Revisão registrada");
    setTimeout(() => goTo("review"), 400);
  };

  // Bottom nav active
  const navActive = (screen === "review" || (reviewMode && screen === "flashcards")) ? "review"
    : ["library", "detail", "flashcards", "questions", "quiz"].includes(screen) ? "library"
    : screen === "visionplus" ? "visionplus" : "camera";

  const isLight = !["camera", "analysis"].includes(screen);
  const showNav = !["camera", "analysis"].includes(screen);

  const transitions = ["visionplus", "library", "review"].includes(screen) ? fadeUp : slideIn;

  return (
    <PhoneFrame>
      <StatusBar light={!isLight} />

      {/* Screen transitions */}
      <AnimatePresence mode="wait">
        <motion.div key={screen} {...transitions}
          style={{ position: "absolute", inset: 0, paddingBottom: showNav ? 80 : 0 }}>
          {screen === "camera" && (
            <CameraScreen
              previewPhoto={peekCaptureTemplate().photo}
              onCapture={() => { setCapturedItem(nextCaptureTemplate()); go("analysis"); }}
              onLibraryNav={() => goTo("library")}
            />
          )}
          {screen === "analysis" && (
            <AnalysisScreen onDone={() => { setPrevScreens([]); setScreen("summary"); }} />
          )}
          {screen === "summary" && (
            <SummaryScreen
              capturedItem={capturedItem}
              onSave={() => { showToast("✓ Conteúdo salvo com sucesso"); refreshDueCount(); setTimeout(() => goTo("library"), 500); }}
              onLibrary={() => goTo("library")}
              onToast={showToast}
            />
          )}
          {screen === "library" && (
            <LibraryScreen
              onOpenItem={(item) => { setSelectedItem(item); go("detail"); }}
              onVisionPlus={() => go("visionplus")}
            />
          )}
          {screen === "detail" && selectedItem && (
            <ContentDetailScreen
              item={selectedItem}
              onBack={goBack}
              onFlashcards={() => go("flashcards")}
              onQuestions={() => go("questions")}
              onQuiz={() => go("quiz")}
              onVisionPlus={() => go("visionplus")}
              onToast={showToast}
            />
          )}
          {screen === "flashcards" && selectedItem && (
            <FlashcardsScreen
              item={selectedItem}
              onBack={goBack}
              onVisionPlus={() => go("visionplus")}
              isPlus={isPlus}
              reviewMode={reviewMode}
              onReviewComplete={handleReviewComplete}
            />
          )}
          {screen === "questions" && (
            <QuestionsScreen item={selectedItem} onBack={goBack} isPlus={isPlus} onVisionPlus={() => go("visionplus")} />
          )}
          {screen === "quiz" && (
            <QuizScreen item={selectedItem} onBack={goBack} isPlus={isPlus} onVisionPlus={() => go("visionplus")} />
          )}
          {screen === "review" && (
            <ReviewScreen onReview={(item) => { setSelectedItem(item); setReviewMode(true); go("flashcards"); }} onToast={showToast} />
          )}
          {screen === "visionplus" && (
            <VisionPlusScreen
              onBack={goBack}
              isPlus={isPlus}
              daysRemaining={daysRemaining}
              onStartTrial={handleStartTrial}
              onResetToFree={handleResetToFree}
              onToast={showToast}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Bottom nav */}
      {showNav && (
        <BottomNav active={navActive} dueCount={dueCount}
          onGo={(id) => {
            if (id === "camera") goTo("camera");
            else if (id === "library") goTo("library");
            else if (id === "review") goTo("review");
            else if (id === "visionplus") goTo("visionplus");
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
