import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

// Rota privada: sem sessão, vai para /login guardando a origem para voltar
// depois do login.
export function PrivateRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  return <Outlet />;
}

// Rotas só para visitantes (login/cadastro): logado vai direto para o app.
export function PublicOnlyRoute() {
  const { isAuthenticated } = useAuth();
  const location = useLocation();
  // Logo após o login este guard re-renderiza antes do navigate() do form —
  // por isso ele mesmo respeita a rota de origem guardada pelo PrivateRoute.
  if (isAuthenticated) return <Navigate to={location.state?.from || "/app/camera"} replace />;
  return <Outlet />;
}
