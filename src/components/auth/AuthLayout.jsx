import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import LogoSVG from "../brand/LogoSVG";

export default function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-lp-bg px-5 py-10 font-sans">
      <div className="w-full max-w-md">
        <Link to="/" aria-label="Voltar para a tela inicial"
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-lp-muted no-underline transition-colors hover:text-white">
          <ArrowLeft size={18} /> Voltar ao início
        </Link>
        <Link to="/" className="mb-8 flex items-center justify-center gap-2.5 no-underline">
          <LogoSVG size={36} />
          <span className="text-2xl font-extrabold text-white">
            Study<span className="text-lp-blue">Vision</span>
          </span>
        </Link>
        <div className="rounded-3xl border border-lp-line bg-lp-bg2 p-6 shadow-2xl md:p-8">
          <h1 className="m-0 text-2xl font-extrabold text-white">{title}</h1>
          <p className="mt-1 mb-6 text-sm text-lp-muted">{subtitle}</p>
          {children}
        </div>
        <p className="mt-5 text-center text-sm text-lp-muted">{footer}</p>
      </div>
    </div>
  );
}
