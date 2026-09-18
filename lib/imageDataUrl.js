// Validação de imagem em data URL, compartilhada por qualquer endpoint que
// receba uma foto (análise e extração de texto) — evita duas cópias idênticas
// da mesma regex/limite em api/analyze.js e api/extract-text.js. Exporta só as
// constantes: cada endpoint mantém suas próprias mensagens de erro por caso
// (formato inválido vs. imagem grande demais), que já variavam entre eles.
export const MAX_IMAGE_BYTES = 6 * 1024 * 1024; // ~6MB de base64, dentro do limite de body da Vercel
export const DATA_URL_RE = /^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/i;
