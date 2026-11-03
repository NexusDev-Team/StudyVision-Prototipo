import { CheckCircle } from "lucide-react";
import { useContactForm } from "../../hooks/useContactForm.js";

const FIELD =
  "w-full rounded-xl border border-lp-line bg-lp-bg px-4 py-3 text-base text-white outline-none transition-colors placeholder:text-lp-muted focus:border-lp-blue-light";

function Field({ label, error, children }) {
  return (
    <label className="block text-left text-sm font-semibold text-lp-text">
      {label}
      <div className="mt-1.5">{children}</div>
      {error && <span role="alert" className="mt-1 block text-xs text-red-400">{error}</span>}
    </label>
  );
}

export default function ContactSection() {
  const { values, errors, formError, submitting, sent, handleChange, handleSubmit, sendAnother } = useContactForm();

  return (
    <section id="contato" className="mx-auto flex w-full max-w-xl flex-col justify-center px-5 py-6 md:py-10 min-h-[calc(100dvh-4.25rem)] scroll-mt-[4.25rem]">
      <h2 className="mb-5 text-center md:mb-8 text-3xl font-extrabold text-white md:text-4xl">Contato</h2>

      {sent ? (
        <div className="rounded-2xl border border-lp-line bg-lp-bg2 p-8 text-center">
          <CheckCircle className="mx-auto mb-3 text-lp-cyan" size={40} />
          <p className="m-0 text-lg font-bold text-white">Mensagem enviada!</p>
          <p className="mt-1 text-sm text-lp-muted">Obrigado pelo contato. Responderemos em breve.</p>
          <button
            type="button"
            onClick={sendAnother}
            className="mt-5 cursor-pointer rounded-full border border-lp-line bg-transparent px-5 py-2 text-sm font-bold text-lp-text hover:border-lp-blue-light"
          >
            Enviar outra mensagem
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="space-y-4 rounded-2xl border border-lp-line bg-lp-bg2 p-6 md:p-8">
          <Field label="Nome" error={errors.name}>
            <input name="name" value={values.name} onChange={handleChange} placeholder="Digite seu nome" className={FIELD} />
          </Field>
          <Field label="E-mail" error={errors.email}>
            <input name="email" type="email" value={values.email} onChange={handleChange} placeholder="Digite seu e-mail" className={FIELD} />
          </Field>
          <Field label="Mensagem" error={errors.message}>
            <textarea name="message" rows={4} value={values.message} onChange={handleChange} placeholder="Digite sua mensagem" className={`${FIELD} resize-y`} />
          </Field>
          {formError && <p role="alert" className="m-0 text-sm text-red-400">{formError}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full cursor-pointer rounded-full border-none bg-lp-blue px-6 py-3 text-base font-bold text-white transition-colors hover:bg-lp-blue-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Enviando…" : "Enviar"}
          </button>
        </form>
      )}
    </section>
  );
}
