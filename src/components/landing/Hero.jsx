import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import heroImg from "../../assets/landing/hero.jpeg";

export default function Hero() {
  return (
    <section id="topo" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 md:grid-cols-2 md:py-20">
        <div>
          <p className="mb-3 text-sm font-bold tracking-widest text-lp-cyan uppercase">FIAP × JOVI Smartphones</p>
          <h1 className="m-0 text-4xl leading-tight font-extrabold text-white md:text-5xl">
            Aponte a câmera. <span className="text-lp-blue-light">Estude de verdade.</span>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-lp-muted md:text-lg">
            O Study Vision transforma a foto de qualquer página em resumo, flashcards, quiz e um plano de revisão
            — tudo dentro da câmera do seu celular.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-full bg-lp-blue px-6 py-3 font-bold text-white no-underline transition-colors hover:bg-lp-blue-light"
            >
              Experimentar agora <ArrowRight size={18} />
            </Link>
            <a
              href="#solucao"
              className="rounded-full border border-lp-line px-6 py-3 font-bold text-lp-text no-underline transition-colors hover:border-lp-blue-light"
            >
              Saiba mais
            </a>
          </div>
        </div>
        <img
          src={heroImg}
          alt="Study Vision em uso: câmera do celular analisando uma página de estudo"
          className="mx-auto w-full max-w-md rounded-3xl object-contain md:max-w-none"
        />
      </div>
    </section>
  );
}
