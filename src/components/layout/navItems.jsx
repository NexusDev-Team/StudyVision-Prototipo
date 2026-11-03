import { Camera, BookMarked, CalendarClock, TrendingUp, User } from "lucide-react";

// Itens da navegação global — compartilhados por BottomNav (mobile) e SideNav (tablet/desktop).
export const NAV_ITEMS = [
  { id: "camera", Icon: Camera, label: "Câmera" },
  { id: "library", Icon: BookMarked, label: "Biblioteca" },
  { id: "review", Icon: CalendarClock, label: "Revisão" },
  { id: "evolution", Icon: TrendingUp, label: "Evolução" },
  { id: "profile", Icon: User, label: "Perfil" },
];
