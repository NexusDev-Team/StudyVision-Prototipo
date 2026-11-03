import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import heroImg from "../../assets/landing/hero.jpeg";

// Banner da página: a arte já traz título e slogan, então ocupa a largura
// toda e os botões ficam logo abaixo, dentro da altura de uma tela.
export default function Hero() {
  return (
    <section id="topo" className="flex min-h-[calc(100dvh-4.25rem)] flex-col items-center justify-center gap-5 px-3 py-4 md:px-6">
      <h1 className="sr-only">Study Vision — da foto ao conhecimento</h1>
      <img
        src={heroImg}
        alt="Study Vision: a câmera que captura conhecimento e transforma registros em aprendizado organizado"
        className="w-full max-w-[1400px] rounded-2xl object-contain md:max-h-[calc(100dvh-4.25rem-6.5rem)]"
      />
      <div className="flex flex-wrap items-center justify-center gap-3">
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
    </section>
  );
}
