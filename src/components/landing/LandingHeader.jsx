import { useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { NAV_LINKS } from "../../data/landing.js";
import { useAuth } from "../../hooks/useAuth.js";

export default function LandingHeader() {
  const [open, setOpen] = useState(false);
  const { isAuthenticated } = useAuth();
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-lp-bg/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <a href="#topo" className="text-2xl font-extrabold text-white no-underline">
          Study<span className="text-lp-blue">Vision</span>
        </a>

        <nav
          aria-label="Seções da página"
          className={`${open ? "flex" : "hidden"} absolute inset-x-0 top-full flex-col gap-1 border-b border-white/10 bg-lp-bg/95 px-5 py-4 md:static md:flex md:flex-row md:items-center md:gap-6 md:border-0 md:bg-transparent md:p-0`}
        >
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={close}
              className="py-2 text-sm font-semibold text-lp-text no-underline transition-colors hover:text-lp-blue-light"
            >
              {l.label}
            </a>
          ))}
          <Link
            to={isAuthenticated ? "/app/camera" : "/login"}
            onClick={close}
            className="mt-2 rounded-full bg-lp-blue px-5 py-2 text-center text-sm font-bold text-white no-underline transition-colors hover:bg-lp-blue-light md:mt-0"
          >
            {isAuthenticated ? "Abrir app" : "Entrar"}
          </Link>
        </nav>

        <button
          type="button"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="cursor-pointer border-none bg-transparent p-1 text-lp-blue md:hidden"
        >
          {open ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>
    </header>
  );
}
