// "Me perdi" (Etapa 2) — recapitulação 100% local, montada a partir da
// própria FocusSession já carregada. Nunca chama rede, nunca gera uma nova
// sessão: só relê o que já está na tela e no step anterior.

const SNIPPET_MAX_CHARS = 220;

function snippet(text) {
  const trimmed = String(text || "").trim();
  return trimmed.length > SNIPPET_MAX_CHARS ? `${trimmed.slice(0, SNIPPET_MAX_CHARS).trim()}…` : trimmed;
}

// Pura — recebe a sessão inteira para não acoplar a chamadores a como o
// índice é armazenado. No step 1 (sem anterior), recapitula o próprio step
// atual em vez de falhar.
export function buildLostRecap(session) {
  if (!session || !Array.isArray(session.steps) || session.steps.length === 0) return null;

  const index = Number.isInteger(session.currentStepIndex) ? session.currentStepIndex : 0;
  const current = session.steps[index] || session.steps[0];
  const previous = index > 0 ? session.steps[index - 1] : null;
  const source = previous || current;

  return {
    stepNumber: index + 1,
    totalSteps: session.steps.length,
    isFirstStep: !previous,
    recapTitle: source.title,
    recapSnippet: snippet(source.content),
  };
}
