// Laço de retentativa do cliente para /api/analyze — extraído de useAnalysis
// para ser testável sem depender de React (mesmo padrão de mock de
// globalThis.fetch usado no resto da suíte). O hook só traduz o resultado em
// state e cuida das preocupações de UI (timer de "demora", cancelamento).
//
// Retenta sem sair da tela de carregamento só para falhas que uma nova
// tentativa pode resolver de verdade (rede instável, timeout, 5xx do
// backend) — "not_academic" e falhas de validação de entrada nunca entram
// aqui, pois repetir não muda o resultado. O servidor já retenta sozinho
// dentro de UMA invocação (lib/gemini.js); este laço cobre o caso em que a
// invocação inteira falhou (rede do cliente, backend fora do ar) — é o que
// hoje o usuário faz na mão ao clicar "Tentar novamente" e funcionar rápido
// na 2ª vez.
import { analyzeImage, normalizeAnalysisResult, analysisErrorMessage, AnalysisError } from "./studyVisionService.js";
import { makeThumbnail } from "../utils/image.js";

export const MAX_CLIENT_ATTEMPTS = 3;
export const RETRYABLE_KINDS = new Set(["network", "timeout", "server"]);
// Orçamento total alvo para a tela de carregamento (~60s, decisão do
// briefing) — governa se vale iniciar mais uma tentativa, nunca interrompe
// uma tentativa em andamento (o timeout por chamada vive em studyVisionService).
export const CLIENT_BUDGET_MS = 60000;

/**
 * @param {string} photoDataUrl
 * @param {object|null} preferences
 * @param {AbortSignal} [signal] - abortar cancela o laço inteiro; a função
 *   devolve `null` nesse caso (o chamador decide o que fazer com um cancelamento
 *   explícito, não é um resultado de sucesso nem de erro).
 * @returns {Promise<null | { ok: true, content: object, partial: string[] } | { ok: false, message: string, kind: string }>}
 */
export async function runAnalysisWithRetry(photoDataUrl, preferences, signal) {
  const startedAt = Date.now();
  let lastErr = null;

  for (let attempt = 1; attempt <= MAX_CLIENT_ATTEMPTS; attempt++) {
    if (signal?.aborted) return null;

    try {
      const [result, thumbnail] = await Promise.all([
        analyzeImage(photoDataUrl, { signal, preferences }),
        makeThumbnail(photoDataUrl).catch(() => photoDataUrl),
      ]);
      if (signal?.aborted) return null;

      const { content, validation } = normalizeAnalysisResult(result, thumbnail, preferences);
      const elapsedSoFar = Date.now() - startedAt;
      if (!validation.valid && attempt < MAX_CLIENT_ATTEMPTS && elapsedSoFar < CLIENT_BUDGET_MS) {
        // Núcleo já é garantido pelo servidor (validateCore) — chegar aqui
        // inválido é raro, mas vale uma nova geração em vez de mostrar um
        // Content incompleto sem avisar ninguém (bug antigo: `validation` era
        // descartado e o Content ruim seguia direto para a Summary).
        lastErr = new AnalysisError("Conteúdo gerado incompleto.", "server");
        continue;
      }

      return { ok: true, content, partial: Array.isArray(result.partial) ? result.partial : [] };
    } catch (err) {
      if (signal?.aborted) return null;
      lastErr = err;
      const kind = err instanceof AnalysisError ? err.kind : "technical";
      const elapsed = Date.now() - startedAt;
      const canRetryThisFailure = RETRYABLE_KINDS.has(kind) && attempt < MAX_CLIENT_ATTEMPTS && elapsed < CLIENT_BUDGET_MS;
      if (!canRetryThisFailure) break;
      // continua para a próxima tentativa
    }
  }

  if (signal?.aborted) return null;
  return {
    ok: false,
    message: analysisErrorMessage(lastErr),
    kind: lastErr instanceof AnalysisError ? lastErr.kind : "technical",
  };
}
