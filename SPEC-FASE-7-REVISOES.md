# Revisões atreladas a intenção: plano de cadência + compromisso

Data: 2026-09-05

## Problema

Hoje o `reviewService` agenda 1 revisão pendente por conteúdo ao salvar e
reagenda essa pendente a cada atividade de estudo, indefinidamente, com
rótulos ("Reforço", "Consolidação", "Longo prazo") que não correspondem a
nenhum prazo real. O usuário acumula muitas revisões sem motivo — nenhum
compromisso as justifica.

## Modelo novo: dois tipos de revisão

Toda revisão pendente passa a ter um `kind` explícito. Nenhuma revisão nasce
sem uma das duas intenções abaixo.

### 1. Revisão de plano (`kind: "plan"`)

- Novo campo no Content: `reviewPlan` ∈ `"none" | "weekly" | "biweekly" | "monthly"`.
  Modelo default `"none"`; a UI de captura oferece o seletor com default
  visual `"weekly"`.
- Intervalos: weekly = 7 dias, biweekly = 15, monthly = 30.
- **Exatamente uma** revisão de plano pendente por conteúdo. Ao concluí-la,
  agenda a próxima (intervalo a partir de `completedAt`).
- **Só dias úteis**: se a data calculada cair sábado/domingo, joga para a
  segunda-feira seguinte.
- **Distribuição de carga**: se o dia-alvo já tem `>= REVIEW_DAY_CAP` (3)
  revisões pendentes somando todos os conteúdos, empurra para o próximo dia
  útil com espaço (até 10 tentativas; se todos cheios, fica no alvo).
- `reviewPlan: "none"` → nenhuma revisão de plano; as pendentes de plano do
  conteúdo são removidas.

### 2. Revisão de compromisso (`kind: "commitment"`, `eventId` preenchido)

- Vale para eventos acadêmicos com data futura e tipo em
  `{exam, assignment, deadline}` (Prova, Trabalho, Entrega). `class` e
  `other` não geram revisão.
- Série de contagem regressiva rumo à data do evento **mais próximo**:
  marcos em **D-7, D-3, D-1** (marcos já passados são descartados; se o
  evento é hoje ou amanhã, gera ao menos o marco de hoje).
- Podem cair em fim de semana (seguem o compromisso; sem shift de dia útil).
- **Mescla com desempenho**: `advanceReviewsAfterActivity` pega a revisão de
  compromisso pendente mais próxima e, se o intervalo por desempenho atual
  (`<60→1`, `<80→3`, `<90→7`, `senão 14` dias) apontar uma data **anterior**
  à agendada, antecipa (nunca posterga além do marco). Mínimo: amanhã.
- Vários eventos futuros no mesmo conteúdo → série só para o mais próximo.
  Quando ele passa, `syncCommitmentReviews` reconstrói para o próximo.

### Atrasada

Revisão pendente com `scheduledFor` anterior ao início de hoje: no boot,
`scheduledFor` vira hoje (meio-dia local) e `overdue: true`. Continua
vencendo hoje e exibida como **"Atrasada"** até ser concluída/pulada.
Revisão de plano rolada que cair em fim de semana vai para segunda.

### Compromisso excluído ou vencido

`syncCommitmentReviews` roda em toda mutação de evento (via `eventService`).
Se o conteúdo não tem mais evento futuro elegível, as revisões de
compromisso **pendentes** dele são removidas (histórico concluído fica).
Revisões de plano não são afetadas por eventos.

## Migração no boot — `reconcileReviews()`

Roda em `ContentStoreContext`, logo após `sweepOrphans()`:

1. Content sem `reviewPlan` → grava `"none"` (conteúdos legados começam sem
   revisão de plano; o usuário liga no detalhe).
2. Remove toda revisão **pendente** que não seja `kind` `plan`/`commitment`/
   `manual`, ou `plan` com `reviewPlan === "none"`, ou `commitment` sem
   evento futuro elegível correspondente. (Limpa o backlog atual.)
3. `applyReviewPlan(contentId)` para cada conteúdo com plano ≠ none.
4. `syncCommitmentReviews(contentId)` para cada conteúdo.
5. Rola atrasadas (passo "Atrasada" acima).

Idempotente: rodar de novo não cria duplicatas nem remove nada válido.

## `reviewService` — API resultante

Removidos: `scheduleInitialReview`, `scheduleReviewFromPerformance`,
`ensureNextReview`, `REVIEW_INTERVALS` público como antes (vira interno de
`resolveReviewInterval`).

Mantidos: `getReviewsForContent`, `getPendingReviews`, `getCompletedReviews`,
`getDueReviews`, `getOverdueReviews` (passa a incluir `overdue === true`),
`nextPendingReview`, `isContentDueForReview`, `markReviewDone`, `skipReview`,
`scheduleManualReview` (evento tipo "Revisão"; `kind: "manual"`, sem sweep,
fim de semana permitido), `shuffle`, `formatDue`.

Novos:
- `REVIEW_PLANS`, `reviewPlanIntervalDays(plan)`
- `REVIEW_DAY_CAP`
- `applyReviewPlan(contentId, fromIso?)`
- `syncCommitmentReviews(contentId)`
- `advanceReviewsAfterActivity(contentId, performance)`
- `reconcileReviews()`
- `reviewLabel(review)` — "Atrasada" | "Revisão para prova/trabalho/entrega"
  | "Revisão programada" | "Agendada". `reviewReasonLabel` mantido como
  alias fino para não quebrar imports.

`reviewService` continua lendo eventos só via `readDb()` — não importa
`eventService` (evita ciclo). `eventService` passa a chamar
`syncCommitmentReviews` nos contentIds afetados em `createEventEntry`,
`updateEvent`, `deleteEvent`, `unlinkContentFromEvent` — cobrindo
`ReviewScreen`, `ContentDetailScreen` e `calendarService` sem alterá-los.

## Modelos

- `review.js`: `+ kind` (`"plan" | "commitment" | "manual"`), `+ eventId`
  (nullable), `+ overdue` (bool, default false). `reason` mantido para
  compatibilidade de leitura; `stage` mantido.
- `content.js`: `+ reviewPlan` (default `"none"`; valores válidos os de
  `REVIEW_PLANS`).

## UI

- **`SummaryScreen` / `PlanningSection`**: novo bloco "Plano de revisão" com
  4 opções (Nenhum · Semanal · Quinzenal · Mensal), default Semanal. O valor
  entra em `createContentEntry`; `handleSave` troca `scheduleInitialReview`
  por `applyReviewPlan(saved.id)` (o `scheduleCommitment` já cria o evento,
  que dispara `syncCommitmentReviews`).
- **`ContentDetailScreen`**: mesmo seletor "Plano de revisão", editável;
  troca chama `updateContent(id, { reviewPlan })` + `applyReviewPlan(id)`.
  O card de status de revisão usa `reviewLabel(next)` e mostra selo
  "Atrasada" quando `next.overdue`.
- **`ReviewScreen`**: linhas de revisão usam `reviewLabel`; "Atrasada"
  destacada. Sem mudança estrutural.
- **`EvolutionScreen` / `getReviewProgress`**: `reasonLabel` passa a vir de
  `reviewLabel(r)`. `getSubjectsToReview` e `getWeakContents` já cobrem
  atrasadas via `getOverdueReviews`.
- Componente novo `ReviewPlanPicker.jsx` em `components/study/`, reaproveitado
  pelas duas telas.

## Testes (`scripts/test-data-layer.mjs`)

- Reescrever os testes de revisão do bloco Fase 3/5 para o novo modelo:
  `resolveReviewInterval` (mantém), remoção de `scheduleInitialReview`/
  `scheduleReviewFromPerformance`.
- Novos: `applyReviewPlan` (um pendente; weekly/biweekly/monthly; sem fim de
  semana; cap de dia empurra), `syncCommitmentReviews` (série D-7/D-3/D-1;
  marcos passados descartados; evento removido cancela pendentes; troca para
  o evento mais próximo), `advanceReviewsAfterActivity` (antecipa, nunca
  posterga), `reconcileReviews` (limpa órfãs, idempotente, rola atrasada),
  `reviewLabel`.
- Ajustar F6-1 (cascade) e F4-18 (mover conteúdo preserva reviews) ao novo
  shape.
- `npm run build` + suíte verdes; verificação manual no navegador
  (captura → plano semanal → revisão em dia útil; criar Prova → série
  regressiva; excluir Prova → série some).

## Commits

Convencionais, PT-BR, escopo `fase-7`, pequenos: modelo+serviço, wiring de
eventos, UI de plano, migração/boot, testes.
