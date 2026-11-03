import { Link, useNavigate } from "react-router-dom";
import AuthLayout from "../components/auth/AuthLayout.jsx";
import AuthField from "../components/auth/AuthField.jsx";
import { useAuth } from "../hooks/useAuth.js";
import { useForm, isEmail } from "../hooks/useForm.js";

const INITIAL = { name: "", email: "", password: "", confirm: "" };

function validate(v) {
  const errors = {};
  if (v.name.trim().length < 2) errors.name = "Informe seu nome.";
  if (!isEmail(v.email)) errors.email = "Informe um e-mail válido.";
  if (v.password.length < 6) errors.password = "A senha precisa ter ao menos 6 caracteres.";
  if (v.confirm !== v.password) errors.confirm = "As senhas não conferem.";
  return errors;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const { values, errors, formError, submitting, handleChange, handleSubmit } = useForm({
    initialValues: INITIAL,
    validate,
    onSubmit: async ({ name, email, password }) => {
      const result = await register({ name, email, password });
      if (result.ok) navigate("/app/camera", { replace: true });
      return result;
    },
  });

  return (
    <AuthLayout
      title="Criar conta"
      subtitle="Leva menos de um minuto."
      footer={<>Já tem conta? <Link to="/login" className="font-bold text-lp-blue-light">Entrar</Link></>}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <AuthField label="Nome" name="name" autoComplete="name" value={values.name} onChange={handleChange}
          error={errors.name} placeholder="Seu nome" />
        <AuthField label="E-mail" name="email" type="email" autoComplete="email" value={values.email}
          onChange={handleChange} error={errors.email} placeholder="voce@email.com" />
        <AuthField label="Senha" name="password" type="password" autoComplete="new-password" value={values.password}
          onChange={handleChange} error={errors.password} placeholder="Mínimo 6 caracteres" />
        <AuthField label="Confirmar senha" name="confirm" type="password" autoComplete="new-password" value={values.confirm}
          onChange={handleChange} error={errors.confirm} placeholder="Repita a senha" />
        {formError && <p role="alert" className="m-0 text-sm text-red-400">{formError}</p>}
        <button type="submit" disabled={submitting}
          className="w-full cursor-pointer rounded-full border-none bg-lp-blue px-6 py-3 text-base font-bold text-white transition-colors hover:bg-lp-blue-light disabled:cursor-not-allowed disabled:opacity-60">
          {submitting ? "Criando…" : "Criar conta"}
        </button>
      </form>
    </AuthLayout>
  );
}
