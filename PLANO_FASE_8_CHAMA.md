# Plano — Fase 8: Chama do Conhecimento

## Contexto

O Study Vision já registra toda atividade real de estudo no `sv_db` (localStorage), mas não existe nenhum indicador de constância. O objetivo é adicionar a **Chama do Conhecimento**: meta semanal de **3 atividades concluídas** (revisão, quiz ou sessão de flashcards), ciclo **segunda→domingo**, com contagem de **semanas consecutivas** cumpridas. Não é streak diário e a comunicação não pode ser punitiva.

Princípio central: **nenhuma fonte de dados nova**. Todo o estado da Chama é **derivado** de `quizAttempts`, `flashcardAttempts` e `reviews` que já existem. Nada é persistido, logo nada pode ficar inconsistente e o reload reconstrói o estado exato.

## Arquitetura existente relevante (não recriar)

- Persistência única: `src/data/storage/index.js` → `readDb()` / `withDb()`; chave `sv_db`, coleções `quizAttempts`, `flashcardAttempts`, `reviews`.
- `src/utils/date.js:64` já tem **`startOfWeekKey(value)`** — dayKey da segunda-feira (semana Seg→Dom, ancorada 12:00 local). Reusar; não escrever outra lógica de semana. Também `toDayKey`, `fromDayKey`, `todayKey`, `addDaysIso`, `toMs`.
- Registros de conclusão:
  - Quiz: `recordQuizAttempt` (`src/services/studyService.js:17`) grava 1 linha em `quizAttempts` com `answeredAt`, disparado uma única vez em `src/screens/QuizScreen.jsx:63-75` (guard `recordedRef`). **1 attempt = 1 quiz concluído.**
  - Flashcards: `recordFlashcardAttempt` (`studyService.js:11`) grava 1 linha **por carta**; não existe entidade "sessão".
  - Revisão: `markReviewDone(reviewId)` (`src/services/reviewService.js:335`) grava `status:"completed"` + `completedAt`.
- UI: React 18 + Vite, `.jsx` puro, estilo **inline** nas telas + CSS Modules nos primitivos de `src/components/ui/`. Mutação sempre por `mutate()` de `src/context/ContentStoreContext.jsx`.
- Testes: sem framework. Runner caseiro `scripts/test-data-layer.mjs` (`npm run test:data`), com `MemoryStorage` shim e `test(name, fn)`.

## Decisões de modelagem

| Atividade | Chave de deduplicação | Timestamp |
|---|---|---|
| Quiz concluído | `quizAttempt.id` | `answeredAt` |
| Sessão de flashcards | par `(contentId, dayKey)` — **1 por conteúdo por dia** | primeiro `answeredAt` do dia |
| Revisão concluída | `review.id` com `status === "completed"` | `completedAt` |

Consequência aceita (documentar como limitação): duas sessões de flashcards do mesmo conteúdo no mesmo dia contam como 1 atividade. Conteúdos diferentes no mesmo dia contam separadamente.

`streakWeeks` é **derivado**: a partir da semana atual, caminha para trás semana a semana; a semana atual só entra na contagem se já estiver completa (3/3). Para a primeira semana não completa encontrada no passado, a caminhada para. Nada é gravado.

## Tarefas

Cada tarefa termina com verificação obrigatória; **não avançar** sem ela passar. Commits em Conventional Commits, em português, escopo `chama`, **somente no usuário Isac (sem linha `Co-Authored-By`)**.

### T1 — Helpers de semana em `src/utils/date.js`
Adicionar, ao lado de `startOfWeekKey`:
- `weekRangeFromKey(weekStartKey)` → `{ weekStart, weekEnd }` em ISO (segunda 00:00 local → domingo 23:59:59.999 local), usando `fromDayKey` + `addDaysIso`.
- `currentWeekStartKey()` → `startOfWeekKey(nowIso())`.
- `weeksBetweenKeys(aKey, bKey)` ou `previousWeekKey(weekKey)` (subtrair 7 dias via `addDaysIso` sobre `fromDayKey`).

Não alterar funções existentes.

**Verificar:** `npm run test:data` continua verde; conferir manualmente via `node -e` que `startOfWeekKey` de uma segunda, de um domingo e de uma virada de ano retornam a mesma segunda esperada.
**Commit:** `feat(chama): adiciona utilitarios de intervalo semanal em date.js`

### T2 — `src/services/knowledgeFlameService.js` (núcleo derivado)
Serviço somente-leitura (mesmo estilo de `evolutionService.js`: lê `readDb()`, não escreve nada). Constante `WEEKLY_TARGET = 3`.

Funções exportadas:
- `getActivities({ from, to })` → lista normalizada `[{ key, type: "quiz"|"flashcards"|"review", contentId, at }]` ordenada por `at`, construída de:
  - `db.quizAttempts` → `key = "quiz:" + attempt.id`, `at = answeredAt`;
  - `db.flashcardAttempts` → agrupar por `contentId + toDayKey(answeredAt)`, `key = "flashcards:" + contentId + ":" + dayKey`, `at` = menor `answeredAt` do grupo;
  - `db.reviews` filtrados por `status === "completed" && completedAt` → `key = "review:" + review.id`, `at = completedAt`.
  Deduplicar por `key` (Set) antes de retornar. Ignorar registros com timestamp inválido (`toMs` → `NaN`).
- `getWeekActivities(weekStartKey)` → atividades cujo `startOfWeekKey(at) === weekStartKey`.
- `getWeekProgress(weekStartKey)` → `{ weekStart, weekEnd, target: 3, completed, activities, status: "active"|"completed" }` (`completed` limitado por `Math.min(count, ...)`? **não** — expor `count` real e `status: count >= 3`).
- `isWeekCompleted(weekStartKey)`.
- `getCurrentStreak()` → nº de semanas consecutivas completas terminando na semana atual (ou na anterior, se a atual ainda não completou). Implementar sobre um `Map<weekKey, count>` construído numa única passada por todas as atividades — sem loop ilimitado de datas.
- `getKnowledgeFlameState()` → objeto único consumido pela UI:
  ```js
  { weekStart, weekEnd, target: 3, completed, remaining, activities,
    weekCompleted, streakWeeks, isFirstTime, message, srLabel }
  ```
  - `isFirstTime` = `streakWeeks === 0 && completed === 0 && nenhuma atividade em todo o histórico`.
  - `message` (sem linguagem punitiva): 0/3 primeiro uso → "Complete 3 atividades de estudo nesta semana para começar sua sequência."; 0/3 com histórico → "Uma nova semana começou. Complete 3 atividades para acender sua chama."; 1/3 → "Continue seu ritmo."; 2/3 → "Falta pouco para manter sua chama."; ≥3/3 → "Meta semanal concluída! Sua chama continua acesa.".
  - `srLabel` = "2 de 3 atividades concluídas nesta semana." (texto para leitor de tela / não depender de cor ou ícone).
  - Envolver em `try/catch` retornando um estado neutro (0/3, streak 0) se o DB estiver corrompido.

Não importar de `quizService`/`flashcardService` (não existem) nem alterar `studyService`/`reviewService`.

**Verificar:** `npm run test:data` (ainda sem casos novos) verde + `node -e` manual imprimindo `getKnowledgeFlameState()` num DB vazio → `0/3`, `streakWeeks 0`, `isFirstTime true`.
**Commit:** `feat(chama): cria knowledgeFlameService derivando atividades semanais`

### T3 — Testes do serviço em `scripts/test-data-layer.mjs`
Adicionar bloco de casos (prefixo `F8-`) usando o runner e `resetDb()` já existentes, cobrindo os cenários do briefing:
1. usuário novo → `0 semanas`, `0/3`, `isFirstTime true`;
2. revisão concluída → `1/3`;
3. + quiz → `2/3`; 4. + flashcards → `3/3` e `weekCompleted true`;
5. reconstrução após novo `readDb()` (equivalente a reload) → mesmo estado;
6. múltiplas respostas dentro de um mesmo quiz (1 attempt, N answers) → conta 1;
7. duas conclusões válidas do mesmo tipo (2 quizzes, ou flashcards de 2 conteúdos) → conta 2;
8. atividades apenas na semana anterior → semana atual `0/3`;
9. 3 semanas consecutivas completas → `streakWeeks 3`;
10. semana intermediária incompleta → sequência recomeça em 1;
11. flashcards do mesmo conteúdo no mesmo dia, 2 blocos → conta 1 (regra escolhida);
12. review com `status: "skipped"` ou `"pending"` → não conta;
13. timestamps inválidos → ignorados, sem exceção.

Datas dos fixtures montadas a partir de `startOfWeekKey`/`addDaysIso` para não quebrarem conforme o dia em que os testes rodam.

**Verificar:** `npm run test:data` → todos os casos antigos + novos passando. Se algum falhar, corrigir o serviço (T2) antes de seguir.
**Commit:** `test(chama): cobre progresso semanal, deduplicacao e sequencia de semanas`

### T4 — `KnowledgeFlameCard` (Evolution)
Novo `src/components/study/KnowledgeFlameCard.jsx`, seguindo o padrão dos cards existentes (`Card` de `src/components/ui/Card.jsx`, `ProgressBar`, `Badge`, estilo inline, `Inter,sans-serif`, paleta `#2563EB` / `#111827` / `#64748B` / `#F1F5F9`). Ícone: `Flame` de `lucide-react` (não usar emoji cru), com `aria-hidden="true"`.

Props: `{ state }` (o objeto de `getKnowledgeFlameState()`) — o componente **não calcula regra de negócio**.

Conteúdo: ícone → `{streakWeeks} semanas` (ou "Acenda sua Chama" quando `isFirstTime`) → rótulo "Chama do Conhecimento" → `{completed}/3 atividades nesta semana` → `ProgressBar value={completed/3*100}` → `message`. Texto do estado sempre presente (`srLabel` em elemento visualmente oculto ou como `aria-label` do bloco). Layout responsivo (largura fluida, sem tamanho fixo), alvo de toque ≥44px se virar clicável (não precisa ser).

Integrar em `src/screens/EvolutionScreen.jsx`: `import { getKnowledgeFlameState }`, um `useMemo` junto dos demais (deps `[contents, reviews]`, mesmo padrão de `EvolutionScreen.jsx:45-59`), e renderizar `<KnowledgeFlameCard state={flame} />` como **primeiro bloco do corpo rolável**, acima do `SectionLabel` "Resumo" — inclusive antes do early-return de `EmptyState` de `EvolutionScreen.jsx:81-86`? **Não**: manter o early-return intacto e colocar a Chama logo após ele, para não alterar o comportamento de tela vazia existente.

**Verificar:** `npm run build` sem erro; abrir a tela Evolution no navegador (`npm run dev`, MCP Playwright) em DB vazio → "Acenda sua Chama / 0 semanas"; concluir um quiz → card mostra `1/3` e "Continue seu ritmo"; testar largura estreita (360px) e larga sem quebra de layout.
**Commit:** `feat(chama): adiciona KnowledgeFlameCard no topo da tela Evolution`

### T5 — Indicador compacto na Review
Novo `src/components/study/FlameBadge.jsx` (ou `KnowledgeFlameBadge`): pílula pequena `Flame` + `{completed}/3`, `aria-label={srLabel}`, sem competir visualmente com a tela. Props `{ state }`.

Integrar em `src/screens/ReviewScreen.jsx`, **no header, à esquerda do `VisionPlusButton`** (linha do logo, `ReviewScreen.jsx:102-112`). Estado via `useMemo` com deps do store (`reviews`, `contents`), de modo que ao concluir uma revisão (`App.jsx:79-89` → `markReviewDone` → `mutate` recarrega o snapshot) o badge atualize sozinho ao voltar para a tela.

**Verificar:** navegador — com 2/3, header mostra `🔥 2/3`; concluir uma revisão pelo fluxo real (Review → flashcards → "Concluir revisão") e confirmar que ao retornar mostra `3/3`; conferir que o header não quebra em 360px.
**Commit:** `feat(chama): mostra indicador compacto da chama no header da Review`

### T6 — Regressão, acessibilidade e limpeza
- Confirmar que **`LibraryScreen.jsx` não referencia** nenhum componente da Chama (`grep` por `Flame`/`chama` em `src/screens/LibraryScreen.jsx` → vazio).
- `grep` global garantindo que nenhum arquivo fora de `data/storage` toca `localStorage` e que o serviço da Chama não chama `withDb`.
- Passar por todas as telas principais (Camera, Analysis, Summary, Quiz, Flashcards, Library, Review, Evolution, Vision+) verificando que nada quebrou; conferir contraste dos textos novos e navegação por teclado (`:focus-visible` global).
- Rodar `npm run test:data` e `npm run build` uma última vez.

**Commit:** `chore(chama): ajustes finais de acessibilidade e verificacao de regressao` (só se houver alteração; caso contrário, sem commit).

## Verificação final (end-to-end)

1. `npm run test:data` — 100% verde, incluindo os casos `F8-`.
2. `npm run build` — sem erros nem avisos novos.
3. `npm run dev` + navegador: DB limpo → Evolution mostra "Acenda sua Chama, 0 semanas, 0/3". Concluir 1 quiz → `1/3`. Concluir flashcards de outro conteúdo → `2/3`. Concluir 1 revisão → `3/3` + "Meta semanal concluída". **Recarregar a página** → continua `3/3`.
4. Repetir flashcards do mesmo conteúdo no mesmo dia → contador **não** sobe.
5. Library → nenhum elemento da Chama visível.

## Fora de escopo (não fazer)

Streak diário, notificações, badges/moedas/ranking, páginas novas, dados fictícios, mudanças na lógica de quiz/flashcards/reviews, novas coleções no `sv_db`, integrações externas.

## Entrega deste planejamento

Salvar este plano em `PLANO_FASE_8_CHAMA.md` na raiz do projeto e **parar** — nenhuma tarefa acima deve ser executada agora.
