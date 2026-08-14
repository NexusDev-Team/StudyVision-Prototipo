# Refatoração estrutural do StudyVision

## Context

O protótipo StudyVision hoje vive praticamente inteiro em um único arquivo: `src/StudyVision.jsx` com **1651 linhas**, contendo 10 telas, ~15 componentes auxiliares, a lógica de repetição espaçada, a camada de persistência em localStorage, os dados de exemplo e **100% dos estilos inline**. Só existem 3 serviços mock separados (`notionService`, `exportService`, `calendarService`).

Isso gera três problemas concretos:

1. **Repetição massiva** — o mesmo bloco de estilo de "card branco" aparece ~15 vezes, o header de tela 6 vezes, o botão voltar 4 vezes, o label de seção ~12 vezes, o shell de tela 6 vezes. Qualquer ajuste visual exige editar N lugares.
2. **Impossível navegar** — achar/alterar uma tela significa rolar um arquivo de 1651 linhas; qualquer edição tem risco alto de colateral.
3. **Lógica duplicada** — `getStoredItems()` é chamado dentro de `useEffect` em `LibraryScreen`, `ReviewScreen` e no root; a lógica de `handleScheduleReview` está duplicada em dois pontos da mesma tela.

**Resultado esperado:** mesma aplicação, comportamento e visual **idênticos**, distribuída em uma árvore modular com componentes reutilizáveis, tokens de design centralizados, hooks e serviços isolados — e um fluxo de versionamento/deploy mais controlado.

### Decisões já tomadas com o usuário

| Tema | Decisão |
|---|---|
| Estilos | **CSS custom properties (`tokens.css`) + CSS Modules por componente.** Eliminar inline, exceto valores genuinamente dinâmicos (cor da matéria, animações do framer-motion). |
| Deploy | **GitHub Pages servindo `main` + pasta `/docs`.** Build vai para `docs/`, commitada. Remover `gh-pages`. |
| Escopo | **Só estrutura.** Sem mudança de comportamento, sem bugfix, sem feature nova. |
| Telas | **Manter as 9 telas atuais** (incluindo `QuestionsScreen`). Sem `CalendarScreen` nova — compromissos continuam dentro de `ReviewScreen`, mas viram componente reutilizável. |
| Idioma | Código, comentários, commits e docs em **inglês/português como já está hoje** (comentários em inglês, UI em pt-BR). Manter o padrão vigente. |

---

## Skills a usar na execução

**Já instaladas (usar direto):**
- `superpowers:executing-plans` — executar este plano por fases com checkpoints.
- `superpowers:verification-before-completion` — nada é dado como pronto sem `npm run build` + walkthrough manual verificados.
- `superpowers:requesting-code-review` — review ao final de cada fase grande (Fase 3 e Fase 6).
- `code-review` (`/code-review`) — varredura de correção/simplificação antes do merge final.

**Instalar antes de começar (Fase 0):**
```bash
npx skills add vercel-labs/agent-skills@vercel-composition-patterns -g -y   # 288.9K installs
npx skills add vercel-labs/agent-skills@vercel-react-best-practices -g -y   # 632.2K installs
```
- `vercel-composition-patterns` — é exatamente o assunto desta tarefa: decompor componentes, decidir o que vira primitivo reutilizável vs. o que fica local, evitar prop drilling.
- `vercel-react-best-practices` — padrões de hooks/estado, evita introduzir regressões ao mover código.

**Avaliadas e dispensadas:** `pproenca/dot-skills@react-refactor` (693 installs) e `marcelorodrigo/agent-skills@conventional-commit` (899 installs) — baixa adoção e o conteúdo é coberto pelas skills acima + conhecimento padrão de Conventional Commits.

---

## Estrutura alvo

```
plans/
└── refactor-estrutura.md          # cópia deste plano (Fase 0)

src/
├── components/
│   ├── layout/
│   │   ├── PhoneFrame.jsx         # .sv-outer + .sv-frame + notch + footer label
│   │   ├── StatusBar.jsx
│   │   ├── BottomNav.jsx
│   │   ├── Screen.jsx             # shell: coluna, bg, overflow hidden
│   │   ├── ScreenHeader.jsx       # header branco (logo | back | título | subtítulo)
│   │   └── ScrollArea.jsx         # flex:1 + overflowY:auto + padding
│   ├── ui/
│   │   ├── Button.jsx             # variants: primary(gradiente) | outline | ghost | icon
│   │   ├── BackButton.jsx         # ChevronLeft + label, cor por prop
│   │   ├── Card.jsx               # card branco r20 + sombra + borda
│   │   ├── SectionLabel.jsx       # label uppercase cinza tracking
│   │   ├── Badge.jsx              # pills: concept | keyword | status | tag
│   │   ├── FilterPills.jsx        # linha de pills selecionáveis (Biblioteca + Planning)
│   │   ├── EmptyState.jsx
│   │   ├── Toast.jsx
│   │   └── Modal.jsx              # bottom-sheet + portal p/ .sv-frame
│   ├── brand/
│   │   ├── LogoSVG.jsx
│   │   └── CapturedPageVisual.jsx
│   └── study/
│       ├── ContentBlocks.jsx      # RESUMO / CONCEITOS / PALAVRAS-CHAVE (Summary+Detail)
│       ├── ContentCard.jsx        # item da Biblioteca
│       ├── Flashcard.jsx          # carta com flip 3D
│       ├── QuizQuestion.jsx
│       ├── ReviewCard.jsx         # linha "para hoje"
│       ├── UpcomingReviewRow.jsx
│       ├── CommitmentCard.jsx
│       ├── ScheduleReviewButton.jsx
│       ├── ExportSection.jsx
│       ├── PlanningSection.jsx
│       └── PlanningModal.jsx
├── screens/
│   ├── CameraScreen.jsx
│   ├── AnalysisScreen.jsx
│   ├── SummaryScreen.jsx
│   ├── LibraryScreen.jsx
│   ├── ContentDetailScreen.jsx
│   ├── FlashcardsScreen.jsx
│   ├── QuestionsScreen.jsx
│   ├── QuizScreen.jsx
│   ├── ReviewScreen.jsx
│   └── VisionPlusScreen.jsx
├── data/
│   └── sampleContent.js           # SAMPLE_ITEMS, CAPTURE_POOL, nextCaptureTemplate
├── services/
│   ├── storage.js                 # getStoredItems, saveItem, getDueItems
│   ├── reviewEngine.js            # agenda de revisão + helpers de data
│   ├── calendarService.js         # (já existe, sem mudança)
│   ├── exportService.js           # (já existe, sem mudança)
│   └── notionService.js           # (já existe, sem mudança)
├── hooks/
│   ├── useStudyItems.js           # items + reload + save + markDone + dueCount
│   ├── useNavigation.js           # screen, prevScreens, go/goBack/goTo, reviewMode
│   └── useToast.js
├── styles/
│   ├── tokens.css                 # :root com todas as variáveis
│   ├── global.css                 # reset, body, .sv-outer/.sv-frame, media query
│   └── motion.js                  # slideIn, fadeUp, tap
├── constants.js                   # FREE_FLASHCARD_LIMIT, PLANNING_TYPES, REMINDER_OPTIONS, SUBJECT_FILTERS
├── App.jsx                        # ex-`StudyVision()` root
└── main.jsx
```

`src/StudyVision.jsx` e `src/index.css` deixam de existir ao final.

---

## Tokens (`src/styles/tokens.css`)

Extrair os valores hardcoded que se repetem hoje:

```css
:root {
  /* cores de marca */
  --sv-blue: #2563EB;      --sv-blue-dark: #1D4ED8;   --sv-blue-bg: #EFF6FF;
  --sv-purple: #7C3AED;    --sv-purple-bg: #EDE9FE;
  --sv-teal: #14B8A6;      --sv-green: #16A34A;       --sv-green-bg: #F0FDF4;
  --sv-red: #DC2626;       --sv-red-bg: #FEF2F2;      --sv-red-border: #FECACA;
  --sv-orange: #EA580C;
  /* neutros (escala slate já usada) */
  --sv-ink: #111827;  --sv-text: #374151;  --sv-muted: #64748B;
  --sv-faint: #94A3B8; --sv-line: #E2E8F0; --sv-line-soft: #F1F5F9;
  --sv-surface: #FFFFFF; --sv-bg: #F8FAFC; --sv-dark: #030712;
  /* gradientes */
  --sv-grad-primary: linear-gradient(135deg, #2563EB, #7C3AED);
  /* raios */
  --sv-r-sm: 8px; --sv-r-md: 12px; --sv-r-lg: 16px; --sv-r-xl: 20px; --sv-r-2xl: 24px; --sv-r-pill: 20px;
  /* sombras */
  --sv-shadow-card: 0 1px 8px rgba(0,0,0,0.05);
  --sv-shadow-btn: 0 4px 18px rgba(37,99,235,0.3);
  /* espaçamento e tipografia */
  --sv-pad-screen: 20px; --sv-header-top: 52px; --sv-nav-h: 80px;
  --sv-font: "Inter", sans-serif;
}
```

Regra: nenhum hex literal novo nos `.module.css`. Cor dinâmica de matéria (`item.subjectColor` / `subjectBg`) continua vindo por `style` ou via CSS var inline (`style={{ '--card-accent': item.subjectColor }}`).

---

## Fases de execução (uma fase = um ou mais commits)

Cada fase termina com `npm run build` verde antes do commit. Não pular para a fase seguinte com build quebrado.

### Fase 0 — Preparação
1. Instalar as duas skills da Vercel (comandos acima).
2. Copiar este plano para `plans/refactor-estrutura.md`.
3. Criar branch `refactor/estrutura-modular`.

**Commit:** `docs(plans): adiciona plano de refatoração estrutural`

### Fase 1 — Fundação: estilos, dados e serviços
Só extração pura, sem tocar em JSX ainda.
- `src/styles/tokens.css` + `src/styles/global.css` (conteúdo atual de `src/index.css` migrado para usar as vars) + `src/styles/motion.js` (`slideIn`, `fadeUp` das linhas 263-272).
- `src/services/reviewEngine.js` ← linhas 88-125 + `markReviewDone` (252-260).
- `src/services/storage.js` ← linhas 231-250.
- `src/data/sampleContent.js` ← `SAMPLE_ITEMS` (128-219) + `CAPTURE_POOL`/`nextCaptureTemplate` (221-229). Importa `buildReviewSchedule` de `reviewEngine`.
- `src/constants.js` ← `FREE_FLASHCARD_LIMIT`, `PLANNING_TYPES`, `REMINDER_OPTIONS` e a lista de filtros de matéria (hoje literal em `LibraryScreen`).
- `StudyVision.jsx` passa a importar tudo isso; app continua funcionando idêntico.

**Commits:**
- `refactor(styles): extrai tokens de design e estilos globais`
- `refactor(services): separa reviewEngine e storage do componente raiz`
- `refactor(data): move conteúdo de exemplo e constantes para módulos próprios`

### Fase 2 — Primitivos de UI e layout
Criar os componentes de `components/ui/`, `components/layout/` e `components/brand/` com seus `.module.css`, cada um cobrindo um padrão repetido identificado:

| Componente | Substitui | Ocorrências hoje |
|---|---|---|
| `Card` | div branca r20 + `--sv-shadow-card` + borda | ~15 |
| `SectionLabel` | `<p>` label uppercase cinza | ~12 |
| `Screen` | shell `100%/100%` coluna bg `#F8FAFC` | 6 |
| `ScreenHeader` | header branco `52px 20px 14px` | 6 |
| `ScrollArea` | `flex:1; overflowY:auto` | 7 |
| `Button` | botões gradiente / outline / ícone | ~10 |
| `BackButton` | ChevronLeft + label colorido | 4 |
| `Badge` | pills de conceito/keyword/status | ~10 |
| `FilterPills` | filtros da Biblioteca + tipos do Planning | 2 |
| `EmptyState` | "Nenhum conteúdo/compromisso..." | 3 |
| `Modal` | bottom-sheet com `createPortal(.sv-frame)` | 1 (generalizar) |

`PhoneFrame` absorve `.sv-outer` + `.sv-frame` + notch + `.sv-footer-label` (linhas 1556-1560, 1644-1647).
`StatusBar`, `Toast`, `BottomNav`, `LogoSVG`, `CapturedPageVisual` movem quase 1:1, só trocando inline por CSS Module.

**Commits:**
- `refactor(ui): cria primitivos reutilizáveis (Card, Button, Badge, SectionLabel...)`
- `refactor(layout): extrai PhoneFrame, StatusBar, BottomNav, Screen e ScreenHeader`

### Fase 3 — Componentes de estudo
Extrair `components/study/` usando os primitivos da Fase 2:
- `ContentBlocks` — unifica o array `blocks` duplicado em `SummaryScreen` (724-749) e `ContentDetailScreen` (940-965). Aceita `item` + variação de rótulo ("CONCEITOS ENCONTRADOS" vs "CONCEITOS") e de cor (azul fixo vs `subjectColor`).
- `ExportSection` (547-581), `PlanningSection` (670-706), `PlanningModal` (592-668) → arquivos próprios, `PlanningModal` sobre o `Modal` genérico.
- `ContentCard` (884-920), `Flashcard` (1091-1107), `QuizQuestion` (1232-1261), `ReviewCard` (1420-1439), `UpcomingReviewRow` (1450-1465), `CommitmentCard` (1479-1491), `ScheduleReviewButton` (o botão `CalendarPlus`, hoje repetido em 1433 e 1460).

**Checkpoint:** rodar `superpowers:requesting-code-review` antes de seguir.

**Commit:** `refactor(study): extrai componentes de conteúdo, flashcard, quiz e revisão`

### Fase 4 — Telas
Mover as 10 telas para `src/screens/`, uma por arquivo, já consumindo os componentes das fases 2 e 3. Nenhuma prop de tela muda de nome ou assinatura — o root continua chamando igual.

**Commit (um por grupo, para diff legível):**
- `refactor(screens): extrai Camera, Analysis e Summary`
- `refactor(screens): extrai Library, ContentDetail e VisionPlus`
- `refactor(screens): extrai Flashcards, Questions, Quiz e Review`

### Fase 5 — Hooks e App raiz
- `hooks/useNavigation.js` ← `screen`/`prevScreens`/`go`/`goBack`/`goTo`/`reviewMode` (1504-1532).
- `hooks/useToast.js` ← estado do toast (1508, 1534).
- `hooks/useStudyItems.js` ← unifica os três `useEffect(() => setItems(getStoredItems()))` de `LibraryScreen` (828), `ReviewScreen` (1371) e `refreshDueCount` do root (1512-1513). Expõe `{ items, dueItems, dueCount, reload, save, markDone }`.
  **Cuidado:** manter o comportamento atual de recarga (lê no mount da tela). Não introduzir sincronização global — isso seria mudança de comportamento, fora do escopo.
- `App.jsx` — root enxuto (~80 linhas) usando `PhoneFrame` + os hooks.
- `main.jsx` importa `./App.jsx` e `./styles/global.css`.
- **Deletar** `src/StudyVision.jsx` e `src/index.css`.

**Commits:**
- `refactor(hooks): centraliza navegação, toast e acesso aos itens de estudo`
- `refactor(app): reescreve raiz sobre PhoneFrame e hooks e remove StudyVision.jsx`

### Fase 6 — Deploy manual via main + /docs
- `vite.config.js`: adicionar `build: { outDir: "docs", emptyOutDir: true }` (manter `base: "./"`).
- `package.json`: remover scripts `predeploy`/`deploy` e a devDependency `gh-pages`; rodar `npm install` para atualizar o lockfile.
- `.gitignore`: remover `dist`; **não** ignorar `docs`. Adicionar `dist` continua desnecessário já que o outDir mudou — remover a linha evita confusão.
- Apagar a pasta `dist/` local (não versionada hoje).
- `README.md` (criar, se não houver): como rodar, como buildar, como publicar (`npm run build` → commit da `docs/` → push em `main`).

**Ação manual do usuário (não dá para automatizar):** GitHub → Settings → Pages → Source: *Deploy from a branch* → Branch `main`, folder `/docs`. Depois disso a branch `gh-pages` remota pode ser apagada.

**Commits:**
- `build: publica GitHub Pages a partir de main/docs e remove gh-pages`
- `docs: adiciona README com fluxo de build e publicação`

---

## Regras de commit

Conventional Commits, escopo entre parênteses, mensagem em português, imperativo:
```
refactor(ui): cria primitivos reutilizáveis (Card, Button, Badge)
build: publica GitHub Pages a partir de main/docs
docs(plans): adiciona plano de refatoração estrutural
```
Tipos em uso: `refactor`, `build`, `docs`, `chore`, `style`. **Não** usar `feat` nem `fix` nesta refatoração — se aparecer vontade de usar, é sinal de que o escopo vazou.

---

## Verificação

**Por fase:**
```bash
npm run build     # tem que passar sem erro e sem warning novo
```

**Ao final (walkthrough manual obrigatório, `npm run dev`):**
1. Câmera abre; painel "Study Vision" aparece após ~0.7s e some após ~3.5s; toggle do olho funciona.
2. Disparar o obturador → flash branco → tela de análise (~4.6s) → Resumo.
3. No Resumo: os 3 blocos, a imagem capturada, exportar (Notion/Documento/Copiar) mostra "Enviando..." e o toast correspondente.
4. Planejamento: abrir modal, escolher tipo, preencher data+hora, salvar → dois toasts em sequência; card verde de agendado aparece.
5. Salvar → toast + vai para Biblioteca; o item novo aparece no topo.
6. Biblioteca: busca e filtros por matéria funcionam; badge "Revisar hoje" nos itens vencidos; contador no rodapé correto.
7. Detalhe: status de revisão, os 3 blocos com a cor da matéria, botões Flashcards/Quiz/Perguntas.
8. Flashcards: flip 3D, "Lembrei"/"Não lembrei", tela de sessão concluída, CTA de bloqueio quando há mais de 5 cartas (usar o item de Matemática, que tem 5 — confirmar que o CTA **não** aparece; History tem 4).
9. Quiz: acerto verde / erro vermelho, "Próxima", resultado final.
10. Revisão: seções "Para hoje", "Próximas revisões" e "Compromissos"; botão `CalendarPlus` agenda e troca pelo ícone de calendário; badge vermelho da nav bate com a contagem de vencidos.
11. Vision+ abre e volta.
12. Redimensionar para ≤480px: moldura do telefone some, app vai edge-to-edge.

**Regressão visual:** antes de começar a Fase 2, tirar screenshots das 10 telas (Playwright MCP disponível) e comparar ao final. Diferença de pixel = bug de refatoração.

**Estado final esperado:** nenhum arquivo `.jsx` acima de ~250 linhas; zero ocorrências de `#2563EB`/`#F8FAFC`/`#94A3B8` literais fora de `tokens.css`.
