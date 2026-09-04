# Fase 5 — Evolução e Study Vision+ (Study Vision)

## Contexto

As Fases 1–4 construíram a fundação: modelo relacional com `Content` no centro (`localStorage["sv_db"]`, schema v2), tentativas append-only de quiz e flashcards, mastery em 4 níveis com mínimo de 3 interações, revisões espaçadas com no máximo uma pendente por conteúdo, biblioteca por matéria e calendário acadêmico. Hoje o app já **produz dados reais de aprendizagem**, mas não os devolve ao estudante como evolução.

O que existe de dashboard hoje mora dentro do `VisionPlusScreen` e é, na prática, uma tela de upsell: `MetricCards` visíveis, `SubjectProgress`/`PerformanceChart`/`InsightCard` borrados atrás do `PlusPaywall`. Os números são reais (`performanceService`), mas a leitura é comercial, não pedagógica — e os componentes calculam percentuais e aplicam régua de classificação (thresholds 80/60) dentro da própria UI.

A Fase 5 transforma esses dados numa **experiência de evolução acadêmica**: uma camada de serviço (`evolutionService`) que calcula tudo, uma tela de Evolução gratuita e completa, e um Study Vision+ que vende profundidade e escala em vez de bloquear o aprendizado.

Não há escopo de Fase 6 documentado no repositório; esta fase encerra em produto + dados + experiência, sem pagamento real, sem IA de recomendação, sem gamificação.

### Decisões tomadas com o usuário

| # | Decisão |
|---|---|
| 1 | **Bottom nav continua com 4 itens.** "Evolução" ocupa o slot que era do Vision+. A `VisionPlusScreen` vira tela de oferta, alcançável pelo CTA do dashboard (`go("visionplus")`), não pela nav. O calendário continua dentro da tela de Revisão (decisão da Fase 4). |
| 2 | **Free = dashboard inteiro.** Nenhuma métrica de evolução é bloqueada. O Study Vision+ vende apenas: flashcards ilimitados, geração ilimitada de quiz/questões, e a seção de Insights & recomendações. |
| 3 | **Gráfico de evolução por semana**, agrupando `answeredAt` real de quiz e flashcards, com semana começando na segunda em horário local. Semanas sem atividade não viram ponto — nada de linha fabricada. |
| 4 | **O teste de 7 dias expira de verdade.** `trialEndsAt = trialStartedAt + 7 dias`; passado o prazo, o plano volta a `free` e a tela informa o fim do teste. Recursos gratuitos permanecem intactos. Sem cobrança real. |
| 5 | Commits assinados apenas pelo usuário — sem linha `Co-Authored-By`. |

---

## Auditoria — o que já existe (não recriar)

**Modelos** (`src/data/models/`) — `createContent` (com `mastery`, `recommendedDifficulty`, `flashcards[]`, `quizzes[]`), `createFlashcardAttempt({ flashcardId, contentId, correct, answeredAt, responseTimeMs })`, `createQuizAttempt({ quizId, contentId, answers })` → calcula `score`, `correctAnswers`, `totalQuestions`, `answeredAt`; `createReview` (`stage`, `scheduledFor`, `status`, `completedAt`, `reason`); `createEvent` + `EVENT_TYPES`/`EVENT_TYPE_META`.

**Storage** — `src/data/storage/index.js` (`readDb`, `writeDb`, `withDb`, migração automática de `sv_items`), `DB_KEY = "sv_db"`, `SCHEMA_VERSION = 2`, poda por cota. Assinatura vive fora do banco acadêmico em `localStorage["sv_subscription"]`.

**Services já prontos** (`src/services/`):
- `performanceService.js` — `getPerformanceSummary()`, `getQuizPerformance(contentId)` (com `history: [{ score, answeredAt }]` ordenado), `getFlashcardPerformance(contentId)`, `getContentPerformance(contentId)` (`overall` = null sem atividade, nunca 0), `getPerformanceForSubject(subjectId)` (agregado bruto de acertos), `getSubjectPerformance(subjectId)` (média dos `overall`), `getSubjectsWithPerformance()`, `getContentMetrics()`, `getReviewMetrics()`.
- `studyService.js` — `MIN_INTERACTIONS_FOR_MASTERY = 3`, `masteryLevelFromScore(score, hasAttempts, interactions)`, `getInteractionCount`, `calculateMastery`, `registerActivity(contentId)`, `recordQuizAttempt`, `recordFlashcardAttempt`.
- `reviewService.js` — `getPendingReviews()`, `getCompletedReviews()`, `getOverdueReviews()`, `getDueReviews()`, `nextPendingReview`, `markReviewDone`, `REVIEW_INTERVALS`, `REVIEW_REASON_META`, `reviewReasonLabel`.
- `subjectService.js`, `eventService.js`, `contentService.js`, `integrityService.js`, `exportService.js`, `subscription.js`.

**Estado React** — `ContentStoreContext` (`contents`, `subjects`, `reviews`, `events`, `dueCount`, `reload`, `mutate`), `useNavigation` (`screen`, `go`, `goBack`, `reviewMode`), `useSubscription`, `useToast`.

**Componentes reutilizáveis** — `ui/`: `Card`, `Button`, `Badge`, `Modal`, `ConfirmDialog`, `EmptyState`, `FilterPills`, `SectionLabel`, `ProgressBar`, `ProgressRing`, **`SparkChart`** (line+area SVG animado, aceita `points`/`labels` — existe e nunca foi importado), `SubjectFolderGrid`. `plus/`: `PlusHeader`, `PlusHero`, `PlusActiveStatus`, `MetricCards`, `SubjectProgress`, `PerformanceChart`, `StrengthsCard`, `AttentionCard`, `InsightCard`, `PlanComparison`, `PlusFinalCta`, `PlusPaywall`.

**Utilitários** — `utils/date.js` (`nowIso`, `toIso`, `toMs`, `toDayKey`, `fromDayKey`, `addDaysIso`, `endOfTodayIso`, `formatDueIso`, `relativeLabel`), `utils/search.js` (`matchesQuery`), `constants.js` (`MASTERY_META`, `getMasteryMeta`, `FREE_FLASHCARD_LIMIT = 5`, `UNASSIGNED_SUBJECT_LABEL`).

**Testes** — `scripts/test-data-layer.mjs` (runner caseiro, `node:assert/strict`, shim de localStorage), 66 cenários, `npm run test:data`. Zero teste de UI.

**Sem biblioteca de gráficos** — `package.json` tem apenas `@google/genai`, `framer-motion`, `jspdf`, `lucide-react`, `react`. Gráficos são SVG à mão. **Não instalar biblioteca nova.**

### Bugs e lacunas confirmadas na auditoria (são o trabalho da fase)

| # | Problema | Onde |
|---|---|---|
| B1 | Não existe camada de evolução; a tela chama services direto e os componentes calculam métricas | `VisionPlusScreen.jsx`, `PerformanceChart.jsx` (`count/total`), `StrengthsCard.jsx`, `AttentionCard.jsx` |
| B2 | Régua de classificação duplicada: thresholds 80/60 hardcoded na UI, concorrendo com `masteryLevelFromScore` | `StrengthsCard.jsx`, `AttentionCard.jsx`, `VisionPlusScreen.jsx` |
| B3 | Não existe série temporal agregada. `history` é por conteúdo e só de quiz; `flashcardAttempts` não entram em histórico nenhum | `performanceService.getQuizPerformance` |
| B4 | `SparkChart` foi construído e nunca importado — não há gráfico de evolução no app | `src/components/ui/SparkChart.jsx` |
| B5 | `getReviewMetrics()` existe e não é consumido por nenhuma tela; reviews não aparecem em métricas | `performanceService.js` |
| B6 | O teste de 7 dias não expira: `isPlus = status === "plus"` ignora `trialStartedAt`; o contador chega a 0 e o plano continua premium | `services/subscription.js`, `hooks/useSubscription.js`, PRD 11.2 |
| B7 | O estado de assinatura não tem `plan`/`trialEndsAt`; hoje é só `{ status: "free"\|"plus", trialStartedAt }` | `services/subscription.js` |
| B8 | Preço "R$ 9,90" hardcoded em 4 arquivos e `TRIAL_DAYS` num quinto — sem fonte única | `PlusHero.jsx`, `PlusFinalCta.jsx`, `PlusPaywall.jsx`, `VisionPlusScreen.jsx`, `subscription.js` |
| B9 | Não existe taxa de acerto global unificada (quiz + flashcards). O card "desempenho" usa `averageMasteryScore`, que é outra coisa | `performanceService.js`, `MetricCards.jsx` |
| B10 | Empty states do dashboard são inline em 5 componentes, ignorando o `ui/EmptyState` padronizado na Fase 4 | `SubjectProgress`, `PerformanceChart`, `StrengthsCard`, `AttentionCard`, `InsightCard` |
| B11 | Sem drill-down: não dá para ir do dashboard a uma matéria ou a um conteúdo fraco | `VisionPlusScreen.jsx` |
| B12 | `getPerformanceForSubject` e `getSubjectPerformance` têm nomes quase idênticos e semânticas diferentes; nada documenta qual usar | `performanceService.js` |
| B13 | Vision+ é item de bottom nav; precisa virar tela de oferta sem quebrar `go`/`goBack`/`navActive` | `BottomNav.jsx`, `App.jsx` |
| B14 | Sem dados, `MetricCards` mostra "—" cru; o briefing exige mensagem explícita ("Sem dados ainda") para não parecer 0% | `MetricCards.jsx` |
| B15 | `PRD.md` 5.4/5.2/5.10 e `README.md` descrevem mocks e regras já removidos (`REVIEW_OFFSETS` D+1/D+3/D+7/D+15/D+30, "X/5 concluídas", `SAMPLE_ITEMS`, `storage`/`reviewEngine`/`plusMetrics`) | `PRD.md`, `README.md` |
| B16 | Nenhum teste cobre assinatura, trial ou qualquer cálculo de evolução | `scripts/test-data-layer.mjs` |

---

## Regras de execução (valem para todas as tarefas)

1. **Uma tarefa por vez.** Não começar a próxima antes de a atual estar verificada.
2. Ao fim de cada tarefa: `npm run test:data` verde **e** `npm run build` verde. Tarefas com verificação de browser exigem também `npm run dev` e a checagem descrita.
3. Bug encontrado durante uma tarefa é corrigido **dentro dela**, antes do commit. Nada de "corrijo depois".
4. **Um commit por tarefa**, Conventional Commits com tipo em inglês e descrição em português, sem acentos na mensagem. Sem `Co-Authored-By`. Sem `--no-verify`. Branch `main`.
5. **Nenhum dado mockado, nenhuma métrica inventada, nenhum ponto de gráfico fabricado.** Se não há dado, o estado é vazio.
6. Nenhuma métrica é calculada dentro de componente React — tudo vem do `evolutionService`.
7. Não instalar dependências novas.
8. Não tocar em cobrança real, IA de recomendação, gamificação, ranking, backend ou APIs externas.

---

## Tarefas

### T0 — Salvar o plano na raiz

Criar `PLANO-FASE-5-EVOLUCAO.md` na raiz com este conteúdo.

**Verificação:** arquivo existe na raiz e aparece em `git status`.
**Commit:** `docs(fase-5): documenta plano de evolucao e study vision plus`

---

## Bloco A — Camada de evolução (fundação)

### T1 — Fonte única de constantes de plano e preço

`src/constants.js`. Adicionar `PLUS_PRICE_LABEL = "R$ 9,90"`, `PLUS_PRICE_PERIOD = "/mês"`, `PLUS_PRICE_FULL = "R$ 9,90/mês"`, `TRIAL_DAYS = 7`, `PLUS_BENEFITS` (array de rótulos do plano) e `FREE_BENEFITS`. Substituir as strings hardcoded em `PlusHero.jsx`, `PlusFinalCta.jsx`, `PlusPaywall.jsx` e `VisionPlusScreen.jsx`; `subscription.js` passa a importar `TRIAL_DAYS` de `constants.js`. (B8)

**Verificação:** `grep -r "9,90" src/` retorna apenas `src/constants.js`. `npm run build` verde.
**Commit:** `refactor(fase-5): centraliza preco e beneficios do plano em constants`

### T2 — `evolutionService.getEvolutionSummary()`

Criar `src/services/evolutionService.js`. Ele **consome** `performanceService`, `reviewService`, `studyService`, `contentService` e `subjectService` — não lê `sv_db` direto, exceto para as agregações temporais da T5. Nenhum dado novo é persistido.

```js
getEvolutionSummary() -> {
  totalContents, contentsStudied, subjectsStudied,
  questionsAnswered, correctAnswers, incorrectAnswers, quizAccuracy,      // null se questionsAnswered === 0
  flashcardsReviewed, flashcardsCorrect, flashcardAccuracy,               // null se flashcardsReviewed === 0
  overallAccuracy,                                                        // (correctAnswers + flashcardsCorrect) / (questionsAnswered + flashcardsReviewed) * 100, null se denominador 0
  masteredContents, developingContents, needsReviewContents, notStartedContents,
  reviewsCompleted, reviewsPending, reviewsOverdue,
  hasActivity                                                             // true se houve QUALQUER tentativa
}
```

Regras: `contentsStudied` = conteúdos com `mastery.level !== "not_started"` (criar conteúdo não conta como estudar). `subjectsStudied` = matérias distintas entre os conteúdos estudados. Toda taxa é `null`, nunca `0`, quando não há denominador. (B9, B12 — documentar em comentário de topo qual função de matéria serve a quê.)

**Verificação:** novos testes em `scripts/test-data-layer.mjs`: banco vazio → `hasActivity: false` e todas as taxas `null`; após 1 quiz de 2 questões com 1 acerto → `questionsAnswered: 2`, `correctAnswers: 1`, `quizAccuracy: 50`; conteúdo criado e nunca estudado não entra em `contentsStudied`.
**Commit:** `feat(fase-5): adiciona evolutionService com resumo geral de evolucao`

### T3 — Desempenho por conteúdo e por matéria

No `evolutionService`:

```js
calculateContentPerformance(contentId) -> { contentId, title, subjectId, subjectName, questionsAnswered, correctAnswers, flashcardsReviewed, flashcardsCorrect, accuracy, interactions, masteryLevel, masteryLabel, hasActivity }
calculateSubjectPerformance(subjectId)  -> { subjectId, name, contentsCount, contentsWithActivity, questionsAnswered, correctAnswers, accuracy, mastered, needsReview, hasActivity }
getSubjectPerformances()                -> array só com hasActivity, ordenado por accuracy desc
```

**Regra crítica (briefing §9):** a acurácia da matéria é a soma de acertos dividida pela soma de respostas **dos conteúdos com atividade** — nunca a média aritmética dos percentuais, e nunca contando conteúdo sem atividade como 0. Conteúdo sem atividade tem `accuracy: null` e é excluído do denominador. `masteryLevel` reusa `masteryLevelFromScore` do `studyService`, inclusive `MIN_INTERACTIONS_FOR_MASTERY = 3`. (B2)

**Verificação:** testes — matéria com dois conteúdos ativos (85%, 72%) e um sem atividade resulta em acurácia agregada dos dois ativos, e **não** em `(85+72+0)/3`; matéria sem nenhum conteúdo ativo tem `accuracy: null` e `hasActivity: false`; conteúdo com 2 interações e 100% fica em `developing`, não `mastered`.
**Commit:** `feat(fase-5): calcula desempenho por conteudo e por materia sem distorcer medias`

### T4 — Pontos fortes e conteúdos para reforço

No `evolutionService`:

```js
getStrongSubjects({ limit = 3 })  // matérias com atividade e accuracy >= STRONG_THRESHOLD (80), desc
getWeakContents({ limit = 5 })    // conteúdos com accuracy < WEAK_THRESHOLD (60) OU com review pendente atrasada, asc por accuracy
```

Constantes `STRONG_THRESHOLD`/`WEAK_THRESHOLD` exportadas pelo serviço, alinhadas aos cortes de mastery. Cada item de `getWeakContents` traz `reason` (`"low_accuracy"` ou `"overdue_review"`) para a UI escolher o texto. Remover os thresholds de `StrengthsCard.jsx` e `AttentionCard.jsx`. (B1, B2)

**Verificação:** testes — matéria sem atividade nunca aparece em `getStrongSubjects`; conteúdo com 58% aparece em `getWeakContents` com `reason: "low_accuracy"`; conteúdo com review atrasada e sem tentativas aparece com `reason: "overdue_review"`; ambas as listas voltam vazias em banco novo.
**Commit:** `feat(fase-5): deriva pontos fortes e conteudos para reforco dos dados reais`

### T5 — Histórico semanal de desempenho

No `evolutionService`:

```js
getProgressHistory({ weeks = 8 }) -> [{ weekStart, label, answered, correct, accuracy }]
```

Lê `db.quizAttempts` e `db.flashcardAttempts`, agrupa por semana usando `answeredAt` real. A semana começa na segunda-feira em horário local — adicionar `startOfWeekKey(value)` em `src/utils/date.js` reusando `toDayKey`/`fromDayKey`. Cada quiz contribui com `totalQuestions`/`correctAnswers`; cada flashcard contribui com 1/`correct ? 1 : 0`. **Só semanas com pelo menos uma resposta viram ponto**; semanas vazias entre duas ativas não são preenchidas com zero nem interpoladas. `label` em pt-BR ("22 set"). Retorna `[]` se não houver tentativa. (B3)

Adicionar também `getAccuracyDelta({ weeks = 4 })` → `{ deltaPoints, from, to }` ou `null` se houver menos de 2 pontos — é o que alimenta o insight "+8 p.p.".

**Verificação:** testes — banco vazio → `[]`; tentativas em duas semanas separadas por uma semana vazia → exatamente 2 pontos; `answeredAt` de domingo e da segunda seguinte caem em semanas diferentes; `getAccuracyDelta` retorna `null` com 1 ponto só.
**Commit:** `feat(fase-5): agrega historico semanal de desempenho a partir de answeredAt`

### T6 — Reviews na evolução

No `evolutionService`: `getReviewProgress()` → `{ pending, completed, overdue, dueToday, contentsInReview: [{ contentId, title, scheduledFor, reason, reasonLabel }] }`, montado sobre `reviewService`. Review continua sendo mecanismo de aprendizagem e **não** vira evento de calendário. (B5)

**Verificação:** testes — review criada aparece como `pending`; após `markReviewDone`, `completed` incrementa e a nova pendente gerada por `ensureNextReview` aparece em `pending`; review com `scheduledFor` no passado conta em `overdue`.
**Commit:** `feat(fase-5): integra revisoes pendentes e concluidas as metricas de evolucao`

### T7 — Recomendações determinísticas

No `evolutionService`: `getRecommendations({ limit = 3 })` → `[{ id, tone: "positive"|"attention"|"neutral", title, message, action: { screen, contentId?, subjectId? } | null }]`.

Montadas por regras fixas sobre os resultados anteriores (conteúdo mais fraco, matéria mais forte, revisões atrasadas, delta semanal positivo). Texto orientado a ação, nunca punitivo. Zero IA, zero aleatoriedade — a mesma entrada produz sempre a mesma saída. Lista vazia quando não há dados. (briefing §12, §19)

**Verificação:** testes — duas chamadas seguidas com o mesmo banco retornam listas idênticas; banco vazio → `[]`; conteúdo com 58% gera recomendação `attention` apontando para ele.
**Commit:** `feat(fase-5): gera recomendacoes deterministicas a partir do desempenho`

---

## Bloco B — Assinatura

### T8 — `subscriptionService` com trial que expira

Renomear `src/services/subscription.js` para `src/services/subscriptionService.js` e expandir o estado persistido em `localStorage["sv_subscription"]`:

```js
{ plan: "free" | "premium", status: "active" | "trial" | "expired", trialStartedAt: ISO|null, trialEndsAt: ISO|null }
```

API: `getSubscription()`, `startTrial()`, `isPremium()`, `isTrialActive()`, `trialDaysRemaining()`, `resetToFree()`. `getSubscription()` **deriva** o estado na leitura: se `status === "trial"` e `now >= trialEndsAt`, persiste `{ plan: "free", status: "expired" }` mantendo `trialStartedAt`/`trialEndsAt` como histórico. Migrar em silêncio o formato antigo (`{ status: "plus" }` → `{ plan: "premium", status: "trial", trialEndsAt: trialStartedAt + 7d }`). Nada disso toca `sv_db` — assinatura e dados acadêmicos ficam separados. (B6, B7)

**Verificação:** testes — banco novo → `{ plan: "free", status: "active" }`; `startTrial()` → `plan: "premium"`, `status: "trial"`, `trialEndsAt` exatamente 7 dias depois, `isPremium() === true`; com `trialEndsAt` no passado, `getSubscription()` devolve `expired` e `isPremium() === false`; formato antigo migra sem perder `trialStartedAt`.
**Commit:** `feat(fase-5): expande assinatura com plano status e expiracao real do teste`

### T9 — `useSubscription` e propagação no App

`src/hooks/useSubscription.js` passa a expor `{ plan, status, isPremium, isTrialActive, trialDaysRemaining, startTrial, resetToFree }`. `App.jsx` continua chamando o hook uma vez e passa `isPremium` (não mais `isPlus`) às telas; renomear a prop em todos os consumidores. Reavaliar o estado no mount e ao voltar de background (`visibilitychange`), para o trial expirar sem precisar de reload. Manter o long-press de reset no `PlusHeader` como recurso de demonstração.

**Verificação (browser):** iniciar o teste, recarregar a página — segue premium; adulterar `trialEndsAt` para o passado no devtools e recarregar — volta a free, sem perder nenhum conteúdo, quiz ou review. `npm run build` verde.
**Commit:** `refactor(fase-5): propaga estado premium unico a partir do useSubscription`

---

## Bloco C — Tela de Evolução

### T10 — Tela e navegação

Criar `src/screens/EvolutionScreen.jsx`. Em `BottomNav.jsx`, trocar o item `visionplus` por `evolution` (rótulo "Evolução", ícone `TrendingUp` do lucide-react), mantendo 4 itens e o indicador `layoutId="navdot"`. Em `App.jsx`, adicionar o case `evolution` ao switch e ao cálculo de `navActive`; `visionplus` continua uma tela válida, alcançável só por `go("visionplus")` a partir do CTA — com `goBack` funcionando. (B13)

Nesta tarefa a tela renderiza apenas header ("Minha evolução" / "Acompanhe como você está aprendendo") e o esqueleto das seções.

**Verificação (browser):** os 4 itens navegam; o item Evolução fica ativo na tela nova; entrar no Vision+ pelo CTA e voltar não quebra a pilha; nav continua escondida em `camera` e `analysis`.
**Commit:** `feat(fase-5): cria tela de evolucao e integra a navegacao principal`

### T11 — Resumo e desempenho geral

Seções RESUMO (conteúdos estudados, questões respondidas, taxa de acerto, reviews concluídas) e DESEMPENHO (anel de acurácia geral via `ProgressRing` + distribuição de domínio via `PerformanceChart`, agora recebendo os números já calculados). Todos os valores vêm de `getEvolutionSummary()`.

Empty states com `ui/EmptyState` (B10, B14): sem nenhuma atividade, a tela inteira mostra "Você ainda não tem dados de evolução — capture seu primeiro conteúdo e comece a estudar para acompanhar seu progresso"; taxa `null` mostra "Sem dados ainda", nunca "0%". Nenhum texto de tempo ou horas de estudo.

**Verificação (browser):** `localStorage.clear()` → empty state, zero número inventado; capturar um conteúdo sem estudar → segue sem taxa de acerto e "conteúdos estudados: 0"; responder um quiz → os quatro números do resumo mudam de acordo.
**Commit:** `feat(fase-5): exibe resumo e desempenho geral com estados vazios reais`

### T12 — Matérias com drill-down

Seção MATÉRIAS listando `getSubjectPerformances()` — todas as matérias com atividade, sem paywall (decisão 2). Adaptar `SubjectProgress.jsx` para receber a lista pronta e remover o corte `visibleCount = 2` e o wrapper de paywall. Tocar numa matéria navega para a Biblioteca já filtrada por aquele `subjectId`. (B11)

**Verificação (browser):** duas matérias com atividade aparecem com percentuais reais; matéria sem atividade não aparece; tocar em "Matemática" abre a Biblioteca filtrada; voltar preserva o estado.
**Commit:** `feat(fase-5): lista desempenho por materia com navegacao para a biblioteca`

### T13 — Gráfico de evolução semanal

Seção EVOLUÇÃO usando o `SparkChart` já existente com os pontos de `getProgressHistory()` (B4). Regras: 0 pontos → `EmptyState` ("Responda questões para acompanhar sua evolução ao longo do tempo"); 1 ponto → mostrar o valor da semana em texto, sem desenhar linha; 2+ pontos → gráfico com rótulos de semana. Abaixo do gráfico, a alternativa textual acessível: lista "semana — X questões, Y% de acerto" (briefing §37).

**Verificação (browser):** banco vazio → estado vazio; um quiz → texto de semana única, sem linha; quizzes em semanas diferentes (ajustando `answeredAt` via devtools) → o número de pontos bate exatamente com o número de semanas com atividade, sem pontos intermediários.
**Commit:** `feat(fase-5): plota evolucao semanal usando somente semanas com atividade`

### T14 — Precisa de reforço

Seção PRECISA DE REFORÇO com `getWeakContents()`, adaptando `AttentionCard.jsx`: remover `hideNames`/blur (nada de métrica bloqueada) e o threshold local. Cada item mostra título, matéria, percentual ou o motivo `overdue_review`, e uma frase orientada a ação ("Esse conteúdo pode precisar de mais uma revisão"). Tocar no item abre o `ContentDetailScreen` daquele conteúdo. (B11, B2)

**Verificação (browser):** conteúdo com desempenho baixo aparece com o percentual real; tocar abre o detalhe correto; sem conteúdos fracos, a seção mostra estado vazio positivo em vez de sumir sem explicação.
**Commit:** `feat(fase-5): mostra conteudos para reforco com acesso direto ao conteudo`

### T15 — Reviews no dashboard

Seção REVIEWS com `getReviewProgress()`: pendentes, concluídas, atrasadas e a lista de conteúdos em revisão com `reasonLabel`. CTA leva à tela de Revisão. Deixar explícito na UI que revisão é aprendizagem, não compromisso de calendário — nenhuma review é renderizada como evento.

**Verificação (browser):** concluir uma revisão na tela de Revisão e voltar à Evolução — concluídas +1 e a próxima pendente aparece; nenhuma review aparece no grid do calendário.
**Commit:** `feat(fase-5): apresenta progresso de revisoes na tela de evolucao`

### T16 — Pontos fortes, insights e recomendações

Seção PONTOS FORTES com `getStrongSubjects()` (livre, via `StrengthsCard` adaptado). Seção INSIGHTS com `getRecommendations()` e o delta de `getAccuracyDelta()` — **esta é a única seção premium do dashboard**: no plano gratuito fica sob `PlusPaywall` com CTA para `go("visionplus")`; com premium ativo, renderiza normal. Os textos são montados a partir dos números reais (`InsightCard.buildInsight`), sem frase fabricada; sem dados suficientes, mostra estado vazio mesmo no premium.

**Verificação (browser):** free → insights borrados com CTA; iniciar teste → insights liberados com os mesmos números do resumo; sem dados → estado vazio em ambos os planos; nenhuma métrica além dos insights fica bloqueada.
**Commit:** `feat(fase-5): entrega pontos fortes livres e insights como recurso premium`

---

## Bloco D — Study Vision+

### T17 — Tela de oferta

Reescrever `VisionPlusScreen.jsx` como tela de oferta, reusando os componentes existentes: `PlusHeader`, `PlusHero` ("Experimente o Study Vision+ por 7 dias grátis" + `PLUS_PRICE_FULL`), lista de benefícios (flashcards personalizados ilimitados, quizzes ilimitados, insights detalhados da sua evolução, recursos avançados de estudo, acompanhamento mais profundo), `PlanComparison` (Study Vision "Essencial para estudar" × Study Vision+ "Para estudar mais e melhor", deixando claro que biblioteca, resumos, quizzes, flashcards, reviews e evolução seguem gratuitos) e `PlusFinalCta` com o CTA "Experimentar 7 dias grátis". Remover deste fluxo os paywalls de métrica que sobraram em `SubjectProgress`/`PerformanceChart`. Sem cobrança real, sem gateway, sem segundo plano de preço, sem desconto. Design sóbrio: nada de tabela comercial pesada, cores de cassino ou selo de urgência. (briefing §20–§27, §29)

**Verificação (browser):** preço aparece como R$ 9,90/mês e "7 dias grátis" está visível; CTA é o elemento mais destacado; nenhum overflow horizontal em 320px; voltar retorna à Evolução.
**Commit:** `feat(fase-5): reformula study vision plus como oferta de teste gratuito`

### T18 — Estados de assinatura e liberação de recursos

`PlusActiveStatus` passa a cobrir três estados: teste ativo (com dias restantes), premium ativo e teste encerrado ("Seu teste terminou — continue com R$ 9,90/mês", sem bloquear nada do gratuito). Recursos que respondem a `isPremium`: flashcards acima de `FREE_FLASHCARD_LIMIT = 5` em `FlashcardsScreen`, "Gerar mais" em `QuizScreen` e `QuestionsScreen`, e a seção de insights da T16. Confirmar que **nada** relacionado a dados acadêmicos muda com o plano: mesmas tentativas, mesma mastery, mesmas reviews, mesmos números.

**Verificação (browser):** free → 5 flashcards e "Gerar mais" bloqueado, mas quiz, review e todas as métricas funcionam; iniciar teste → flashcards ilimitados e insights liberados, e o resumo mostra exatamente os mesmos números de antes; expirar o teste → volta ao limite de 5 sem perder nenhum dado.
**Commit:** `feat(fase-5): aplica estados de teste e premium aos recursos de estudo`

### T19 — Responsividade e acessibilidade

Revisar Evolução e Vision+ em 320px, 375px, 768px e 1280px: cards empilhados no mobile, uso do espaço horizontal no desktop, gráfico legível, CTA sempre alcançável, paywall sem overflow. Acessibilidade: hierarquia de headings, `aria-label` nos botões-ícone, alvos ≥44px, foco visível (`:focus-visible` já global), navegação por teclado nas seções clicáveis (elementos focáveis de verdade, com Enter/Espaço), informação nunca dependente só de cor (a distribuição de domínio e os itens de reforço ganham rótulo textual), e a alternativa textual do gráfico da T13.

**Verificação (browser):** percorrer as duas telas só com Tab/Enter, sem armadilha de foco; nenhum scroll horizontal em nenhuma das quatro larguras; distribuição de domínio legível em escala de cinza.
**Commit:** `feat(fase-5): torna evolucao e study vision plus responsivos e acessiveis`

---

## Bloco E — Qualidade e documentação

### T20 — Cobertura de testes

Ampliar `scripts/test-data-layer.mjs` cobrindo os 23 testes do briefing. Mapeamento dos que são automatizáveis na camada de dados:

| Briefing | Cenário | Tarefa de origem |
|---|---|---|
| 1 | usuário sem dados → tudo `null`/vazio | T2 |
| 2–5 | questão respondida, acerto, erro, percentual | T2 |
| 6 | desempenho de um Content | T3 |
| 7–9 | desempenho de matéria, agregação de vários contents, content sem atividade não distorce | T3 |
| 10–11 | review concluída e pendente nas métricas | T6 |
| 12 | histórico só com datas de atividade | T5 |
| 13–14 | iniciar trial e persistir após reload | T8 |
| 19 | premium não altera dados acadêmicos (mesmas métricas com `plan` free e premium) | T8 |
| 20 | nenhum número fictício (`grep` de mocks + asserção de `null` em banco vazio) | T20 |

Os testes 15–18 e 21–23 (preço, 7 dias na tela, free/premium na UI, mobile, desktop, reload completo) são verificação manual de browser — registrar o roteiro no fim do plano na raiz.

**Verificação:** `npm run test:data` verde com a contagem total impressa (66 anteriores + os novos).
**Commit:** `test(fase-5): cobre evolucao historico semanal e ciclo de assinatura`

### T21 — Documentação e limpeza

Atualizar `MOCKS.md` (registrar que a evolução não usa nenhum dado sintético e que o único mock remanescente segue sendo `notionService.js`), `PRD.md` (corrigir 5.2/5.4/5.10 — `REVIEW_INTERVALS` da Fase 3 no lugar de `REVIEW_OFFSETS`, remover "X/5 concluídas" e `SAMPLE_ITEMS`; reescrever 5.5 com o novo modelo free/premium; marcar em 11.2 a expiração do teste como resolvida) e `README.md` (remover as menções a `storage`, `reviewEngine`, `plusMetrics` e "dados mocados"). Remover código morto que tenha sobrado dos paywalls de métrica. (B15)

**Verificação:** `grep -ri "plusMetrics\|SAMPLE_ITEMS\|REVIEW_OFFSETS\|mocados" .` não retorna nada fora do histórico do git. `npm run build` verde.
**Commit:** `docs(fase-5): atualiza prd readme e mocks com a evolucao e o novo plano`

---

## Verificação final da fase

1. Dashboard de evolução existe, é gratuito e usa exclusivamente dados reais.
2. Nenhuma menção a horas de estudo ou tempo de sessão em qualquer lugar da UI.
3. Questões respondidas, acertos e erros batem com as tentativas gravadas.
4. Taxa de acerto correta, e `null` (não `0%`) quando não há resposta.
5. Desempenho por Content e por matéria funcionam; conteúdo sem atividade não entra em denominador nenhum.
6. Estados de domínio respeitam os cortes da Fase 3 e o mínimo de 3 interações.
7. Pontos fortes e conteúdos para reforço derivam dos dados; nenhum ranking artificial.
8. Reviews aparecem como pendentes/concluídas/atrasadas e não viram evento de calendário.
9. Histórico usa `answeredAt` real, só semanas com atividade, sem interpolação.
10. Empty states cobrem app recém-instalado em todas as seções.
11. Study Vision+ tem paywall sóbrio, R$ 9,90/mês e 7 dias grátis visíveis, com CTA claro.
12. Plano gratuito segue funcional: captura, biblioteca, resumo, quiz, flashcards, reviews e evolução completa.
13. Premium entrega flashcards ilimitados, geração ilimitada e insights — sem alterar nenhum número acadêmico.
14. Estado free/trial/premium persiste no reload e o teste expira de verdade; sem cobrança real.
15. Navegação integrada com 4 itens, drill-down de matéria e de conteúdo funcionando.
16. Interface responsiva de 320px a 1280px e navegável por teclado.
17. `npm run test:data` e `npm run build` verdes.

---

## Fora de escopo

Pagamentos reais, Stripe, Google Play Billing, contas de usuário, IA de recomendação ou tutor, gamificação, ranking, sistema social, novas APIs externas, backend e qualquer métrica de tempo de estudo.
