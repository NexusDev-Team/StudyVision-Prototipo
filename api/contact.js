// POST /api/contact — formulário de contato da Landing Page (Sprint 4).
// Valida os campos e registra a mensagem no log da função. Não envia e-mail:
// é um protótipo acadêmico, sem serviço de e-mail configurado.

const MAX_NAME = 80;
const MAX_MESSAGE = 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Método não permitido." });
  }

  const { name, email, message } = req.body || {};
  const safeName = typeof name === "string" ? name.trim().slice(0, MAX_NAME) : "";
  const safeEmail = typeof email === "string" ? email.trim().slice(0, 120) : "";
  const safeMessage = typeof message === "string" ? message.trim().slice(0, MAX_MESSAGE) : "";

  if (!safeName) return res.status(400).json({ success: false, error: "Informe seu nome." });
  if (!EMAIL_RE.test(safeEmail)) return res.status(400).json({ success: false, error: "E-mail inválido." });
  if (safeMessage.length < 5) return res.status(400).json({ success: false, error: "Escreva uma mensagem um pouco maior." });

  console.log(`[api/contact] mensagem de ${safeName} <${safeEmail}> (${safeMessage.length} caracteres)`);
  return res.status(200).json({ success: true });
}
