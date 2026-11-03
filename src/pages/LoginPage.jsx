import { Link, useLocation, useNavigate } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout.jsx";
import AuthField from "../components/auth/AuthField.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useForm, isEmail } from "../hooks/useForm.js";
import { DEMO_USER } from "../services/authService.js";

const INITIAL = { email: "", password: "" };

function validate(v) {
  const errors = {};
  if (!isEmail(v.email)) errors.email = "Informe um e-mail válido.";
  if (!v.password) errors.password = "Informe a senha.";
  return errors;
}

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = location.state?.from || "/app/camera";

  const { values, errors, formError, submitting, handleChange, handleSubmit, setFieldValues } = useForm({
    initialValues: INITIAL,
    validate,
    onSubmit: async ({ email, password }) => {
      const result = await login(email, password);
      if (result.ok) navigate(destination, { replace: true });
      return result;
    },
  });

  return (
    <AuthLayout
      title="Entrar"
      subtitle="Acesse sua biblioteca de estudos."
      footer={<>Ainda não tem conta? <Link to="/cadastro" className="font-bold text-lp-blue-light">Cadastre-se</Link></>}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <AuthField label="E-mail" name="email" type="email" autoComplete="email" value={values.email}
          onChange={handleChange} error={errors.email} placeholder="voce@email.com" />
        <AuthField label="Senha" name="password" type="password" autoComplete="current-password" value={values.password}
          onChange={handleChange} error={errors.password} placeholder="Sua senha" />
        {formError && <p role="alert" className="m-0 text-sm text-red-400">{formError}</p>}
        <button type="submit" disabled={submitting}
          className="w-full cursor-pointer rounded-full border-none bg-lp-blue px-6 py-3 text-base font-bold text-white transition-colors hover:bg-lp-blue-light disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? "Entrando…" : "Entrar"}
        </button>
        <button type="button" onClick={() => setFieldValues({ email: DEMO_USER.email, password: DEMO_USER.password })}
          className="w-full cursor-pointer rounded-full border border-lp-line bg-transparent px-6 py-3 text-sm font-bold text-lp-text transition-colors hover:border-lp-blue-light">
          Preencher com usuário demo
        </button>
      </form>
    </AuthLayout>
  );
}
