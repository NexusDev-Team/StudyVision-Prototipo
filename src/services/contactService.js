// Envia o formulário de contato da Landing Page para POST /api/contact.
export async function sendContactMessage({ name, email, message }) {
  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, message }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.success) return { ok: true };
    return { ok: false, error: data.error || "Não foi possível enviar agora. Tente novamente." };
  } catch {
    return { ok: false, error: "Sem conexão. Verifique sua internet e tente novamente." };
  }
}
