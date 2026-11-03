import { useCallback, useState } from "react";
import { useForm, isEmail } from "./useForm.js";
import { sendContactMessage } from "../services/contactService.js";

const INITIAL = { name: "", email: "", message: "" };

function validate(values) {
  const errors = {};
  if (!values.name.trim()) errors.name = "Informe seu nome.";
  if (!isEmail(values.email)) errors.email = "Informe um e-mail válido.";
  if (values.message.trim().length < 5) errors.message = "Escreva uma mensagem um pouco maior.";
  return errors;
}

// Lógica do formulário de contato separada da UI (ContactSection só renderiza).
export function useContactForm() {
  const [sent, setSent] = useState(false);

  const onSubmit = useCallback(async (values) => {
    const result = await sendContactMessage(values);
    if (result.ok) setSent(true);
    return result;
  }, []);

  const form = useForm({ initialValues: INITIAL, validate, onSubmit });

  const sendAnother = () => { setSent(false); form.reset(); };

  return { ...form, sent, sendAnother };
}
