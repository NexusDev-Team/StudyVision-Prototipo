import { Link } from "react-router-dom";
import { LogOut, Sparkles, User } from "lucide-react";
import { NAV_ITEMS } from "./navItems.jsx";
import LogoSVG from "../brand/LogoSVG";

// Navegação lateral — tablet e desktop (md+). No mobile fica escondida.
export default function SideNav({ active, onGo, dueCount = 0, user, onLogout, onPlus, plusActive }) {
  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-sv-line bg-white px-4 py-6 font-sans md:flex lg:w-64">
      <Link to="/" className="mb-8 flex items-center gap-2.5 px-2 no-underline">
        <LogoSVG size={32} />
        <span className="text-lg font-extrabold text-sv-ink">Study Vision</span>
      </Link>

      <nav className="flex flex-col gap-1" aria-label="Navegação principal">
        {NAV_ITEMS.map(({ id, Icon, label }) => {
          const isActive = active === id;
          return (
            <button
              key={id}
              onClick={() => onGo(id)}
              className={`flex cursor-pointer items-center gap-3 rounded-sv-md border-none px-3 py-2.5 text-left text-sm font-semibold transition-colors ${
                isActive ? "bg-sv-blue-bg text-sv-blue" : "bg-transparent text-sv-muted hover:bg-sv-line-soft"
              }`}
            >
              <Icon size={20} />
              <span className="flex-1">{label}</span>
              {id === "review" && dueCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-extrabold text-white">
                  {dueCount}
                </span>
              )}
            </button>
          );
        })}
        <button
          onClick={onPlus}
          className={`mt-2 flex cursor-pointer items-center gap-3 rounded-sv-md border-none px-3 py-2.5 text-left text-sm font-bold transition-colors ${
            plusActive ? "bg-sv-purple-bg text-sv-purple-text" : "bg-transparent text-sv-purple hover:bg-sv-purple-bg"
          }`}
        >
          <Sparkles size={20} />
          Study Vision+
        </button>
      </nav>

      <div className="mt-auto border-t border-sv-line pt-4">
        <div className="mb-3 flex items-center gap-2.5 px-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sv-purple-bg text-sv-purple-text">
            <User size={18} />
          </span>
          <div className="min-w-0">
            <p className="m-0 truncate text-sm font-bold text-sv-ink">{user?.name}</p>
            <p className="m-0 truncate text-xs text-sv-muted">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex w-full cursor-pointer items-center gap-2 rounded-sv-md border-none bg-transparent px-3 py-2 text-sm font-semibold text-sv-muted transition-colors hover:bg-sv-red-bg hover:text-sv-red"
        >
          <LogOut size={18} /> Sair
        </button>
      </div>
    </aside>
  );
}
