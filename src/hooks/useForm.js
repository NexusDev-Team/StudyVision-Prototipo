import { useCallback, useState } from "react";

// Hook de formulário: valores, erros por campo e submit assíncrono.
// `validate(values)` devolve { campo: "mensagem" } — vazio = válido.
// `onSubmit(values)` pode devolver { ok:false, error } para um erro geral.
export function useForm({ initialValues, validate, onSubmit }) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    setErrors((errs) => (errs[name] ? { ...errs, [name]: undefined } : errs));
  }, []);

  const setFieldValues = useCallback((next) => setValues((v) => ({ ...v, ...next })), []);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setFormError(null);
  }, [initialValues]);

  const handleSubmit = useCallback(async (e) => {
    e?.preventDefault();
    const found = validate ? validate(values) : {};
    setErrors(found);
    setFormError(null);
    if (Object.keys(found).length > 0) return;
    setSubmitting(true);
    try {
      const result = await onSubmit(values);
      if (result && result.ok === false) setFormError(result.error || "Não foi possível concluir.");
      return result;
    } finally {
      setSubmitting(false);
    }
  }, [values, validate, onSubmit]);

  return { values, errors, formError, submitting, handleChange, handleSubmit, setFieldValues, reset };
}

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
