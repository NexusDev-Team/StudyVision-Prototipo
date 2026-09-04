# Mocks e dados sintéticos restantes

Inventário do que ainda **não** é medido/persistido de verdade no Study Vision.
Após a Fase 5, sobra apenas a exportação para o Notion — Biblioteca, Calendário
e Evolução não usam nenhum dado sintético.

| Mock | Arquivo | Quem consome | O que é | Substituto futuro |
|---|---|---|---|---|
| Exportar para o Notion | `src/services/notionService.js` | `src/components/study/ExportSection.jsx` | `setTimeout(900)` que resolve `https://notion.so/mock-<id>` | Integração real (OAuth + `pages.create`) — precisa de backend; **fica como demo por decisão do usuário** |

## Placeholders de UI — não são mocks de dado, não geram métrica

O botão "Gerar mais" do Vision+ (`QuizScreen.jsx` / `FlashcardsScreen.jsx`) cria uma
questão ou flashcard **só em memória** (`ephemeral: true`), nunca gravado em
`content.quizzes` / `content.flashcards`. Responder a esses itens conta no placar
exibido na tela da sessão, mas a Fase 3 **não registra tentativa** para eles —
gravar apontaria para um `questionId`/`flashcardId` inexistente no banco. Nenhum
número de desempenho, domínio ou revisão é calculado a partir desses itens.

## Métrica que continua sem existir por decisão de produto

**"Horas estudadas" não existe no Study Vision.** Nunca foi implementada com
medição real, e a Fase 3 reforça a regra: nenhum número aparece na UI sem vir de
uma ação real do usuário. Para medir tempo de estudo de verdade seria necessário
registrar eventos de início/fim de sessão — fora do escopo desta fase.

## O que passou a ser real na Fase 2

| Antes (mock) | Agora |
|---|---|
| `src/data/plusMetrics.js` — dashboard Vision+ 100% fixo | **Removido.** Vision+ lê `performanceService` (domínio médio, taxa de acerto, distribuição de domínio, pontos fortes/atenção por matéria). Cada card tem estado vazio desenhado. |
| `src/services/calendarService.js` — `setTimeout` que não persistia nada | `scheduleCommitment` grava `AcademicEvent` / `Review` avulsa em `sv_db` via `eventService` / `reviewService`. |
| `src/services/exportService.js` → `exportDocument` — `setTimeout` sem arquivo | Gera um **PDF real** (jsPDF, carregado sob demanda): resumo, itens relacionados e lista de perguntas. Sem quiz nem flashcards. |
| `exportService.copyContent` — engolia erro com `.catch(() => {})` | Propaga a falha; `ExportSection` avisa o usuário. |
| `src/data/sampleContent.js` — 5 seeds com histórico forjado | **Removido.** O app começa vazio; conteúdo vem da câmera → Gemini. |
| `FlashcardsScreen` / `QuizScreen` — acertos só em `useState` | `recordFlashcardAttempt` / `recordQuizAttempt` (append-only) + `updateMastery`. |

## O que passou a ser real na Fase 3

| Antes (mock/incompleto) | Agora |
|---|---|
| Ciclo de revisão fixo D+1/3/7/15/30, criado inteiro na hora de salvar o conteúdo | `scheduleInitialReview` cria só D+1; `scheduleReviewFromPerformance` mantém **no máximo uma** revisão pendente por conteúdo, reagendada pelo desempenho real (1/3/7/14 dias) |
| `masteryLevelFromScore` só olhava a porcentagem | Exige `MIN_INTERACTIONS_FOR_MASTERY = 3` antes de conceder `mastered` |
| Sem desempenho por conteúdo | `getQuizPerformance` / `getFlashcardPerformance` / `getContentPerformance` (com histórico completo, `overall` nunca `0` por falta de dado) |
| Sem desempenho por matéria com base em conteúdos reais | `getSubjectPerformance`, `getContentMetrics`, `getReviewMetrics` |
| `content.difficulty` era o único sinal de dificuldade (vem da IA sobre o material) | `content.recommendedDifficulty`, derivado do desempenho real via `studyService.updateRecommendedDifficulty` |
| Cada tela calculava e persistia por conta própria | `studyService.registerActivity(contentId)` centraliza domínio + dificuldade + revisão |
| Resultado do quiz/flashcards mostrava só "X de Y" | Mostra o `score` real (0-100), comparação com a tentativa anterior e o desempenho acumulado do conteúdo |
| Tentativas podiam sobrar apontando para conteúdo excluído/corrompido | `integrityService.sweepOrphans()` roda ao iniciar o app |

## O que passou a ser real na Fase 4

| Antes (mock/incompleto) | Agora |
|---|---|
| Biblioteca filtrava por `subjectName` (texto) e escondia conteúdo sem matéria | Filtra por `subjectId`, com bucket explícito "Sem matéria" |
| Nenhuma UI para criar/renomear/excluir matéria | `SubjectManagerModal` — CRUD completo, com destino obrigatório ao excluir matéria com conteúdo |
| Busca só olhava título e matéria | `matchesQuery` cobre título, matéria, tópico, conceitos-chave, palavras-chave e texto extraído |
| Matéria criada por comparação de nome exato (duplicava "Química"/"quimica") | `subjectService.ensureSubject` normaliza e reaproveita por nome, case/acento-insensitive |
| Calendário: seção somente-leitura dentro da Revisão, misturando eventos e revisões no mesmo grid, e evento sem conteúdo nunca aparecia | Grid só de eventos acadêmicos (5 tipos, com legenda textual); revisões seguem separadas em "Para hoje"/"Próximas"; evento sem conteúdo aparece normalmente |
| Sem CRUD de evento na UI (`updateEvent`/`deleteEvent`/`unlinkContentFromEvent` existiam no service, nunca chamados) | `EventFormModal` (criar/editar) + `DayEventsModal` (editar/excluir por dia) + `CommitmentsSection` no Content (listar/criar/editar/desvincular todos, não só o último) |
| `ContentDetailScreen` mostrava só o evento mais recente | Lista todos os compromissos do conteúdo |
| Sem exclusão de Content na UI | Botão "Excluir conteúdo" com `ConfirmDialog`, cascata revisada (reviews, tentativas, refs em eventos) |
| `sweepOrphans` não limpava `contentIds` órfãos em eventos nem `subjectId` de matéria inexistente | Limpa as duas referências sem apagar o evento/conteúdo em si |
| Modais sem `role="dialog"`, sem fechar no Esc/backdrop, sem devolver foco | `ui/Modal` cobre os quatro |

## O que passou a ser real na Fase 5

| Antes (mock/incompleto) | Agora |
|---|---|
| Dashboard vivia só dentro do Vision+, com paywall em cima de métricas reais | `evolutionService` (13 funções) alimenta a tela de Evolução, gratuita e sem nenhuma métrica bloqueada |
| Nenhuma taxa de acerto combinando quiz + flashcards | `getEvolutionSummary().overallAccuracy` — `null` (nunca `0%`) sem resposta |
| `getSubjectPerformance` fazia média dos `overall` por conteúdo, distorcendo com conteúdo sem atividade | `calculateSubjectPerformance` soma acertos/respostas só dos conteúdos com atividade |
| `getReviewMetrics()` calculado e nunca mostrado em tela nenhuma | `getReviewProgress()` na seção Reviews da Evolução |
| `SparkChart` construído e nunca importado; nenhuma série temporal existia | `getProgressHistory()` agrupa `quizAttempts`/`flashcardAttempts` por semana (segunda-feira local); só semanas com atividade viram ponto |
| Assinatura só tinha `{status: "free"\|"plus"}`; teste de 7 dias nunca expirava sozinho | `subscriptionService` deriva `expired` a partir de `trialEndsAt` toda leitura; `useSubscription` reavalia em `visibilitychange` |
| Vision+ era dashboard com paywall (`MetricCards`/`SubjectProgress`/`PerformanceChart`/`AttentionCard`/`InsightCard` borrados) | Vision+ virou tela de oferta (hero, benefícios, comparação Free×Plus, CTA); `MetricCards.jsx`/`InsightCard.jsx` removidos, superados pelas seções da Evolução |
| Recomendações não existiam | `getRecommendations()` — regras fixas, determinísticas, zero IA |

Nenhum dado sintético foi introduzido na Fase 5 — toda métrica de evolução deriva de `performanceService`/`reviewService`/`studyService`/`contentService`/`subjectService`, que por sua vez só leem tentativas reais. **A exportação para o Notion continua sendo o único mock do projeto.**

## Camadas reais desde a Fase 1

- Captura de câmera (`getUserMedia`) → `api/analyze.js` → Gemini → `normalizeAnalysisResult`.
- Persistência versionada `sv_db` (`src/data/storage/`), migração `v1 → v2`, poda por cota.
- `contentService` / `subjectService` / `studyService` / `reviewService` / `eventService` / `performanceService` / `integrityService` / `evolutionService` / `subscriptionService` — cobertos por `npm run test:data` (93 cenários).
