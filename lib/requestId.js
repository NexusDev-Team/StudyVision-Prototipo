// Correlaciona o log do servidor com o que aparece na tela de erro do
// cliente (Bloco 11). O CLIENTE gera o id (ver src/services/studyVisionService.js
// e analysisExtrasService.js) e envia no header `x-sv-request-id`; o servidor
// só o ecoa nos logs, nunca gera um novo — se vier ausente/inválido, cai num
// fallback fixo só para o log não quebrar (nunca lançar erro por causa disso).
export function getRequestId(req) {
  const id = req.headers?.["x-sv-request-id"];
  return typeof id === "string" && id.trim() ? id.trim().slice(0, 40) : "sem-id";
}
