import { LogOut, Mail, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";
import { useContentStore } from "../context/ContentStoreContext.jsx";

function Stat({ label, value }) {
  return (
    <div className="rounded-sv-lg bg-sv-line-soft p-4 text-center">
      <p className="m-0 text-2xl font-extrabold text-sv-ink">{value}</p>
      <p className="m-0 mt-0.5 text-xs font-semibold text-sv-muted">{label}</p>
    </div>
  );
}

// Perfil do usuário logado: dados da sessão, resumo do uso e saída.
export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { contents, subjects, dueCount } = useContentStore();

  const handleLogout = () => { logout(); navigate("/", { replace: true }); };

  return (
    <div className="h-full overflow-y-auto bg-sv-bg px-5 pt-10 pb-8 font-sans">
      <h1 className="m-0 mb-6 text-2xl font-extrabold text-sv-ink">Perfil</h1>

      <section className="mb-5 flex items-center gap-4 rounded-sv-xl bg-white p-5 shadow-sv-card">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sv-purple-bg text-sv-purple-text">
          <User size={26} />
        </span>
        <div className="min-w-0">
          <p className="m-0 truncate text-lg font-bold text-sv-ink">{user?.name}</p>
          <p className="m-0 flex items-center gap-1.5 truncate text-sm text-sv-muted">
            <Mail size={14} /> {user?.email}
          </p>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-3 gap-3">
        <Stat label="Conteúdos" value={contents.length} />
        <Stat label="Matérias" value={subjects.length} />
        <Stat label="Revisões hoje" value={dueCount} />
      </section>

      <button
        type="button"
        onClick={handleLogout}
        className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-sv-lg border border-sv-red-border bg-sv-red-bg px-4 py-3 text-sm font-bold text-sv-red"
      >
        <LogOut size={18} /> Sair da conta
      </button>
    </div>
  );
}
