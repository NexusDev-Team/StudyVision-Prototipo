# Mocks e dados sintéticos restantes

Inventário do que ainda **não** é medido/persistido de verdade no Study Vision,
quem consome e qual tarefa da Fase 2 (`PLANO-FASE-2-INTEGRACAO.md`) o substitui.
Atualizado ao fim de cada tarefa que elimina um item.

| Mock | Arquivo | Quem consome | O que é hoje | Substituto | Status |
|---|---|---|---|---|---|
| Métricas do Vision+ | `src/data/plusMetrics.js` | `src/components/plus/*` (6 componentes importam `PLUS_METRICS` direto) | Objeto estático: 78% domínio, 1122 min estudados, série de 4 semanas, deltas, pontos fortes/atenção, insight textual | `performanceService.getPerformanceSummary()` / `getPerformanceForSubject()` — só o que é medível; `studyMinutes`, `weeks`, `strengths`, `attention`, `insight` viram estado vazio | **T5** — pendente |
| Agendamento no calendário | `src/services/calendarService.js` | `src/components/study/PlanningSection.jsx` | `createEvent` / `scheduleReviews` são `setTimeout` que resolvem um objeto e **não persistem nada** | `eventService.createEventEntry` + `reviewService.scheduleManualReview` | **T6** — pendente |
| Exportação de documento | `src/services/exportService.js` → `exportDocument()` | `src/components/study/ExportSection.jsx` | `setTimeout(900)` que resolve `{ fileName }` sem gerar arquivo | Geração real de PDF (resumo + conceitos + perguntas abertas; sem quiz/flashcards) | **T7** — pendente |
| Cópia p/ área de transferência | `src/services/exportService.js` → `copyContent()` | `src/components/study/ExportSection.jsx` | Parcialmente real (`navigator.clipboard.writeText`), mas engole erro com `.catch(() => {})` e resolve mesmo em falha | Mesmo fluxo, propagando erro; texto montado do `Content` canônico | **T7** — pendente |
| Exportar para o Notion | `src/services/notionService.js` | `src/components/study/ExportSection.jsx` | `setTimeout(900)` resolvendo `https://notion.so/mock-<id>` | **Nenhum** — permanece demo por decisão do usuário (precisa de OAuth + backend) | **demo permanente** |
| Seeds de conteúdo | `src/data/sampleContent.js` → `SAMPLE_ITEMS` | `src/screens/QuizScreen.jsx` (só como pool de questões extras de preenchimento) | 5 conteúdos fixos de demonstração; `reviewSchedule` com `done` forjado; `CAPTURE_POOL` / `nextCaptureTemplate` código morto | Conteúdo real capturado pela câmera → Gemini. Seeds ficam apenas como material de pitch, sem histórico falso | **T8** — pendente (remover código morto, reduzir arquivo) |

## Camadas que JÁ são reais

- Captura de câmera (`getUserMedia`) → `api/analyze.js` → Gemini → `normalizeAnalysisResult`.
- Persistência versionada `sv_db` (`src/data/storage/`), com migração `v1 → v2` e poda por cota.
- `contentService` / `subjectService` / `studyService` / `reviewService` / `eventService` / `performanceService` — CRUD e derivações medidas, cobertos por `npm run test:data`.
