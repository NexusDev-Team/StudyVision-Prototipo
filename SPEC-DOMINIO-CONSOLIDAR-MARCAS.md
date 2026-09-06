# Consolidar marcas de domínio em uma única notificação "Rever"

Data: 2026-09-06

## Problema

Hoje o "domínio" de um conteúdo (`content.mastery.level`, quatro níveis) aparece
como selo permanente em três lugares da UI:

1. **`ContentCard`** (Biblioteca) — badge fixo com `Rever` / `Em progresso` /
   `Dominado` ao lado de `Resumo` / `Flashcards`.
2. **`ContentDetailScreen`** — card "DOMÍNIO" com percentual + rótulo + selo.
3. **`EvolutionScreen` / `ReviewNeededCard`** — seção fixa "Matérias para rever".

O usuário quer que "domínio" deixe de ser um tópico/estado sempre visível.
Deve sobrar **apenas** uma sinalização de reforço, que aparece **só quando o
conteúdo precisa** — como uma notificação de "reestude isto", não como um
atributo permanente do conteúdo.

## Objetivo

- Nenhum selo permanente de nível de domínio na UI.
- Duas tags de notificação, condicionais:
  - **`Rever`** — quando o desempenho real ficou baixo
    (`mastery.level === "needs_review"`, hoje = acerto real < 60% com tentativas).
  - **`Revisão atrasada`** — quando existe uma review `pending` cuja data
    programada já passou.
- Cálculo interno de `content.mastery` (score/level em `studyService`)
  **permanece intacto** — muda só a exibição. `MASTERY_META` continua existindo
  para uso interno (`performanceService`, `evolutionService`).

## Não-objetivos

- Não alterar `studyService`, `performanceService`, `evolutionService` nem o
  modelo `content.mastery`.
- Não mexer no sistema de reviews (agendamento, kinds, plano de revisão).
- Não redesenhar as telas além do necessário para trocar os selos.

## Design

### 1. `src/constants.js` — novo `REVIEW_FLAG_META`

Adicionar (sem remover `MASTERY_META`):

```js
// Tags de notificação de reforço — aparecem só quando o conteúdo precisa.
// Não são estado permanente do conteúdo; some quando a condição deixa de valer.
export const REVIEW_FLAG_META = {
  needs_review: { label: "Rever", color: "#DC2626", bg: "rgba(220,38,38,0.1)" },
  overdue:      { label: "Revisão atrasada", color: "#B45309", bg: "rgba(180,83,9,0.1)" },
};
```

### 2. `src/components/study/ContentCard.jsx`

Prop nova: `isOverdue = false` (além de `isDue` que já existe).

Regra de tags (linha de badges, após o par `Resumo` / `Revisar hoje`):

- `not_started` continua mostrando o badge roxo **`Flashcards`**.
- Caso contrário, mostrar **no máximo uma** tag de reforço, por prioridade:
  1. `isDue` → **`Revisar hoje`** (comportamento atual, mantido)
  2. `isOverdue` → **`Revisão atrasada`** (`REVIEW_FLAG_META.overdue`)
  3. `mastery.level === "needs_review"` → **`Rever`** (`REVIEW_FLAG_META.needs_review`)
  4. nenhum → nenhuma tag de reforço (só `Resumo`)

Remover o bloco atual (linhas ~39-43) que sempre renderiza `mastery.label`
para `developing` / `mastered` / `needs_review`.

`getMasteryMeta` deixa de ser importado aqui se não sobrar uso.

### 3. `src/screens/LibraryScreen.jsx`

No `useMemo` que monta `dueByContent`, montar também `overdueByContent`:

```js
const startOfToday = new Date(startOfTodayIso()).getTime();
const overdue = new Set(
  reviews
    .filter((r) => r.status === "pending" && new Date(r.scheduledFor).getTime() < startOfToday)
    .map((r) => r.contentId)
);
```

Passar `isOverdue={overdueByContent.has(content.id)}` ao `<ContentCard>`.
Importar `startOfTodayIso` de `../utils/date`.

Observação: um conteúdo pode estar em `dueByContent` **e** `overdueByContent`;
a prioridade no `ContentCard` (item 2) resolve — `Revisar hoje` vence
`Revisão atrasada` só quando `scheduledFor` cai dentro de hoje; se já passou,
não entra em `dueByContent` pela regra `<= endOfToday`... na prática as duas
listas podem coincidir para reviews de dias anteriores. Decisão: manter a
prioridade `isDue > isOverdue` no card; visualmente aparece "Revisar hoje".
Se o usuário quiser distinguir depois, ajusta-se a regra de `dueByContent`.

### 4. `src/screens/ContentDetailScreen.jsx`

- Remover o card "DOMÍNIO" inteiro (bloco `{/* Domínio */}`, ~linhas 206-216).
- Remover as vars que ficam sem uso: `mastery`, `masteryScore`, `hasMastery`
  (linhas ~43-45) e o import `getMasteryMeta` se não sobrar uso.
- No lugar, uma faixa de notificação **condicional** logo antes do card
  "DESEMPENHO", renderizada só quando:
  - `content.mastery?.level === "needs_review"`, **ou**
  - existe review `pending` do conteúdo com `scheduledFor` antes de hoje.
- Conteúdo da faixa: ícone `RotateCcw`, texto curto
  _"Você não foi tão bem aqui — vale reestudar este conteúdo."_
  Estilo discreto (fundo âmbar claro, mesma linguagem de `REVIEW_FLAG_META`).
- Nenhuma das condições → não renderiza nada (sem placeholder).

A informação de review atrasada nessa tela vem do que já é carregado no
`ContentDetailScreen` (a variável `next` / `next.overdue` já existe no arquivo,
~linha 249) ou de um filtro simples sobre `reviews` do store.

### 5. `src/screens/EvolutionScreen.jsx` + `src/components/plus/ReviewNeededCard.jsx`

- `EvolutionScreen`: só renderizar `<ReviewNeededCard>` quando
  `subjectsToReview.length > 0`. Remover a chamada quando vazio.
- `ReviewNeededCard`: remover o `<SectionLabel>Matérias para rever</SectionLabel>`
  fixo e o ramo de estado vazio ("Nenhuma matéria precisando de revisão agora.").
  O componente passa a assumir `subjects.length > 0` (o gate fica na tela).
  Manter um rótulo leve interno, se necessário para contexto visual, mas sem
  ser uma seção fixa da tela.

## Fluxo de dados

```
studyService.updateMastery ──> content.mastery.{score,level}   (inalterado)
                                        │
                                        ├─ ContentCard: level === needs_review ? tag "Rever" : —
                                        └─ ContentDetailScreen: faixa condicional

reviews (store) ──> LibraryScreen: scheduledFor < hoje ? overdueByContent
                                        └─ ContentCard: tag "Revisão atrasada"
               └──> EvolutionScreen: getSubjectsToReview() > 0 ? render ReviewNeededCard
```

## Testes

- `scripts/test-data-layer.mjs` não deve quebrar (nenhuma mudança em serviços
  de dados). Rodar `node scripts/test-data-layer.mjs` — esperado: 132/132.
- Build: `npm run build` sem erros (imports removidos não podem deixar
  referência pendente).
- Verificação manual no browser:
  - Conteúdo com acerto < 60% → card da Biblioteca mostra só `Rever`;
    detalhe mostra a faixa; nenhum card "DOMÍNIO".
  - Conteúdo com review atrasada → tag `Revisão atrasada`.
  - Conteúdo `mastered` / `developing` → nenhuma tag de reforço, sem faixa.
  - Evolução sem matérias fracas → seção "Matérias para rever" ausente.

## Arquivos tocados

| Arquivo | Mudança |
|---|---|
| `src/constants.js` | + `REVIEW_FLAG_META` |
| `src/components/study/ContentCard.jsx` | tags condicionais; remove selo permanente; prop `isOverdue` |
| `src/screens/LibraryScreen.jsx` | deriva `overdueByContent`; passa `isOverdue` |
| `src/screens/ContentDetailScreen.jsx` | remove card DOMÍNIO + vars mortas; + faixa condicional |
| `src/screens/EvolutionScreen.jsx` | gate `subjectsToReview.length > 0` |
| `src/components/plus/ReviewNeededCard.jsx` | remove SectionLabel fixo + estado vazio |
