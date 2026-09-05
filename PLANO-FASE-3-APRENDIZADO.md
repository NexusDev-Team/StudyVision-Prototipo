# PLANO — FASE 3: APRENDIZADO, DESEMPENHO E REVISÕES

---

## Context

As Fases 1 e 2 já entregaram a base: o modelo relacional com `Content` no centro,
uma camada única de persistência (`sv_db` v2) e telas migradas para ela. O aplicativo
já sabe **criar e organizar** conteúdo, e já grava tentativas de quiz e de flashcard.

O que ainda não existe é o elo entre a ação do estudante e a decisão do sistema:

1. **Revisões não vêm de desempenho.** `scheduleReviewsForContent`
   ([reviewService.js:18-30](src/services/reviewService.js#L18-L30)) cria **cinco revisões
   pendentes de uma vez** (D+1/3/7/15/30) no instante em que o conteúdo é salvo
   ([SummaryScreen.jsx:44](src/screens/SummaryScreen.jsx#L44)). O desempenho real nunca
   altera essas datas, e o conteúdo já nasce com 5 pendências — exatamente o cenário de
   duplicação que a Fase 3 pede para evitar.
2. **Domínio ignora volume de dados.** `masteryLevelFromScore`
   ([studyService.js:30-35](src/services/studyService.js#L30-L35)) usa só os limiares 80/60.
   Um único acerto isolado gera `mastered`.
3. **Não há desempenho por conteúdo.** `performanceService` só agrega global e por matéria;
   não existe `getContentPerformance`, nem separação quiz/flashcards por conteúdo, nem o
   conceito de `null` para "sem atividade" (hoje `calculateMastery` devolve `score: 0`).
4. **Dificuldade não é derivada.** `content.difficulty`
   ([content.js:71](src/data/models/content.js#L71)) vem da análise da IA sobre o material;
   nada reflete o nível recomendado ao estudante.
5. **Integridade tem furos conhecidos.** Flashcards e questões gerados em runtime pelo
   Vision+ existem só em memória, mas suas tentativas são gravadas com ids efêmeros
   ([FlashcardsScreen.jsx:49,57](src/screens/FlashcardsScreen.jsx#L49)) — attempts apontando
   para `flashcardId` que não existe em `content.flashcards`.
6. **Resultados não mostram percentual.** Quiz exibe "acertou X de Y"
   ([QuizScreen.jsx:91](src/screens/QuizScreen.jsx#L91)), flashcards "lembrou X de Y"
   ([FlashcardsScreen.jsx:124](src/screens/FlashcardsScreen.jsx#L124)). Nenhum dos dois usa o
   `score` 0-100 já calculado no attempt, nem compara com o histórico.

**Resultado pretendido:** cada resposta gera registro; cada registro alimenta um cálculo
transparente; cada cálculo decide domínio, dificuldade e a próxima revisão. Sem números
inventados, tudo persistido, sem redesenhar calendário nem dashboard.

---

## Auditoria — o que já existe (não recriar)

Levantamento feito antes de qualquer alteração.

### Já funciona e deve ser reaproveitado

| Item | Onde | Situação |
|---|---|---|
| `FlashcardAttempt` (`id`, `flashcardId`, `contentId`, `correct`, `answeredAt`, `responseTimeMs`) | [flashcard.js:16](src/data/models/flashcard.js#L16) | Completo. Atende à estrutura pedida. |
| `QuizAttempt` (`id`, `quizId`, `contentId`, `score` 0-100 derivado, `correctAnswers`, `totalQuestions`, `answeredAt`, `answers[]`) | [quiz.js:30-40](src/data/models/quiz.js#L30-L40) | Completo. `score` já é calculado, nunca gravado à mão. |
| Resposta por questão (`questionId`, `selectedAnswer`, `correct`) | [quiz.js:31-35](src/data/models/quiz.js#L31-L35) | Existe dentro de `attempt.answers`. Falta só `correctAnswer` no registro. |
| Append-only do histórico | [studyService.js:9-19](src/services/studyService.js#L9-L19) | Correto — nunca sobrescreve. |
| `Review` (`id`, `contentId`, `stage`, `scheduledFor`, `status`, `completedAt`, `reason`) | [review.js:5-16](src/data/models/review.js#L5-L16) | Estrutura correta; falta `updatedAt` e `skippedAt`. |
| Persistência única (`sv_db`, `readDb/writeDb/withDb`, cota, migração) | [src/data/storage/](src/data/storage/) | Nenhum componente fala com `localStorage` direto (exceto `subscription.js`). Manter assim. |
| Cascade delete de conteúdo | [contentService.js:44-62](src/services/contentService.js#L44-L62) | Já limpa reviews, ambos os attempts e desvincula eventos. |
| `ContentStoreContext.mutate` (escreve e relê o snapshot) | [ContentStoreContext.jsx:30-34](src/context/ContentStoreContext.jsx#L30-L34) | Padrão de escrita da UI. Usar sempre. |
| Estados vazios já corretos | `MetricCards.jsx:15,33`, `SubjectProgress.jsx:18`, `ContentDetailScreen.jsx:80` | Já mostram `—` / "Ainda sem tentativas". |
| Suíte de testes sem framework | [scripts/test-data-layer.mjs](scripts/test-data-layer.mjs), `npm run test:data` | 26 testes passando. Estender, não substituir. |

### Confirmações da auditoria

- **Não existe "horas estudadas" no projeto.** Grep por `studyHours`/`horas` retorna apenas
  o comentário em [MetricCards.jsx:5](src/components/plus/MetricCards.jsx#L5) e a linha 138 do
  `PLANO-FASE-1-DADOS.md`. **Nada a remover** — só garantir que não seja introduzido.
- **Único mock remanescente:** `notionService.js` (`setTimeout` + URL falsa), documentado em
  `MOCKS.md`. Fora do escopo da Fase 3.
- **Campo morto:** `content.isSample` não tem nenhum leitor. Fora do escopo (não mexer).
- **Sem UI de exclusão de conteúdo.** `deleteContent` e `deleteSubject` existem mas não têm
  consumidor. A Fase 3 **não** cria essa UI (decisão do usuário: não poluir a interface);
  garante apenas que o cascade e a varredura de órfãos funcionem.

---

## Decisões desta fase

| Tema | Decisão |
|---|---|
| **Revisões** | No máximo **uma revisão pendente por conteúdo**. Criada em D+1 ao salvar o conteúdo; depois de cada atividade a pendente é **reagendada** pelo desempenho. `stage` só incrementa quando a anterior é concluída. |
| **UI de revisões** | **Nenhuma nova tela, lista ou seção** de revisões pendentes. Calendário, `ReviewScreen` e `LibraryScreen` continuam como estão. |
| **Domínio** | Mantém os 4 níveis (`not_started`/`needs_review`/`developing`/`mastered`). Com **menos de 3 interações**, o nível é limitado a `developing` mesmo com 100%. Sem nível `learning` (preserva o teste T4b e `getMasteryMeta`). |
| **Exibição** | Só `ContentDetailScreen` + telas de resultado de Quiz e Flashcards. Vision+ e Biblioteca ficam para a Fase 5. |
| **Dificuldade** | Novo campo `content.recommendedDifficulty` (derivado do desempenho). **Não** sobrescrever `content.difficulty`, que descreve o material analisado pela IA. |

### Regras de negócio (explícitas e testáveis)

**Intervalo de revisão por desempenho** (`REVIEW_INTERVALS`):

| Desempenho | Dias | `reason` |
|---|---|---|
| sem dados | 1 | `first_study` |
| < 60% | 1 | `low_performance` |
| 60–79% | 3 | `reinforcement` |
| 80–89% | 7 | `consolidation` |
| ≥ 90% | 14 | `long_term` |
| agendada pelo usuário | — | `manual` (nunca sobrescrita automaticamente) |

**Desempenho do conteúdo** (`overall`):
- só quiz → `quizPerformance`; só flashcards → `flashcardPerformance`;
- ambos → média simples; nenhuma atividade → **`null`** (nunca `0`).

**Domínio:** `not_started` sem tentativa; `< 60` → `needs_review`; `60–79` → `developing`;
`≥ 80` → `mastered`, **exceto** com menos de 3 interações, quando fica em `developing`.
Interação = 1 flashcard respondido ou 1 questão de quiz respondida.

**Dificuldade recomendada:** `< 60` → `easy`; `60–79` → `medium`; `≥ 80` → `hard`; sem dados → `null`.

---

## Regra de execução (obrigatória em toda tarefa)

Cada tarefa é fechada em si. **Não avançar para a próxima sem concluir este ciclo:**

1. Implementar a tarefa.
2. `npm run test:data` — 100% verde (26 testes atuais + os novos da tarefa).
3. `npm run build` — sem erro.
4. Verificação manual descrita na tarefa (quando houver UI).
5. Se falhar: corrigir **nesta mesma tarefa** e repetir os passos 2-4. Sem `TODO`, sem
   "arrumo depois", sem seguir adiante com teste vermelho.
6. Commit único, Conventional Commits, em português, **sem linha `Co-Authored-By`**.

---

## Tarefas

### T1 — Modelo: campos de suporte

**Arquivos:** [src/data/models/review.js](src/data/models/review.js),
[src/data/models/content.js](src/data/models/content.js),
[src/data/models/quiz.js](src/data/models/quiz.js),
[src/data/models/validate.js](src/data/models/validate.js)

- `createReview`: adicionar `updatedAt` (ISO, default = `createdAt`/`nowIso()`) e
  `skippedAt` (ISO|null). Manter todos os campos atuais.
- `createContent`: adicionar `recommendedDifficulty` (`"easy"|"medium"|"hard"|null`, default `null`).
- `createQuizAttempt`: em cada item de `answers`, gravar também `correctAnswer` (além de
  `questionId`, `selectedAnswer`, `correct`), fechando a estrutura pedida na Fase 3.
- `validateContent`: aceitar o novo campo; validar que `recommendedDifficulty` é um dos
  valores permitidos ou `null`.

**Verificação:** teste novo `F3-1` — round-trip JSON de `Review`, `Content` e `QuizAttempt`
preserva os campos novos; `validateContent` rejeita `recommendedDifficulty: "impossível"`.

**Commit:** `feat(dados): adiciona campos de revisao, dificuldade recomendada e resposta correta`

---

### T2 — reviewService orientado a desempenho

**Arquivo:** [src/services/reviewService.js](src/services/reviewService.js)

- Substituir `REVIEW_OFFSETS` por `REVIEW_INTERVALS` (tabela acima) + `REVIEW_REASON_META`
  (`{ label, days }` por `reason`), usado pela UI para rotular a revisão sem depender do `stage`.
- `scheduleInitialReview(contentId, fromIso)` — cria **uma** review, `stage: 1`, D+1,
  `reason: "first_study"`. Substitui `scheduleReviewsForContent`.
- `resolveReviewInterval(performance)` → `{ days, reason }`.
- `scheduleReviewFromPerformance(contentId, performance)`:
  - se existe pendente com `reason === "manual"` → **não altera nada** (respeita a escolha do usuário);
  - se existe outra pendente → **atualiza** `scheduledFor`, `reason` e `updatedAt` (dedup);
  - se não existe → cria com `stage = (nº de reviews concluídas) + 1`.
  - **Invariante: nunca mais de uma pendente por conteúdo.**
- `ensureNextReview(contentId)` — cria a próxima pendente **apenas** se não houver nenhuma,
  usando o desempenho atual (ou D+1 se ainda não houver dados).
- `markReviewDone(reviewId)` — após concluir, chamar `ensureNextReview(contentId)` para o
  conteúdo nunca ficar sem próxima revisão.
- `skipReview(reviewId)` — passar a gravar `skippedAt` (hoje não grava timestamp).
- `getPendingReviews()`, `getCompletedReviews()`, `getOverdueReviews()` (pendentes com
  `scheduledFor` anterior ao início de hoje).
- Manter `getReviewsForContent`, `nextPendingReview`, `isContentDueForReview`,
  `getDueReviews`, `markReviewDone`, `scheduleManualReview`, `formatDue`, `shuffle`.

**Ordem crítica a documentar em comentário:** em modo revisão, a tela registra tentativas
(o que reagenda a pendente para o futuro) e só depois chama `markReviewDone` — a pendente
reagendada é a que se conclui, e `ensureNextReview` cria a seguinte. Cobrir isso em teste.

**Verificação:** `F3-2` (intervalo por faixa de desempenho), `F3-3` (10 atividades seguidas ⇒
exatamente 1 pendente), `F3-4` (revisão `manual` não é sobrescrita), `F3-5` (`markReviewDone`
gera a próxima pendente com `stage` incrementado).

**Commit:** `feat(revisoes): agenda revisao unica por conteudo a partir do desempenho real`

---

### T3 — Atualizar consumidores de `REVIEW_OFFSETS`

**Arquivos:** [src/screens/SummaryScreen.jsx:11,44](src/screens/SummaryScreen.jsx#L44),
[src/screens/ContentDetailScreen.jsx:9,20,95](src/screens/ContentDetailScreen.jsx#L95),
[src/screens/ReviewScreen.jsx:15,71-83](src/screens/ReviewScreen.jsx#L71-L83),
[src/components/study/DayEventsModal.jsx:44](src/components/study/DayEventsModal.jsx#L44)

- `SummaryScreen`: `scheduleReviewsForContent` → `scheduleInitialReview`.
- `ContentDetailScreen`: remover `STAGE_LABEL`; o card de revisão passa a mostrar
  `Próxima revisão: {REVIEW_REASON_META[next.reason].label} · {formatDue(...)}` e o rodapé
  vira `"{doneCount} revisões concluídas"` (sem denominador fixo).
- `ReviewScreen` / `DayEventsModal`: `stageLabel` → rótulo derivado de `reason`.
- **Nenhuma lista, aba, badge ou seção nova de revisões pendentes.**

**Verificação manual:** `npm run dev` → criar conteúdo → detalhe mostra "Próxima revisão:
Primeiro estudo · amanhã"; calendário mostra 1 marcador de revisão (não 5); modal do dia abre
com o rótulo correto.

**Commit:** `refactor(revisoes): substitui ciclo fixo D+1..D+30 por rotulo derivado do motivo`

---

### T4 — Domínio com mínimo de interações

**Arquivo:** [src/services/studyService.js](src/services/studyService.js)

- `MIN_INTERACTIONS_FOR_MASTERY = 3` exportado.
- `getInteractionCount(contentId)` = `flashcardAttempts.length` + soma de
  `quizAttempts[].totalQuestions`.
- `masteryLevelFromScore(score, hasAttempts, interactions = Infinity)` — com
  `interactions < 3`, rebaixa `mastered` para `developing`. **Assinatura retrocompatível**
  (3º parâmetro opcional) para não quebrar os testes T4/T4b existentes.
- `calculateMastery` passa a informar `interactions` e a expor esse número no retorno.

**Verificação:** `F3-6` — 1 flashcard correto ⇒ `score 100`, `level "developing"`;
3 flashcards corretos ⇒ `mastered`; T4b continua verde (nível `learning` não existe).

**Commit:** `feat(dominio): exige minimo de interacoes antes de considerar conteudo dominado`

---

### T5 — Desempenho por conteúdo

**Arquivo:** [src/services/performanceService.js](src/services/performanceService.js)

- `getQuizPerformance(contentId)` → `{ attempts, questionsAnswered, questionsCorrect,
  questionsWrong, accuracyRate|null, averageScore|null, bestScore|null, lastScore|null,
  history: [{ score, answeredAt }] }` (histórico ordenado por data, base da evolução da Fase 5).
- `getFlashcardPerformance(contentId)` → `{ reviewed, correct, wrong, accuracyRate|null,
  lastAnsweredAt|null }`.
- `getContentPerformance(contentId)` → `{ quiz, flashcards, overall: number|null,
  interactions, hasActivity }`. `overall` segue a regra do topo — **`null`, nunca `0`**.

**Verificação:** `F3-7` (4/5 no quiz ⇒ `overall 80`), `F3-8` (8/10 flashcards ⇒ `80`),
`F3-9` (só quiz ⇒ `overall = quiz`; sem atividade ⇒ `overall === null` e `hasActivity false`),
`F3-10` (2 tentativas ⇒ `history.length === 2`, `bestScore` = a maior, primeira preservada).

**Commit:** `feat(desempenho): calcula desempenho de quiz, flashcards e geral por conteudo`

---

### T6 — Métricas agregadas reais

**Arquivo:** [src/services/performanceService.js](src/services/performanceService.js)

- `getSubjectPerformance(subjectId)` → média dos `overall` **não nulos** dos conteúdos da
  matéria + `{ contentsCount, contentsWithActivity, mastered, needsReview }`. Derivado dos
  conteúdos reais, sem métrica paralela.
- `getContentMetrics()` → `{ total, studied, mastered, needsReview, notStarted }`.
- `getReviewMetrics()` → `{ pending, completed, overdue }` (via `reviewService`).
- `getPerformanceSummary` e `getSubjectsWithPerformance` **permanecem intactos** — Vision+
  não muda nesta fase.

**Verificação:** `F3-11` — Matemática/Derivadas com quiz respondido e História/Revolução
Francesa sem atividade: desempenho de História permanece `null`, `getSubjectPerformance` de
Matemática reflete só Derivadas (Teste 9 obrigatório).

**Commit:** `feat(metricas): adiciona desempenho por materia e contadores de conteudo e revisao`

---

### T7 — Dificuldade recomendada

**Arquivo:** [src/services/studyService.js](src/services/studyService.js)

- `getRecommendedDifficulty(contentId)` — `easy`/`medium`/`hard`/`null` conforme a regra do topo.
- `updateRecommendedDifficulty(contentId)` — persiste em `content.recommendedDifficulty`.
- **Não** alterar `content.difficulty`. Comentar no código que este campo é o sinal para a
  geração adaptativa de questões pela IA em fases futuras.

**Verificação:** `F3-12` — desempenho 45 ⇒ `easy`; 70 ⇒ `medium`; 95 ⇒ `hard`; sem dados ⇒ `null`
e campo persiste após releitura do db.

**Commit:** `feat(dificuldade): deriva nivel recomendado do desempenho real do conteudo`

---

### T8 — Orquestrador `registerActivity`

**Arquivo:** [src/services/studyService.js](src/services/studyService.js)

- `registerActivity(contentId)` executa, nesta ordem: `updateMastery` →
  `updateRecommendedDifficulty` → `scheduleReviewFromPerformance(contentId, overall)`.
  Retorna `{ mastery, recommendedDifficulty, review, performance }`.
- Objetivo: as telas chamam **uma** função; nenhuma fórmula, agendamento ou escrita fica em
  componente.

**Verificação:** `F3-13` — quiz com 45% ⇒ `mastery.level === "needs_review"`,
`recommendedDifficulty === "easy"`, revisão pendente para D+1 (Testes 6 e 7 obrigatórios).

**Commit:** `feat(estudo): centraliza registro de atividade em orquestrador unico`

---

### T9 — QuizScreen: resultado real

**Arquivo:** [src/screens/QuizScreen.jsx](src/screens/QuizScreen.jsx)

- Substituir `updateMastery(content.id)` ([linha 57](src/screens/QuizScreen.jsx#L57)) por
  `registerActivity(content.id)`, mantendo `recordQuizAttempt` antes e tudo dentro de `mutate`.
- Guardar o attempt retornado no estado e exibir no resultado:
  `{attempt.score}% · {correctAnswers} de {totalQuestions}`.
- Comparação com o histórico: se `getQuizPerformance(contentId).history` tiver tentativa
  anterior, mostrar a variação (ex.: `↑ +20 pts em relação à última tentativa`). Se for a
  primeira, não mostrar nada — sem número inventado.
- Manter a guarda de gravação única (`recordedRef`) e a de ids ausentes.

**Verificação manual:** responder 5 questões acertando 4 ⇒ tela mostra **80%**; refazer com
5/5 ⇒ mostra **100%** e a variação; `sv_db.quizAttempts` contém **duas** entradas.

**Commit:** `feat(quiz): exibe percentual real e comparacao com a tentativa anterior`

---

### T10 — FlashcardsScreen: resultado real

**Arquivo:** [src/screens/FlashcardsScreen.jsx](src/screens/FlashcardsScreen.jsx)

- Substituir `updateMastery(contentId)` ([linhas 59-62](src/screens/FlashcardsScreen.jsx#L59-L62))
  por `registerActivity(contentId)` na última carta. Manter uma tentativa gravada **por carta**
  (comportamento correto já existente).
- Resultado passa a mostrar: `N revisados · ✓ acertos · ✕ erros · X% de aproveitamento`,
  calculado a partir das `grades` da sessão; percentual acumulado do conteúdo vem de
  `getFlashcardPerformance`.
- Em `reviewMode`, garantir a ordem: registrar tentativas → `registerActivity` →
  `onReviewComplete()` (que faz `markReviewDone`).

**Verificação manual:** 10 flashcards com 8 acertos ⇒ "80% de aproveitamento" (Teste 3);
recarregar a página ⇒ domínio e desempenho do conteúdo continuam (Teste 4).

**Commit:** `feat(flashcards): exibe aproveitamento real da sessao e do conteudo`

---

### T11 — Não registrar tentativas de itens efêmeros

**Arquivos:** [src/screens/FlashcardsScreen.jsx:11-19,25,49,57](src/screens/FlashcardsScreen.jsx#L49),
[src/screens/QuizScreen.jsx:12-20,26,61-63](src/screens/QuizScreen.jsx#L12-L20)

Flashcards e questões gerados pelo Vision+ existem só em memória; hoje suas respostas viram
attempts com `flashcardId`/`questionId` inexistentes no db.

- Marcar os itens gerados (`ephemeral: true`) e **pular o registro** de tentativa para eles.
- No quiz, o attempt final considera apenas as questões persistidas do quiz.
- Não converter esses geradores em mocks persistidos — eles continuam sendo placeholder de
  UI até a geração real por IA.

**Verificação:** `F3-14` — nenhum `flashcardAttempt`/`answer` referencia id ausente do db
(Parte 13, itens 1-7).

**Commit:** `fix(estudo): ignora tentativas de itens gerados em memoria pelo Vision+`

---

### T12 — Bloco de desempenho na página de Conteúdo

**Arquivo:** [src/screens/ContentDetailScreen.jsx](src/screens/ContentDetailScreen.jsx)

- Abaixo do card DOMÍNIO existente, um único card **DESEMPENHO** com três valores de
  `getContentPerformance(content.id)`: Quiz, Flashcards, Geral.
- Estado vazio (`hasActivity === false`): `—` e a linha "Ainda não há dados suficientes".
  Cada modalidade sem dados mostra `—` individualmente (Teste 11 e Parte 10).
- Reaproveitar o estilo dos cards existentes (`ContentDetailScreen.jsx:75-84`). Sem nova tela,
  sem gráfico, sem lista de revisões.

**Verificação manual:** conteúdo novo sem atividade ⇒ "Ainda não há dados suficientes",
nenhum `0%`; após um quiz de 80% ⇒ Quiz 80%, Flashcards `—`, Geral 80%.

**Commit:** `feat(conteudo): exibe desempenho real com estado vazio explicito`

---

### T13 — Varredura de integridade

**Arquivo novo:** `src/services/integrityService.js`;
montagem em [src/context/ContentStoreContext.jsx](src/context/ContentStoreContext.jsx)

- `sweepOrphans()` — remove, em um único `withDb`: attempts (dos dois tipos) e reviews cujo
  `contentId` não existe em `db.contents`; attempts sem `flashcardId`/`quizId`. Retorna as
  contagens removidas.
- Executar **uma vez** no mount do `ContentStoreProvider`, antes do primeiro `readSnapshot`.
- Não criar UI de exclusão. O cascade de `deleteContent` já está correto e permanece.

**Verificação:** `F3-15` — injetar attempt/review órfãos direto no db, rodar `sweepOrphans`,
conferir que sumiram e que os registros válidos ficaram (Teste 10).

**Commit:** `feat(integridade): remove tentativas e revisoes orfas ao iniciar o app`

---

### T14 — Testes obrigatórios e documentação

**Arquivos:** [scripts/test-data-layer.mjs](scripts/test-data-layer.mjs),
`MOCKS.md`, `PLANO-FASE-3-APRENDIZADO.md`

- Bloco `FASE 3` no runner, cobrindo os 11 testes obrigatórios do briefing, mapeados assim:

| Teste do briefing | Cobertura |
|---|---|
| 1 — quiz 4/5 = 80% | F3-7 |
| 2 — segunda tentativa, histórico 80% e 100% | F3-10 |
| 3 — 10 flashcards, 8 acertos = 80% | F3-8 |
| 4 — reload preserva histórico | F3-16 (novo: reler o db do zero e reconferir) |
| 5 — desempenho vem de dados reais | F3-7/F3-9 |
| 6 — desempenho baixo ⇒ `needs_review` | F3-13 |
| 7 — desempenho baixo ⇒ revisão criada | F3-13 |
| 8 — sem duplicação de revisões | F3-3 |
| 9 — conteúdos não se contaminam | F3-11 |
| 10 — exclusão sem referência quebrada | F3-15 + teste de cascade existente |
| 11 — estado vazio sem `0%` | F3-9 |

- Atualizar `MOCKS.md`: registrar que flashcards/questões do Vision+ são placeholders de UI e
  **não** geram tentativas; reafirmar que não existe métrica de tempo de estudo.
- Marcar todos os critérios de aceitação do briefing no documento da fase, com o arquivo/função
  que atende cada um.

**Verificação:** `npm run test:data` verde com os 26 testes originais **mais** os da Fase 3;
`npm run build` limpo.

**Commit:** `test(fase-3): cobre os 11 cenarios obrigatorios de aprendizado e revisao`

---

## Verificação end-to-end (após T14)

1. `npm run test:data` → todos verdes, zero falhas.
2. `npm run build` → sem erro.
3. `npm run dev` e, no app:
   - criar dois conteúdos em matérias diferentes (ex.: Matemática/Derivadas, História/Revolução Francesa);
   - **Derivadas:** detalhe mostra "Ainda não há dados suficientes" e nenhum `0%`;
   - responder o quiz acertando 4 de 5 → resultado **80%**; voltar ao detalhe → Quiz 80%, Geral 80%,
     Domínio `Dominando`, "Próxima revisão: Consolidação · em 7 dias";
   - refazer o quiz com 5/5 → resultado 100% com a variação; ainda **uma única** revisão pendente,
     agora em 14 dias;
   - responder 10 flashcards com 8 acertos → "80% de aproveitamento";
   - **História:** detalhe continua sem dados — nada mudou;
   - recarregar a página (F5) → todos os números permanecem;
   - abrir o calendário → apenas **um** marcador de revisão por conteúdo, e eventos acadêmicos
     continuam visualmente distintos das revisões.
4. DevTools → `JSON.parse(localStorage.sv_db)`: `quizAttempts` com 2 entradas, `flashcardAttempts`
   com 10, `reviews` com exatamente 1 `pending` por conteúdo, nenhum attempt com `contentId`
   ausente de `contents`.

---

## Fora de escopo (explicitamente não fazer)

- Dashboard final de evolução, gráficos temporais e redesenho do Vision+ (Fase 5).
- Redesenho do calendário e novas listagens de revisão (Fase 4 / decisão do usuário).
- Tela ou botão de exclusão de conteúdo.
- Registro de tentativa parcial ao abandonar o quiz no meio (mantém o comportamento atual:
  só tentativas concluídas são gravadas).
- Spaced repetition científico, IA adaptativa, backend, autenticação, nova camada de persistência.
- Qualquer métrica de tempo de estudo.
