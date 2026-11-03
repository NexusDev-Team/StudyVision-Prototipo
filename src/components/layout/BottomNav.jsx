import { motion } from "framer-motion";
import { NAV_ITEMS } from "./navItems.jsx";

// Navegação inferior — só no mobile (< md); em telas maiores entra a SideNav.
export default function BottomNav({ active, onGo, dueCount = 0 }) {
  return (
    <nav className="absolute inset-x-0 bottom-0 z-[150] flex border-t border-sv-line-soft bg-white/95 pt-0.5 pb-5 backdrop-blur-xl md:hidden">
      {NAV_ITEMS.map(({ id, Icon, label }) => {
        const isActive = active === id;
        const color = isActive ? "text-sv-blue" : "text-sv-faint";
        return (
          <button
            key={id}
            onClick={() => onGo(id)}
            className={`relative flex flex-1 cursor-pointer flex-col items-center gap-[3px] border-none bg-transparent pt-2 font-sans transition-colors ${color}`}
          >
            <span className="relative">
              <Icon size={22} />
              {id === "review" && dueCount > 0 && (
                <span className="absolute -top-1 -right-2 flex h-[15px] min-w-[15px] items-center justify-center rounded-lg bg-red-500 px-[3px] text-[9px] font-extrabold text-white">
                  {dueCount}
                </span>
              )}
            </span>
            <span className="text-[10px] font-semibold">{label}</span>
            {isActive && <motion.div layoutId="navdot" className="h-1 w-1 rounded-full bg-sv-blue" />}
          </button>
        );
      })}
    </nav>
  );
}
