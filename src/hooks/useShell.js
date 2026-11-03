import { useOutletContext } from "react-router-dom";

// Estado compartilhado do AppShell (análise, toast, assinatura, visualizador).
export function useShell() {
  return useOutletContext();
}
