import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Wrapper de useNavigate com os destinos do app. Substitui o antigo
// useNavigation (pilha de telas em useState): agora a URL é a fonte da verdade.
export function useAppNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  // Voltar no histórico; se a página foi aberta direto por link/refresh
  // (sem histórico interno), cai no destino de fallback.
  const back = useCallback((fallback = "/app/biblioteca") => {
    if (location.key !== "default") navigate(-1);
    else navigate(fallback, { replace: true });
  }, [navigate, location.key]);

  return useMemo(() => ({
    navigate,
    back,
    goCamera: () => navigate("/app/camera"),
    openLibrary: (subjectId = null) =>
      navigate(subjectId ? `/app/biblioteca?materia=${encodeURIComponent(subjectId)}` : "/app/biblioteca"),
    openContent: (id, state) => navigate(`/app/conteudo/${id}`, { state }),
    openContentRoute: (id, sub, search = "") => navigate(`/app/conteudo/${id}/${sub}${search}`),
    openReview: () => navigate("/app/revisao"),
    openEvolution: () => navigate("/app/evolucao"),
    openPlus: () => navigate("/app/plus"),
  }), [navigate, back]);
}
