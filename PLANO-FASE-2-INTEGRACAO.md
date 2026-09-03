# Fase 2 — Integração: telas sobre a camada de dados real

## Contexto

A Fase 1 entregou a fundação completa (`sv_db` versionado, modelos, migração v1→v2, sete serviços) mas parou de propósito antes de ligar a UI. O resultado é um app com duas realidades convivendo:

- **Nenhum produtor de tentativa.** `FlashcardsScreen` guarda acertos em `useState` (`src/screens/FlashcardsScreen.jsx:23`) e `QuizScreen` guarda o score em `useState` (`src/screens/QuizScreen.jsx:32`). Os serviços `recordFlashcardAttempt` / `recordQuizAttempt` (`src/services/studyService.js:9,15`) existem, foram testados e **não têm um único chamador na UI**.
- **Dashboard Vision+ 100% fictício.** Os seis componentes de `src/components/plus/` importam `src/data/plusMetrics.js` diretamente — 78% de domínio, 18h estudadas, quatro semanas de gráfico: nada é medido. `performanceService` existe e ninguém o chama.
- **Adaptador legado como gargalo.** Todas as telas leem através de `toLegacyItem` (`src/data/adapters/toLegacyItem.js:37`), uma projeção *lossy*: só `images[0]` vira `photo`, só `quizzes[0]` vira `quiz`, só `events[0]` vira `calendarEvent`, `mastery` não é projetado e o **`quizId` é descartado** — o que torna `recordQuizAttempt` literalmente impossível de chamar hoje.
- **Escritas silenciosamente perdidas.** `storage.saveItem` (`src/services/storage.js:29`) só propaga revisões concluídas e `calendarEvent`. Qualquer edição de título, resumo ou notas passada por ele é descartada sem erro.
- **Estado não compartilhado.** `App`, `LibraryScreen` e `ReviewScreen` criam três instâncias independentes de `useStudyItems` (`src/App.jsx:29`, `LibraryScreen.jsx:12`, `ReviewScreen.jsx:13`). Um `reload()` numa não alcança as outras.
- **Pendências da Fase 1.** `scripts/test-data-layer.mjs` e `MOCKS.md` foram especificados no plano anterior e nunca criados; oito arquivos seguem sem commit no working tree.

**Resultado esperado:** as telas passam a ler e escrever o `Content` canônico direto dos serviços; o adaptador legado, o `reviewEngine` e o shim `storage.js` deixam de existir; Vision+ mostra apenas números medidos; o calendário separa revisão de compromisso acadêmico e persiste de verdade; e o botão de PDF gera um documento real.

## Decisões tomadas com o usuário

| Assunto | Decisão |
|---|---|
| Vision+ | **Só o real.** Cards passam a mostrar apenas o que `performanceService` mede. `studyMinutes`, `weeks`, `strengths`, `attention` e `insight` saem ou viram estado vazio explícito ("ainda sem dados"). Sem rastreio de tempo de sessão nesta fase. |
| Adaptador legado | **Remover.** Telas migram para o `Content` canônico. Saem `toLegacyItem`, `applyLegacyCalendarEvent`, `src/services/storage.js` e `src/services/reviewEngine.js`. |
| `calendarService` | **Virar real** sobre `eventService` / `reviewService`. |
| Notion | **Continua demo**, rotulado no `MOCKS.md`. |
| Exportação PDF | **Virar real**, mas com escopo definido: resumo, itens relacionados (conceitos-chave / palavras-chave) e a lista de perguntas abertas. **Sem quiz e sem flashcards** — o PDF é uma lista de questões para estudar. |
| Pendências da Fase 1 | **Tarefa 0, antes de tudo.** Commit do working tree, script dos 20 cenários e `MOCKS.md` primeiro, para que cada tarefa da Fase 2 tenha verificação automática. |

---

## Bugs confirmados pela auditoria

Corrigidos ao longo das tarefas indicadas. Os marcados com ▲ são silenciosos — falham sem erro visível.

| # | Onde | Problema | Corrigido em |
|---|---|---|---|
| B1 ▲ | `src/data/storage/index.js:44` | `writeDb` e `withDb` são reexportados **direto de `db.js`**, contornando `ensureMigrated()`. Se a primeira operação da sessão for uma escrita, o `sv_items` legado nunca é migrado e some da visão do app. | T0.3 |
| B2 | `src/screens/ReviewScreen.jsx:38` | `new Date(dueAt).toISOString().slice(0,10)` usa **UTC**, enquanto `CalendarMonth.jsx:10` usa local. Perto da meia-noite o compromisso cai no dia errado. `toDayKey` já existe em `src/utils/date.js`. | T0.3 |
| B3 ▲ | `src/services/contentService.js:64` | `addImageToContent` não devolve o `result` de `writeDb` — a quota estoura justamente no caminho da foto e o usuário não é avisado. | T0.3 |
| B4 | `src/App.jsx:29`, `LibraryScreen.jsx:12`, `ReviewScreen.jsx:13` | Três instâncias independentes de `useStudyItems`; `reload()` numa não propaga às outras. | T1 |
| B5 ▲ | `src/services/storage.js:29` | `saveItem` descarta edições de título/resumo/notas/flashcards sem erro. | T2 (arquivo removido) |
| B6 | `src/App.jsx:110-117` | `QuizScreen` e `QuestionsScreen` renderizam mesmo com `selectedItem === null` (falta o guard que Detail e Flashcards têm). | T2a |
| B7 | `src/screens/LibraryScreen.jsx:18-23` | Busca acessa `it.concept` / `it.subject` sem guarda; item sem título quebra a tela. | T2a |
| B8 | `FlashcardsScreen.jsx:8-11`, `QuizScreen.jsx:10-24` | Cards e questões extras do Plus são gerados **sem `id`** — tentativas sobre eles não são rastreáveis. | T3 |
| B9 | `src/services/studyService.js:30` | `masteryLevelFromScore` nunca produz o nível `learning`, que existe no model e é contado em `masteryBreakdown`. Decidir: produzir ou remover do model. | T4 |
| B10 | `src/screens/ContentDetailScreen.jsx:14-18` | `calendarEvent` vive em `useState` local e é salvo via `saveItem`; o `selectedItem` do App continua com o snapshot velho. | T1 + T6 |
| B11 | `src/data/adapters/toLegacyItem.js:58-67` | O `id` do quiz é achatado e perdido, tornando `recordQuizAttempt({quizId})` inviável. | T2b |

---

## Tarefas

Cada tarefa é um ponto de revisão e **um commit**. Nenhuma avança sem a verificação da anterior passar.

### T0 — Fechar a Fase 1

**T0.1 — Commit do working tree.** Oito arquivos modificados (`src/App.jsx`, `migrations.js`, `useAnalysis.js`, `SummaryScreen.jsx`, `contentService.js`, `reviewEngine.js`, `reviewService.js`, `storage.js`) mais `src/data/adapters/` e `PLANO-FASE-1-DADOS.md` sem rastreio, e `plano-ia-gemini.md` deletado. Revisar o diff antes; separar em mais de um commit se cobrirem assuntos distintos.

**T0.2 — `scripts/test-data-layer.mjs`.** Os 20 cenários especificados em `PLANO-FASE-1-DADOS.md:163`, com shim de `localStorage` em memória, rodando com `node` puro (sem test runner novo). Adicionar `"test:data": "node scripts/test-data-layer.mjs"` em `package.json`.
> Verificação: todos os cenários passam; a varredura de referências órfãs volta vazia.

**T0.3 — Corrigir B1, B2 e B3.** Ver tabela acima. B1 e B3 ganham cenário no script de T0.2 (escrita antes de qualquer leitura com `sv_items` presente; `addImageToContent` sob quota simulada).
> Verificação: `npm run test:data` verde, incluindo os dois cenários novos.

**T0.4 — `MOCKS.md` na raiz.** O que ainda é sintético (`plusMetrics.js`, `notionService.js`, `exportService.js`, `calendarService.js`, seeds `isSample`), quem consome e qual tarefa desta fase o substitui. Atualizado ao fim de cada tarefa que elimina um mock.

Commits: `chore(data): fecha pendencias da fase 1`, `test(data): cobre os 20 cenarios da camada de dados`, `fix(data): garante migracao em escritas e propaga erro de quota em imagens`, `docs: documenta mocks restantes em MOCKS.md`

---

### T1 — Fonte única de estado

Substituir as três instâncias soltas de `useStudyItems` por um **provider único**: `src/context/ContentStoreContext.jsx` (ou `src/store/contentStore.js` com subscribe, se preferir evitar Context) expondo `{ contents, subjects, reviews, events, reload, mutate }`, carregado uma vez no `App` e consumido pelas telas.

- `useStudyItems.js` vira um consumidor fino do store (ou é removido em T2).
- Toda mutação passa por `mutate(fn)`, que executa o serviço e recarrega o estado — nunca mais `setState` local que dessincroniza do disco (B4, B10).
- `App.jsx:87` para de guardar o objeto inteiro em `selectedItem`: guarda **`selectedContentId`** e deriva o conteúdo do store. Isso elimina a classe inteira de bug de snapshot velho.

> **Verificação:** salvar uma captura nova e confirmar que a Library atualiza sem remontar; concluir uma revisão e ver o badge de pendências no App mudar na hora.

Commit: `refactor(state): centraliza estado de conteudos em store unico`

---

### T2 — Telas sobre o `Content` canônico

O adaptador sai por partes. Cada subtarefa é verificável isolada e mantém o app funcionando.

**T2a — Library + ContentDetail.** Consomem `Content` direto (`title`, `subjectName`, `images[]`, `summary`, `keyConcepts`, `keywords`, `notes`, `mastery`). `relativeLabel(createdAt)` de `src/utils/date.js` substitui o campo `time`. `getSubjectMeta` de `src/constants.js:61` continua resolvendo cor/emoji a partir de `subjectName`. Corrigir B6 (guard de `selectedContentId` nulo em Quiz e Questions) e B7 (busca com guarda). `ContentDetailScreen` para de importar `saveItem` e passa a usar `contentService` / `eventService`.

**T2b — Flashcards + Quiz + Questions.** Recebem `content` e leem `content.flashcards`, `content.quizzes[0]` (com o **`quizId` preservado** — resolve B11) e `content.openQuestions[]` (objetos com `id`, não strings). `QuizQuestion.jsx:6-8` passa a comparar sempre `correctAnswer` semanticamente (boolean para `vf`, índice para `mc`), como já faz o model — sem inferência por posição visual.

**T2c — Review + calendário.** `ReviewScreen` troca `reviewEngine` por `reviewService` (`getDueReviews`, `nextPendingReview(contentId)`, `markReviewDone(reviewId)`, `formatDue`). Fim das entradas sintéticas de calendário montadas no render.

**T2d — Remoção do legado.** Apagar `src/data/adapters/toLegacyItem.js`, `applyLegacyCalendarEvent.js`, `src/services/storage.js` e `src/services/reviewEngine.js`. `legacyEventType.js` **fica** — `migrations.js:13` ainda precisa do mapa PT→canônico. `useAnalysis.js:41` para de projetar para o item legado e devolve só o `Content`.

> **Verificação por subtarefa:** percorrer as telas afetadas com dados migrados e confirmar paridade visual exata com o estado atual. Ao fim de T2d: `npm run build` limpo, `grep -r "toLegacyItem\|reviewEngine\|services/storage"` em `src/` sem resultado, e um `sv_items` legado pré-populado ainda aparece íntegro na Library.

Commits: `refactor(ui): biblioteca e detalhe leem Content canonico`, `refactor(ui): flashcards, quiz e questoes leem Content canonico`, `refactor(ui): revisoes passam a usar reviewService`, `chore(ui): remove adaptador legado, storage shim e reviewEngine`

---

### T3 — Registro de tentativas

- `FlashcardsScreen.jsx:30` (`grade(remembered)`) chama `recordFlashcardAttempt({ flashcardId: cards[index].id, contentId: content.id, correct: remembered, responseTimeMs })`, cronometrando o tempo desde a virada do card.
- `QuizScreen.jsx:37` (`choose`) acumula `answers[]` como `{ questionId, selectedAnswer, correct }` e, ao terminar, chama `recordQuizAttempt({ quizId, contentId, answers })` **uma vez**.
- **B8:** cards e questões extras do Plus passam a receber `id` via `newId("fc")` / `newId("qs")` — ou, melhor, são gerados como flashcards reais e persistidos com `source: "user"`. Decidir na execução; o mínimo é ter `id`.
- `selectedAnswer` guardado como valor semântico, nunca como índice visual da opção embaralhada.

> **Verificação:** responder um deck de flashcards com 2 acertos e 1 erro, recarregar a página e inspecionar `sv_db.flashcardAttempts` — três registros, nenhum sobrescrito. Repetir o mesmo deck e confirmar que viram seis (append-only). Idem para `quizAttempts`.

Commit: `feat(estudo): registra tentativas de flashcard e quiz`

---

### T4 — Domínio (mastery) visível

- `updateMastery(contentId)` (`studyService.js:61`) chamado ao fim de cada sessão de flashcards e de cada quiz.
- Resolver **B9**: ou `masteryLevelFromScore` passa a produzir `learning`, ou o nível sai do model e de `masteryBreakdown`. Recomendação: **remover** — quatro faixas já cobrem o espectro e o nível morto só polui o breakdown.
- Exibir o nível em `ContentCard` e em `ContentDetailScreen` (substituindo o `completedReviews(item)` hardcoded `/5` de `ContentDetailScreen.jsx:55`, que continua válido mas passa a usar `REVIEW_OFFSETS.length` em vez do literal).

> **Verificação:** conteúdo sem tentativa mostra `not_started`; após um quiz 100% mostra `mastered`; após um quiz 40% cai para `needs_review`. `npm run test:data` cobre as três transições.

Commit: `feat(estudo): calcula e exibe nivel de dominio por conteudo`

---

### T5 — Vision+ com números reais

Os seis componentes de `src/components/plus/` param de importar `plusMetrics.js` e passam a **receber props** de `VisionPlusScreen`, que consulta `getPerformanceSummary()` e `getPerformanceForSubject(subjectId)`.

| Componente | Passa a mostrar |
|---|---|
| `MetricCards` | `contentsCreated`, `quizAccuracyRate`, `flashcardAccuracyRate`. **Sai** `studyMinutes` e os deltas (não há série histórica para comparar). |
| `SubjectProgress` | `subjects[]` derivado de `getSubjectsWithPerformance()` — nome + `accuracyRate` real, sem `delta`. |
| `PerformanceChart` | Substituído por uma **distribuição de domínio** (`masteryBreakdown`), que é medível, em vez da série semanal que não é. |
| `StrengthsCard` / `AttentionCard` | Derivados do `accuracyRate` por matéria: acima de 80% em pontos fortes, abaixo de 60% em atenção. Estado vazio quando não houver matéria com tentativa suficiente. |
| `InsightCard` | Estado vazio ("continue estudando para desbloquear análises") até haver dados. Sem texto fabricado. |

Cada card precisa de um **estado vazio explícito e desenhado** — o app novo do usuário começa sem nenhuma tentativa, e esse é o primeiro estado que o avaliador do pitch vai ver. Ele não pode parecer quebrado.

`src/data/plusMetrics.js` é **removido** ao fim da tarefa.

> **Verificação:** com `sv_db` zerado, Vision+ renderiza inteiro em estado vazio sem erro no console. Após responder um quiz e um deck, os números batem com o conteúdo de `sv_db` conferido à mão.

Commits: `feat(plus): liga dashboard Vision+ ao performanceService`, `chore(plus): remove metricas mockadas`

---

### T6 — Calendário real, revisão separada de compromisso

- `src/services/calendarService.js` deixa de ser `setTimeout` e passa a delegar a `eventService.createEventEntry` / `reviewService.scheduleManualReview`, **persistindo**. Atenção à colisão de nome com `createEvent` de `src/data/models/event.js` — renomear o export do service para evitar ambiguidade.
- `PlanningSection.jsx:7` passa a agendar de verdade; o retorno traz o `id` do evento criado.
- `CalendarMonth` / `DayEventsModal` passam a receber duas coleções distintas — `reviews` e `events` — em vez do `commitmentsByDate` sintético montado no render, e as distinguem visualmente. Um conteúdo pode ter **N eventos** (o modelo já suporta; o legado só permitia um).
- `toDayKey` local em **todos** os pontos de agrupamento (fecha B2 de vez).

> **Verificação:** criar dois eventos para o mesmo conteúdo, recarregar a página e ver os dois no calendário; confirmar que a revisão D+1 aparece com marcação distinta do evento acadêmico; criar um evento às 23h e conferir que ele cai no dia correto.

Commit: `feat(calendario): persiste eventos academicos e separa revisoes`

---

### T7 — Exportação PDF real

`src/services/exportService.js` — `exportDocument(content)` gera um PDF de verdade contendo, nesta ordem: título e matéria, data de criação, **resumo**, **conceitos-chave e palavras-chave**, e a **lista de perguntas abertas** (`content.openQuestions[]`) formatada como roteiro de estudo numerado. **Sem flashcards e sem quiz**, por decisão do usuário.

**Recomendação técnica:** adicionar `jspdf` (~350 kB, sem dependência nativa, gera o arquivo no cliente e dispara o download direto). A alternativa sem dependência — renderizar um DOM oculto com `@media print` e chamar `window.print()` — evita o peso mas depende do diálogo de impressão do sistema e não produz um arquivo nomeado, o que é ruim no fluxo mobile do pitch.

`copyContent` continua real (já usa `navigator.clipboard`), mas passa a **propagar o erro** em vez de engolir com `.catch(() => {})`, e a montar o texto a partir do `Content` canônico.

`notionService.js` **permanece mock**, registrado no `MOCKS.md`.

> **Verificação:** exportar um conteúdo com perguntas e um sem; abrir os dois PDFs gerados e conferir que o conteúdo bate e que nenhum flashcard ou questão de quiz vazou.

Commits: `feat(export): gera PDF real do conteudo com resumo e questoes`, `fix(export): propaga falha de copia para a area de transferencia`

---

### T8 — Limpeza final

- `MOCKS.md` atualizado: sobra apenas Notion e os seeds `isSample`.
- Remover código morto que a Fase 1 identificou e não removeu: `CAPTURE_POOL` / `nextCaptureTemplate` / `peekCaptureTemplate` (`src/data/sampleContent.js:170-179`) e `SUBJECT_FILTERS` (`src/constants.js:12`).
- `src/data/sampleContent.js` reduzido ao que ainda alimenta os seeds no modelo novo.
- Varredura: nenhum import quebrado, nenhum arquivo órfão.

> **Verificação:** `npm run build` limpo, `npm run test:data` verde, e uma varredura de imports não resolvidos sem resultado.

Commit: `chore: remove codigo morto e atualiza documentacao de mocks`

---

## Arquivos principais

**Novos:** `scripts/test-data-layer.mjs`, `MOCKS.md`, `src/context/ContentStoreContext.jsx`.

**Modificados:** `src/App.jsx`, todas as dez telas de `src/screens/`, `src/components/plus/*` (seis arquivos), `src/components/study/{CalendarMonth,DayEventsModal,PlanningSection,ContentCard,ContentBlocks}.jsx`, `src/services/{calendarService,exportService,contentService,studyService,performanceService}.js`, `src/data/storage/index.js`, `src/constants.js`, `src/data/sampleContent.js`, `package.json`.

**Removidos:** `src/data/adapters/toLegacyItem.js`, `src/data/adapters/applyLegacyCalendarEvent.js`, `src/services/storage.js`, `src/services/reviewEngine.js`, `src/data/plusMetrics.js`, `src/hooks/useStudyItems.js`.

**Reusar sem reescrever:** `getSubjectMeta` / `getSubjectEmoji` (`src/constants.js:57-65`), `toDayKey` / `relativeLabel` / `addDaysIso` (`src/utils/date.js`), `newId` (`src/utils/id.js`), `REVIEW_OFFSETS` / `formatDue` / `shuffle` (`src/services/reviewService.js:10,90,93`), tratamento de quota de `src/data/storage/db.js:53`, `captureFrame` / `makeThumbnail` (`src/utils/image.js`).

**Intocados:** `api/analyze.js`, `lib/gemini.js`, `lib/prompts.js`, `src/services/notionService.js`, `src/screens/CameraScreen.jsx`, `src/data/models/*`, `src/data/storage/migrations.js` (salvo o mapa `legacyEventType`, que fica).

## Verificação de ponta a ponta

1. `npm run test:data` — os 20 cenários da Fase 1 mais os novos de quota, migração-antes-de-escrita e transições de mastery.
2. `npm run build` sem erros nem avisos de import.
3. `npm run dev` com `sv_items` legado pré-populado: recarregar, confirmar que os conteúdos antigos aparecem íntegros e que `sv_items_backup_v1` existe.
4. Fluxo completo real: câmera → Gemini → salvar → responder flashcards (2 certos, 1 errado) → responder o quiz → recarregar a página → conferir em `sv_db` que as tentativas persistiram, que `mastery` foi recalculado e que Vision+ mostra exatamente esses números.
5. Estado zerado: limpar `localStorage`, abrir Vision+ e confirmar que todos os cards renderizam em estado vazio, sem erro de console e sem número inventado.
6. Calendário: dois eventos no mesmo conteúdo + uma revisão pendente, todos no dia correto, visualmente distintos.
7. Exportar um PDF e conferir o conteúdo.

## Convenções de commit e de arquivos

- **Um commit por tarefa/subtarefa**, Conventional Commits com descrição em português. O tipo (`feat`, `fix`, `refactor`, `chore`, `docs`, `test`) permanece em inglês.
- **Autoria exclusiva do usuário.** Nenhuma linha `Co-Authored-By`, nenhuma menção a Claude ou IA na mensagem ou no corpo do commit.
- Todos os arquivos dentro da raiz do projeto. Branch `main`, commitando só com a verificação da tarefa passando.

## Fora de escopo (Fase 3)

Rastreio de tempo de sessão (`StudySession`) para desbloquear `studyMinutes` e a série semanal do Vision+; deltas e comparação entre períodos; UI de gestão de matérias (renomear/mesclar/excluir com reatribuição — o `subjectService` já suporta, falta tela); UI de múltiplas imagens por conteúdo (o modelo já suporta, `reorderImages` já existe); UI de anotações; integração real com o Notion; sincronização entre dispositivos.
