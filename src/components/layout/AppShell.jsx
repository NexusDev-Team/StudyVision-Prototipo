import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useContentStore } from "../../context/ContentStoreContext.jsx";
import { removeImageFromContent, setImageExtractedText } from "../../services/contentService";
import { useAppNavigation } from "../../hooks/useAppNavigation";
import { useToast } from "../../hooks/useToast";
import { useSubscription } from "../../hooks/useSubscription";
import { useAnalysis } from "../../hooks/useAnalysis";
import { slideIn, fadeUp } from "../../styles/motion";
import { useAuth } from "../../hooks/useAuth";
import BottomNav from "./BottomNav";
import SideNav from "./SideNav";
import Toast from "../ui/Toast";
import PhotoViewerModal from "../study/PhotoViewerModal";

// Rotas imersivas escondem a navegação global ("uma coisa por vez").
const IMMERSIVE = ["/app/camera", "/app/analise", "/anexar", "/foco", "/leitura"];
const DARK = ["/app/camera", "/app/analise"];
const FADE_ROUTES = ["/app/plus", "/app/evolucao", "/app/biblioteca", "/app/revisao"];

// Item da navegação destacado a partir da URL (e do estado de origem).
export function navActiveFor(pathname, search, state) {
  if (pathname.startsWith("/app/revisao")) return "review";
  if (pathname.startsWith("/app/conteudo/")) {
    if (pathname.endsWith("/flashcards") && search.includes("revisao=1")) return "review";
    if (state?.fromReview) return "review";
    return "library";
  }
  if (pathname.startsWith("/app/biblioteca")) return "library";
  if (pathname.startsWith("/app/evolucao") || pathname.startsWith("/app/plus")) return "evolution";
  return "camera";
}

// Layout das rotas privadas. Concentra o estado que atravessa telas (análise
// em andamento, toast, assinatura, visualizador de foto) e o entrega às telas
// via Outlet context (useShell).
export default function AppShell() {
  const location = useLocation();
  const nav = useAppNavigation();
  const { user, logout } = useAuth();
  const { contents, dueCount, mutate } = useContentStore();
  const { toast, showToast, clearToast } = useToast();
  const analysis = useAnalysis();
  const subscription = useSubscription();
  const [photoViewer, setPhotoViewer] = useState(null); // { contentId, index } | null

  const { pathname, search, state } = location;
  const immersive = IMMERSIVE.some((p) => (p.startsWith("/app") ? pathname === p : pathname.endsWith(p)));
  const dark = DARK.includes(pathname);
  const showNav = !immersive;
  const transitions = FADE_ROUTES.some((p) => pathname.startsWith(p)) ? fadeUp : slideIn;

  // Derivado do store a cada render: a exclusão dentro do visualizador reflete
  // na hora, sem array congelado.
  const viewerContent = photoViewer ? contents.find((c) => c.id === photoViewer.contentId) : null;
  const viewerImages = viewerContent ? [...viewerContent.images].sort((a, b) => a.order - b.order) : [];

  const handleRemoveViewerImage = (imageId) => {
    if (!photoViewer) return;
    mutate(() => removeImageFromContent(photoViewer.contentId, imageId));
    showToast("✓ Foto removida");
  };

  // Persistir via mutate(): sem isso o array `images` do store não recarrega e
  // o PhotoViewerModal veria extractedText desatualizado (cache-hit falharia).
  const handlePersistExtractedText = (contentId, imageId, payload) => {
    mutate(() => setImageExtractedText(contentId, imageId, payload));
  };

  const active = navActiveFor(pathname, search, state);
  const goNav = (id) => {
    if (id === "camera") nav.goCamera();
    else if (id === "library") nav.openLibrary();
    else if (id === "review") nav.openReview();
    else if (id === "evolution") nav.openEvolution();
  };
  const handleLogout = () => { logout(); nav.navigate("/", { replace: true }); };

  const shell = {
    analysis,
    showToast,
    subscription,
    openPhotoViewer: (content, index) => setPhotoViewer({ contentId: content.id, index }),
    startTrial: () => { subscription.startTrial(); showToast("✓ Study Vision+ ativado"); },
    resetToFree: () => { subscription.resetToFree(); showToast("Demonstração reiniciada"); },
  };

  return (
    <div className={`flex h-dvh w-full ${dark ? "bg-sv-dark" : "bg-sv-bg"}`}>
      {showNav && (
        <SideNav
          active={active}
          dueCount={dueCount}
          user={user}
          onGo={goNav}
          onLogout={handleLogout}
          onPlus={nav.openPlus}
          plusActive={pathname.startsWith("/app/plus")}
        />
      )}
      <div className="sv-frame relative mx-auto h-full w-full max-w-2xl min-w-0 flex-1 overflow-hidden bg-sv-bg font-sans">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            {...transitions}
            style={{ position: "absolute", inset: 0, paddingBottom: showNav ? 80 : 0 }}
          >
            <Outlet context={shell} />
          </motion.div>
        </AnimatePresence>

        {showNav && <BottomNav active={active} dueCount={dueCount} onGo={goNav} />}

        <AnimatePresence>
          {toast && <Toast key={toast} message={toast} onDone={clearToast} />}
        </AnimatePresence>

        <AnimatePresence>
          {photoViewer && viewerImages.length > 0 && (
            <PhotoViewerModal
              contentId={photoViewer.contentId}
              images={viewerImages}
              initialIndex={photoViewer.index}
              onClose={() => setPhotoViewer(null)}
              onRemoveImage={handleRemoveViewerImage}
              onPersistExtractedText={handlePersistExtractedText}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
