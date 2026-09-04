# Mocks e dados sintéticos restantes

Inventário do que ainda **não** é medido/persistido de verdade no Study Vision.
Após a Fase 3, sobra apenas a exportação para o Notion.

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

## Camadas reais desde a Fase 1

- Captura de câmera (`getUserMedia`) → `api/analyze.js` → Gemini → `normalizeAnalysisResult`.
- Persistência versionada `sv_db` (`src/data/storage/`), migração `v1 → v2`, poda por cota.
- `contentService` / `subjectService` / `studyService` / `reviewService` / `eventService` / `performanceService` / `integrityService` — cobertos por `npm run test:data` (42 cenários).
