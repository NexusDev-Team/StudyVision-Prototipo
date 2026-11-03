import { Navigate, Route, Routes } from "react-router-dom";
import { PrivateRoute } from "./guards.jsx";
import AppShell from "../components/layout/AppShell.jsx";
import {
  ContentGate, CameraRoute, AttachCameraRoute, AnalysisRoute, SummaryRoute, LibraryRoute,
  DetailRoute, FocusRoute, ReadingRoute, FlashcardsRoute, QuestionsRoute, QuizRoute,
  ReviewRoute, EvolutionRoute, PlusRoute,
} from "./screens.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/app" element={<PrivateRoute />}>
        <Route element={<AppShell />}>
          <Route index element={<Navigate to="camera" replace />} />
          <Route path="camera" element={<CameraRoute />} />
          <Route path="analise" element={<AnalysisRoute />} />
          <Route path="resumo" element={<SummaryRoute />} />
          <Route path="biblioteca" element={<LibraryRoute />} />
          <Route path="conteudo/:id" element={<ContentGate />}>
            <Route index element={<DetailRoute />} />
            <Route path="flashcards" element={<FlashcardsRoute />} />
            <Route path="perguntas" element={<QuestionsRoute />} />
            <Route path="quiz" element={<QuizRoute />} />
            <Route path="foco" element={<FocusRoute />} />
            <Route path="leitura" element={<ReadingRoute />} />
            <Route path="anexar" element={<AttachCameraRoute />} />
          </Route>
          <Route path="revisao" element={<ReviewRoute />} />
          <Route path="evolucao" element={<EvolutionRoute />} />
          <Route path="plus" element={<PlusRoute />} />
          <Route path="*" element={<Navigate to="/app/camera" replace />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/app/camera" replace />} />
    </Routes>
  );
}
