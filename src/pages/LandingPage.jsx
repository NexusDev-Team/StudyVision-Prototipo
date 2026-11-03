import LandingHeader from "../components/landing/LandingHeader.jsx";
import Hero from "../components/landing/Hero.jsx";
import InfoSection from "../components/landing/InfoSection.jsx";
import FeatureCard from "../components/landing/FeatureCard.jsx";
import TeamCard from "../components/landing/TeamCard.jsx";
import ContactSection from "../components/landing/ContactSection.jsx";
import { FEATURES, TEAM } from "../data/landing.js";
import solucaoImg from "../assets/landing/solucao.png";
import publicoImg from "../assets/landing/publico.png";

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-lp-bg font-sans text-lp-text">
      <LandingHeader />
      <Hero />

      <main>
        <InfoSection id="solucao" title="Solução" image={solucaoImg} imageAlt="Ilustração da solução Study Vision">
          <p className="m-0 mb-4">
            O Study Vision é uma aplicação web em React que faz da câmera do celular a porta de entrada para um
            sistema de aprendizagem baseado em ciência cognitiva. Você fotografa uma página de estudo e a IA
            (Gemini) identifica matéria e assunto, extrai o texto e gera resumo, conceitos-chave, flashcards e quiz.
          </p>
          <p className="m-0">
            Tudo fica organizado numa biblioteca por matéria, com revisão espaçada integrada ao calendário, modos de
            foco e leitura guiada e um painel de evolução — sem conta em nuvem: os dados ficam no seu aparelho.
          </p>
        </InfoSection>

        <section id="como-funciona" className="mx-auto flex w-full max-w-6xl flex-col justify-center px-5 py-6 md:py-10 min-h-[calc(100dvh-4.25rem)] scroll-mt-[4.25rem]">
          <h2 className="mb-5 text-center md:mb-8 text-3xl font-extrabold text-white md:text-4xl">Como funciona</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f, i) => <FeatureCard key={f.title} index={i} {...f} />)}
          </div>
        </section>

        <InfoSection id="alvo" title="Público-alvo" image={publicoImg} imageAlt="Estudantes usando o Study Vision" reverse>
          <p className="m-0 mb-4">
            Estudantes do ensino médio e superior que fotografam o caderno, a lousa e o livro, mas não conseguem
            transformar esse material em estudo ativo e revisão no tempo certo.
          </p>
          <p className="m-0">
            Também serve a qualquer pessoa que aprende por conta própria — cursos, concursos, idiomas — e quer
            centralizar o conteúdo, acompanhar a evolução e manter a constância.
          </p>
        </InfoSection>

        <section id="galeria" className="mx-auto flex w-full max-w-4xl flex-col justify-center px-5 py-6 md:py-10 min-h-[calc(100dvh-4.25rem)] scroll-mt-[4.25rem]">
          <h2 className="mb-5 text-center md:mb-8 text-3xl font-extrabold text-white md:text-4xl">Galeria</h2>
          <div className="mx-auto w-full max-w-xl overflow-hidden rounded-2xl border border-lp-line bg-lp-bg2 p-2">
            <video controls preload="metadata" className="max-h-[45dvh] w-full rounded-xl bg-black" aria-label="Vídeo de demonstração do Study Vision">
              <source src="/landing/galeria.mp4" type="video/mp4" />
            </video>
          </div>
        </section>

        <section id="equipe" className="mx-auto flex w-full max-w-6xl flex-col justify-center px-5 py-6 md:py-10 min-h-[calc(100dvh-4.25rem)] scroll-mt-[4.25rem]">
          <h2 className="mb-5 text-center md:mb-8 text-3xl font-extrabold text-white md:text-4xl">Nossa equipe</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {TEAM.map((m) => <TeamCard key={m.name} {...m} />)}
          </div>
        </section>

        <ContactSection />
      </main>

      <footer className="border-t border-white/10 px-5 py-6 text-center text-sm text-lp-muted">
        &copy; 2026 StudyVision. Todos os direitos reservados.
      </footer>
    </div>
  );
}
