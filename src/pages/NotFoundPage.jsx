import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-lp-bg px-5 text-center font-sans">
      <p className="m-0 text-6xl font-extrabold text-lp-blue">404</p>
      <h1 className="mt-2 mb-1 text-2xl font-extrabold text-white">Página não encontrada</h1>
      <p className="m-0 mb-6 text-lp-muted">O endereço que você tentou abrir não existe.</p>
      <Link to="/" className="rounded-full bg-lp-blue px-6 py-3 font-bold text-white no-underline hover:bg-lp-blue-light">
        Voltar ao início
      </Link>
    </div>
  );
}
