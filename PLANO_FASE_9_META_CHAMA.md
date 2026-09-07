# Plano — Fase 9: Meta personalizada da Chama do Conhecimento

## Contexto

A Fase 8 entregou a Chama do Conhecimento com meta **fixa** de 3 atividades por semana (Seg→Dom), derivada de `quizAttempts`, `flashcardAttempts` e `reviews`, com card na Evolution e badge na Review. Tudo isso continua valendo e **não pode regredir**.

O que muda: o estudante passa a **definir sua própria meta semanal, de 1 a 7 atividades**. O período continua semanal e fixo. A proposta deixa de ser "complete 3 atividades" e passa a ser "defina seu ritmo e mantenha sua chama acesa".

Duas regras dominam o desenho:
1. **O histórico é imutável.** Mudar a meta hoje não pode reescrever o passado — uma semana concluída com meta 3 continua sendo 3/3 para sempre, inclusive no cálculo da sequência.
2. **Nada de dado fictício.** Continuamos derivando atividades dos registros reais; a única coisa nova persistida é a preferência do usuário e o carimbo da meta vigente.

## Arquitetura existente relevante (não recriar)

- **Persistência única:** `src/data/storage/db.js` → `readDb()` tem **allowlist fechada** (`db.js:30-43`): monta um objeto literal com 7 chaves conhecidas e **descarta qualquer campo desconhecido**. Logo, um campo novo só sobrevive se entrar em `emptyDb()` **e** nessa allowlist.
- Não existe ladder de migração por `SCHEMA_VERSION` — `migrations.js` só cobre o legado `sv_items` → `sv_db`. Um campo ausente em bancos antigos é resolvido pelo default do `readDb`, sem bump de versão.
- `withDb(mutator)` (`db.js:86`) é o caminho de escrita; a poda por quota (`db.js:53-82`) só mexe em `contents`, preservando outros campos.
- `src/context/ContentStoreContext.jsx:35-39` — `mutate(fn)` executa o serviço e recarrega o snapshot do disco (arrays novos), o que faz os `useMemo([contents, reviews])` das telas recomputarem. É por aí que a mudança de meta propaga.
- `src/services/knowledgeFlameService.js` — serviço da Chama (Fase 8). Hoje tem `WEEKLY_TARGET = 3` e **o "3" aparece hardcoded nas mensagens** (`:36-37`, `:141`); isso precisa sair.
- `src/utils/date.js` — `startOfWeekKey`, `currentWeekStartKey`, `previousWeekKey`, `weekRangeFromKey` já existem (Fase 8). Reusar.
- **Padrão de modal:** `src/components/ui/Modal.jsx` (bottom-sheet por padrão, portal em `.sv-frame`, `role="dialog"`, focus trap, Esc, fecha no backdrop). O pai monta dentro de `<AnimatePresence>` — ver `ReviewScreen.jsx:159-195`.
- **Padrão de seletor de opções:** `src/components/study/ReviewPlanPicker.jsx:22-41` — botões flex, `minHeight: 44`, `borderRadius: 12`, `aria-pressed`, ativo = `1.5px solid #2563EB` + `#EFF6FF` + texto `#2563EB`; inativo = `#E2E8F0` + branco + `#64748B`. É exatamente o padrão a replicar para 1..7.
- **CTA de modal:** `EventFormModal.jsx:104-107` — `<button>` inline, `height: 52`, `borderRadius: 16`, `linear-gradient(135deg,#2563EB,#7C3AED)`.
- Testes: runner caseiro `scripts/test-data-layer.mjs` (`npm run test:data`), hoje com 132 casos verdes.

## Modelo de dados

Novo campo **no próprio `sv_db`** (fonte única; nada de segunda chave de localStorage):

```js
flameGoals: {
  preferredWeeklyTarget: 3,            // 1..7 — meta atual do usuário
  weekTargets: { "2026-09-07": 5 }     // log esparso: weekStartKey (segunda) -> meta carimbada
}
```

**Resolução da meta de uma semana W** (`getWeekTarget(weekKey)`), sem escrita implícita:
1. `weekTargets[W]` existe → esse valor (histórico imutável).
2. senão → valor do **maior weekKey menor que W** presente em `weekTargets` (a meta que vigorava naquela época).
3. senão → `DEFAULT_WEEKLY_TARGET` (3) — cobre todo usuário existente que nunca configurou nada.

**Escrita acontece só numa ação explícita:** ao salvar a meta, `setPreferredWeeklyTarget(n)` grava `preferredWeeklyTarget = n` **e** carimba `weekTargets[semanaAtual] = n`. Como o carimbo marca a semana do save, a regra 2 resolve corretamente as semanas seguintes em que o usuário não mexeu em nada, e as anteriores continuam com o valor que tinham. Nenhuma semana fictícia é criada: `weekTargets` guarda metas, nunca atividades nem status.

| Cenário | Resultado |
|---|---|
| Usuário novo, sem `flameGoals` | meta 3 em toda semana |
| Salva 5 na semana W1 | W1 e seguintes = 5; semanas < W1 seguem 3 |
| Salva 3 na semana W3 | W3+ = 3; W1 e W2 continuam 5 |
| Aumenta meta com 3 já feitas | `3/5`, semana volta a ativa, atividades preservadas |
| Reduz meta com 5 já feitas | semana concluída; card mostra `3/3` + "5 atividades realizadas" |

O streak passa a comparar a contagem de cada semana com **a meta daquela semana**, não com a atual.

## Tarefas

Cada tarefa termina com verificação obrigatória; **não avançar** sem ela passar. Commits em Conventional Commits, em português, escopo `chama`, **somente no usuário Isac (sem linha `Co-Authored-By`)**.

### T1 — Campo `flameGoals` na camada de storage
Em `src/data/storage/db.js`:
- `emptyDb()` passa a incluir `flameGoals: { preferredWeeklyTarget: 3, weekTargets: {} }`.
- `readDb()` ganha a coerção defensiva do campo na allowlist: se não for objeto → default; `preferredWeeklyTarget` só sobrevive se for inteiro entre 1 e 7 (senão 3); `weekTargets` só aceita chaves no formato `YYYY-MM-DD` com valores inteiros 1..7, descartando o resto. Nunca lançar.
- Em `src/data/storage/migrations.js:116-138`, incluir o mesmo default no objeto migrado, para o db vindo do legado nascer completo.

Não bumpar `SCHEMA_VERSION` (não existe ladder de migração; o default do `readDb` já cobre bancos antigos).

**Verificar:** `npm run test:data` verde — atenção especial a `"20. round-trip de persistência (JSON estável)"` (`:393-401`), `"F3-1. round-trip preserva campos novos"` (`:493-515`), `"F6-7. sv_db corrompido"` e `"B1. escrita antes de qualquer leitura ainda migra o sv_items legado"`. Se algum quebrar, corrigir a coerção antes de seguir.
**Commit:** `feat(chama): persiste meta semanal configuravel no sv_db`

### T2 — Meta dinâmica no `knowledgeFlameService`
Estender o serviço existente (nunca criar um segundo). `WEEKLY_TARGET` vira `DEFAULT_WEEKLY_TARGET = 3`, mais `MIN_WEEKLY_TARGET = 1` e `MAX_WEEKLY_TARGET = 7`.

Novas funções:
- `normalizeWeeklyTarget(value)` → inteiro 1..7 ou `null`. Rejeita `0`, `-1`, `8`, `10`, `null`, `undefined`, `"abc"`, `3.5`, `"5"`? (aceitar string numérica inteira é opcional; o importante é nunca gravar fora da faixa).
- `getPreferredWeeklyTarget()` → lê `flameGoals`; default 3.
- `setPreferredWeeklyTarget(value)` → valida; se inválido retorna `null` **sem escrever**; se válido grava via `withDb` (`preferredWeeklyTarget` + carimbo `weekTargets[currentWeekStartKey()]`) e devolve o novo `getKnowledgeFlameState()`.
- `getWeekTarget(weekStartKey)` → regra de resolução das 3 etapas descrita acima.
- `getCurrentWeeklyTarget()` → `getWeekTarget(currentWeekStartKey())`.

Ajustes nas funções existentes:
- `getWeekProgress(weekStartKey)` usa `getWeekTarget(weekStartKey)` no lugar da constante.
- `getCurrentStreak()` compara a contagem de cada semana com `getWeekTarget(daquela semana)` — é isso que preserva o histórico no cálculo da sequência.
- `getKnowledgeFlameState()` passa a expor: `target` (meta da semana atual), `completed` (contagem real), `displayCompleted` = `min(completed, target)`, `extraCompleted` = `max(completed - target, 0)`, `remaining`, `weekCompleted`, `streakWeeks`, `isFirstTime`, `preferredWeeklyTarget`, `message`, `srLabel`. A UI usa `displayCompleted` — ela não deve calcular nada.
- **Todo texto passa a interpolar a meta** (nada de "3" hardcoded), com plural correto:
  - primeiro uso, 0 feitas → "Complete N atividades de estudo nesta semana para começar sua sequência." (N = 1 → "1 atividade").
  - 0 feitas com histórico → "Uma nova semana começou. Complete N atividades para acender sua chama."
  - falta 1 → "Falta 1 atividade para manter sua chama."
  - faltam 2+ → "Faltam X atividades para manter sua chama."
  - meta batida sem extra → "Meta semanal concluída! Sua chama continua acesa."
  - meta batida com extra (`extraCompleted > 0`) → "Meta semanal concluída! X atividades realizadas."
  - `srLabel` → "D de N atividades concluídas nesta semana." (D = `displayCompleted`).
- Manter o `try/catch` que devolve estado neutro em DB corrompido (agora com `target` = 3).

Não alterar `studyService`, `reviewService` nem a lógica de conclusão de quiz/flashcards/reviews.

**Verificar:** `npm run test:data` verde + `node -e` imprimindo `getKnowledgeFlameState()` em DB vazio → `target 3`, `0/3`, `isFirstTime true`.
**Commit:** `feat(chama): resolve meta semanal por semana com preferencia do usuario`

### T3 — Testes `F9-*` em `scripts/test-data-layer.mjs`
Reusar o runner, `resetDb()` e os helpers da Fase 8 (`weekKeyAgo`, `isoInWeek`, `addQuizActivity`, `addFlashcardActivity`, `addReviewActivity`). Cobrir:

1. usuário novo → `target 3`, `0/3`;
2. `setPreferredWeeklyTarget(5)` → meta atual 5;
3. leitura nova do db (reload) → meta continua 5;
4. 2 atividades com meta 5 → `2/5`, semana ativa;
5. muda para 3 → `2/3`, atividades preservadas;
6. +1 atividade → `3/3`, `weekCompleted true`;
7. aumento 3 → 5 com 3 feitas → `3/5`, volta a ativa, nada apagado;
8. redução 5 → 3 com 5 feitas → concluída, `displayCompleted 3`, `extraCompleted 2`;
9. nova semana → progresso 0 e meta = preferência vigente;
10. **histórico:** semana anterior carimbada com 3 continua 3 mesmo após mudar para 7 (checar `getWeekTarget` da semana antiga e o streak);
11. streak com metas diferentes por semana (ex.: W-2 meta 3 com 3 feitas + W-1 meta 5 com 5 feitas → `streakWeeks 2`);
12. semana antiga sem carimbo, anterior a qualquer preferência → resolve para 3;
13. semana sem carimbo posterior a um carimbo → herda o carimbo anterior (não o default);
14. validações: `0`, `-1`, `8`, `10`, `null`, `undefined`, `"abc"`, `3.5` → rejeitados, meta anterior intacta, nada gravado;
15. `flameGoals` corrompido no disco (string, array, valores fora da faixa) → tratado como default, sem exceção;
16. mensagens não contêm "3" quando a meta é 5 (guarda contra hardcode).

Datas dos fixtures sempre derivadas de `startOfWeekKey`/`addDaysIso`, para não quebrarem conforme o dia em que rodam.

**Verificar:** `npm run test:data` → 132 casos antigos + novos, todos verdes. Falhou? Corrigir T1/T2 antes de seguir.
**Commit:** `test(chama): cobre meta personalizada, historico por semana e validacoes`

### T4 — Modal de meta + ação no card (Evolution)
Novo `src/components/study/WeeklyGoalModal.jsx`, seguindo `Modal` bottom-sheet (`center={false}`) e o padrão de `EventFormModal`:
- Props: `{ value, onSave, onClose }` — sem regra de negócio dentro.
- Header: título "Sua meta semanal" + botão X 44×44 `aria-label="Fechar"`.
- Texto: "Escolha quantas atividades de estudo você quer completar por semana."
- Seletor 1..7 no padrão de `ReviewPlanPicker.jsx:22-41` (`aria-pressed`, `minHeight: 44`, ativo azul). Em 360px, sete botões numa linha ficam apertados: usar `display: grid; gridTemplateColumns: repeat(7, 1fr); gap: 6` e conferir no navegador; se ficar ilegível, quebrar em duas linhas com `repeat(4, 1fr)`.
- Texto auxiliar: "Uma meta realista ajuda você a manter sua constância." Para quem nunca configurou, acrescentar "Uma boa forma de começar é com 3 atividades por semana." — sugestão, nunca obrigação.
- CTA "Salvar meta" no padrão `EventFormModal.jsx:104-107`, desabilitado enquanto não houver seleção válida.

Em `src/components/study/KnowledgeFlameCard.jsx`:
- Nova prop opcional `onEditGoal`. Quando presente, renderizar o botão de texto **"Editar meta"** à direita da linha do contador (o `space-between` dessa linha já tem o slot vago), estilo discreto (`fontSize: 12`, `fontWeight: 700`, cor `#9A3412`, fundo transparente, sem borda), com alvo de toque de 44px via `padding: "10px 8px"` + `margin: "-10px -8px"` para não inflar o layout.
- Usar `displayCompleted` do state no contador e na barra; quando `extraCompleted > 0`, a mensagem do serviço já traz o total real — o componente só exibe.

Em `src/screens/EvolutionScreen.jsx`: `useState` para o modal, importar `AnimatePresence` (a tela ainda não usa), montar o modal como último filho do container raiz, e salvar com `mutate(() => setPreferredWeeklyTarget(n))` seguido de `onToast?.("✓ Meta atualizada")` — o `mutate` recarrega o snapshot e faz o `useMemo` da chama recomputar sozinho.

**Verificar:** `npm run build` limpo; no navegador (`npm run dev` + Playwright): abrir modal, escolher 5, salvar → card mostra `x/5` e mensagem no plural correto; escolher 1 → `1/1` quando houver 1 atividade; reduzir com excesso → `3/3` + "5 atividades realizadas"; recarregar a página → meta continua; testar 360px (modal e seletor) e navegação por teclado (Tab dentro do modal, Esc fecha, foco volta ao botão "Editar meta").
**Commit:** `feat(chama): adiciona modal de meta semanal personalizada na Evolution`

### T5 — Badge da Review como atalho para a Evolution
O badge continua **indicador**, sem modal de edição, mas passa a levar à Evolution para ver os detalhes:
- `src/components/study/FlameBadge.jsx`: aceitar `onClick` opcional; com ele, renderizar como `<button>` (mantendo o visual de pílula), `aria-label` = `srLabel` + " Ver detalhes na Evolução.", `whileTap` no padrão do projeto e altura de toque adequada sem quebrar o header; sem `onClick`, continua `div` com `role="status"`.
- `src/screens/ReviewScreen.jsx`: nova prop `onOpenEvolution`, repassada ao badge.
- `src/App.jsx`: passar `onOpenEvolution={() => goTo("evolution")}` ao `ReviewScreen` (mesmo padrão de `onOpenReview` já usado na Evolution, `App.jsx:191`).
- O badge exibe `displayCompleted`/`target` — nunca o "3" fixo.

**Verificar:** navegador — com meta 5, header da Review mostra `🔥 2/5`; clicar leva à Evolution com o card visível; o badge continua legível em 360px; Tab alcança o badge e Enter navega.
**Commit:** `feat(chama): transforma indicador da Review em atalho para a Evolution`

### T6 — Regressão, acessibilidade e limpeza
- `grep` garantindo que **nenhum** arquivo de UI tem meta fixa: buscar `/3` e `"3"` em `KnowledgeFlameCard`, `FlameBadge`, `WeeklyGoalModal` e telas — todo valor vem de `state.target`.
- `grep` em `src/screens/LibraryScreen.jsx` por `Flame|chama|meta` → vazio (a Library segue sem a Chama).
- Confirmar que `knowledgeFlameService` só escreve dentro de `setPreferredWeeklyTarget` (nenhuma escrita em caminho de leitura) e que nenhum módulo novo toca `localStorage` direto.
- Passar por Camera, Analysis, Summary, Quiz, Flashcards, Library, Review, Evolution e Vision+ conferindo que nada quebrou; contraste dos textos novos e `:focus-visible` no botão "Editar meta" e no badge.
- Rodar `npm run test:data` e `npm run build` uma última vez.

**Commit:** `chore(chama): ajustes finais de acessibilidade e regressao da meta personalizada` (só se houver alteração).

## Verificação final (end-to-end)

1. `npm run test:data` — 100% verde, incluindo `F8-*` (Fase 8 intacta) e `F9-*`.
2. `npm run build` — sem erros nem avisos novos.
3. Navegador, DB com dados da Fase 8 (usuário existente, sem `flameGoals`): meta aparece como 3, streak e atividades preservados — **nada perdido**.
4. Editar meta para 5 → card `x/5`, badge da Review `x/5`, mensagem no plural certo. Recarregar → continua 5.
5. Completar atividades até bater a meta → "Meta semanal concluída!" e sequência incrementada.
6. Reduzir a meta com excesso de atividades → `3/3` + "5 atividades realizadas", nenhuma atividade apagada.
7. Simular semana anterior com meta diferente → semana antiga mantém sua própria meta e o streak continua correto.
8. Library → nenhum elemento da Chama.

## Fora de escopo (não fazer)

Meta ou streak diário, novas atividades, novas páginas, ranking, notificações, punições, moedas/badges, pagamento, mudanças em quiz/flashcards/reviews, dados fictícios, alteração retroativa do histórico, período configurável (continua Seg→Dom).

## Entrega deste planejamento

Salvar este plano em `PLANO_FASE_9_META_CHAMA.md` na raiz do projeto e **parar** — nenhuma tarefa acima deve ser executada agora.
