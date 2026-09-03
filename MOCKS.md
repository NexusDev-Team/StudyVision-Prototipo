# Mocks e dados sintéticos restantes

Inventário do que ainda **não** é medido/persistido de verdade no Study Vision.
Após a Fase 2, sobra apenas a exportação para o Notion.

| Mock | Arquivo | Quem consome | O que é | Substituto futuro |
|---|---|---|---|---|
| Exportar para o Notion | `src/services/notionService.js` | `src/components/study/ExportSection.jsx` | `setTimeout(900)` que resolve `https://notion.so/mock-<id>` | Integração real (OAuth + `pages.create`) — precisa de backend; **fica como demo por decisão do usuário** |

## O que passou a ser real na Fase 2

| Antes (mock) | Agora |
|---|---|
| `src/data/plusMetrics.js` — dashboard Vision+ 100% fixo | **Removido.** Vision+ lê `performanceService` (domínio médio, taxa de acerto, distribuição de domínio, pontos fortes/atenção por matéria). Cada card tem estado vazio desenhado. |
| `src/services/calendarService.js` — `setTimeout` que não persistia nada | `scheduleCommitment` grava `AcademicEvent` / `Review` avulsa em `sv_db` via `eventService` / `reviewService`. |
| `src/services/exportService.js` → `exportDocument` — `setTimeout` sem arquivo | Gera um **PDF real** (jsPDF, carregado sob demanda): resumo, itens relacionados e lista de perguntas. Sem quiz nem flashcards. |
| `exportService.copyContent` — engolia erro com `.catch(() => {})` | Propaga a falha; `ExportSection` avisa o usuário. |
| `src/data/sampleContent.js` — 5 seeds com histórico forjado | **Removido.** O app começa vazio; conteúdo vem da câmera → Gemini. |
| `FlashcardsScreen` / `QuizScreen` — acertos só em `useState` | `recordFlashcardAttempt` / `recordQuizAttempt` (append-only) + `updateMastery`. |

## Camadas reais desde a Fase 1

- Captura de câmera (`getUserMedia`) → `api/analyze.js` → Gemini → `normalizeAnalysisResult`.
- Persistência versionada `sv_db` (`src/data/storage/`), migração `v1 → v2`, poda por cota.
- `contentService` / `subjectService` / `studyService` / `reviewService` / `eventService` / `performanceService` — cobertos por `npm run test:data` (26 cenários).
