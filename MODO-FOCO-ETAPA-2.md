# MODO FOCO — ETAPA 2: Experiência Completa

## Contexto

A Etapa 1 entregou apenas o motor do Modo Foco: modelo `FocusSession`/`FocusStep`, persistência, service de orquestração, prompt e endpoint `/api/focus`. Nenhuma tela consome esse motor hoje — `grep` em `src/screens`, `src/components`, `src/hooks` e `src/App.jsx` não encontra nenhuma referência ao Modo Foco.

Esta etapa constrói a **experiência de uso**: entrada pela página de conteúdo, seleção de duração, experiência imersiva ("Focus Lock") com uma etapa por vez, progresso persistido, timer não punitivo, saída, retomada sem nova chamada ao Gemini e conclusão.

Resultado esperado: o usuário abre um conteúdo, escolhe 2/5/10 minutos, estuda etapa a etapa, sai quando quiser, volta no mesmo passo e conclui — sem quebrar nada do que já existe.

---

## Auditoria da Etapa 1 (arquitetura real encontrada)

### Motor (não reimplementar)

| Camada | Arquivo | O que expõe |
|---|---|---|
| Modelo | `src/data/models/focusSession.js` | `FOCUS_SESSION_STATUSES = ["in_progress","completed"]`, `createFocusStep`, `createFocusSession` |
| Validação | `src/data/models/validate.js` | `validateFocusSession(session)` → `{ valid, errors }` |
| Constantes | `src/constants.js` | `FOCUS_DURATIONS = [2,5,10]`, `FOCUS_DEFAULT_DURATION = 5`, `FOCUS_STEP_TYPES`, `FOCUS_STEP_BOUNDS`, `LEARNING_PREFERENCE_KEYS/META` |
| Persistência | `src/services/focusSessionService.js` | `getFocusSession`, `getFocusSessionsForContent`, `getActiveFocusSession`, `persistFocusSession`, `setFocusStepIndex`, `advanceFocusStep`, `completeFocusSession`, `deleteFocusSessionsForContent`, `MAX_SESSIONS_PER_CONTENT = 3` |
| Orquestração | `src/services/focusModeService.js` | `FocusError` (`kind`), `isDurationSupported`, `buildFocusPayload`, `hasEnoughContent`, `requestFocusPlan`, `normalizeFocusPlan`, `getOrResumeFocusSession`, `startFocusSession(contentId, durationMinutes, opts)` → `{ session, resumed }` |
| Storage | `src/data/storage/db.js` / `index.js` | `localStorage` chave `sv_db`, coleção de topo `focusSessions`, `readDb/writeDb/withDb` |
| Backend | `api/focus.js` + `lib/focusPrompts.js` + `lib/gemini.js` | `POST /api/focus` → `{ success, steps:[{type,title,content}] }`; rota registrada em `vite.config.js` (`API_ROUTES`) |
| Preferências | `src/services/learningPreferencesService.js` | `getPreferenceOptions()` — já consumido por `startFocusSession` |

Campos reais da sessão: `id` (`fcs_`), `contentId`, `durationMinutes`, `status`, `steps[]` (`fst_`, com `order`, `type`, `title`, `content`), `currentStepIndex`, `inclusionPreferencesSnapshot`, `createdAt`, `updatedAt`, `completedAt`. **Não existe campo de timer.**

Comportamentos já garantidos (aproveitar, não duplicar):
- `startFocusSession` retorna a sessão ativa existente **sem tocar em rede** (`resumed: true`).
- Dedupe de duplo clique via `Map` `inFlight` por `contentId:durationMinutes`.
- `hasEnoughContent` roda antes do `fetch` — conteúdo insuficiente nunca gasta chamada.
- `getOrResumeFocusSession(contentId)` foi criado exatamente para a UI desta etapa.

### UI existente (reutilizar)

- Navegação: **sem React Router**. `src/hooks/useNavigation.js` (`go`/`goBack`/`goTo`) + render condicional em `src/App.jsx` dentro de `AnimatePresence mode="wait"`.
- Shell global: `showNav = !["camera","analysis"].includes(screen)` em `src/App.jsx:100-112` e `:214-223` — **é aqui que o Focus Lock esconde o BottomNav**, adicionando `"focus"` à lista. Não existe header global (cada tela desenha o seu).
- Página de conteúdo: `src/screens/ContentDetailScreen.jsx`, com fileira de 3 ações (Flashcards / Quiz / Perguntas).
- Primitivos: `src/components/ui/` → `Button` (`primary|outline|ghost`), `Modal` (`center=false` = bottom sheet, portal, Esc, focus trap), `ConfirmDialog`, `ProgressBar`, `Card`, `EmptyState`, `Badge`, `SectionLabel`. **Não existe Loader nem ErrorState genéricos** — o padrão de loading está inline em `src/screens/AnalysisScreen.jsx`.
- Questões: `src/components/study/QuizQuestion.jsx` (`{ q, index, selected, onChoose, onNext, isLast }` + `isCorrectOption`), formato de `src/data/models/quiz.js` (`type: "mc"|"vf"`, `options`, `correctAnswer`, `explanation`).
- Store: `src/context/ContentStoreContext.jsx` → `mutate(fn)` re-lê o snapshot após escrita.
- Motion: `framer-motion`, presets em `src/styles/motion.js` (`slideIn`, `fadeUp`).
- Estilo: CSS Modules nos primitivos + estilos inline nas telas; tokens em `src/styles/tokens.css`.

### Testes

- Runner offline determinístico: `scripts/test-data-layer.mjs` (`npm run test:data`), helpers `test()`/`testAsync()`, `blockNetwork()`, `resetDb()`, `fakeTransport()`, `seedContentForFocus()`. Hoje: **249 testes**, 60 com prefixo `MF-`.
- Verificação live (Gemini real, custa): `npm run test:focus` e `npm run test:focus -- --http`.

---

## Decisões desta etapa

1. **Timer com campos persistidos.** Estender `createFocusSession`/`validateFocusSession` com `timerStartedAt`, `elapsedMs`, `pausedAt` — coerção tolerante (sessões antigas sem os campos continuam válidas, sem bump de `SCHEMA_VERSION`, mesmo critério já usado para `focusSessions` em `db.js`). Nada de gravar contador a cada segundo: só timestamps, escrita apenas em eventos (iniciar, pausar, retomar, sair).
2. **"Outro jeito" implementado** com endpoint novo e leve `POST /api/rephrase` (só título+conteúdo do step atual e preferências; sem imagem, sem Content inteiro, sem histórico, sem chat). **"Me perdi"** é resposta **local**, montada a partir da própria sessão (recapitulação do step anterior + onde ele está) — zero Gemini.
3. **Pausa simples** no header do Focus Lock.
4. Nova tela `"focus"` no roteador de estado existente — **sem** introduzir React Router.

---

## Tarefas (cada uma verificável e corrigível antes da seguinte)

> Regra: nunca passar para a próxima tarefa sem validar; ao achar bug, corrigir na própria tarefa e revalidar.
> Verificação padrão de cada tarefa de código: `npm run test:data` verde + `npm run build` sem erro.

### Bloco A — Fundação de timer no motor

**T1 — Campos de timer no modelo**
- `src/data/models/focusSession.js`: em `createFocusSession`, aceitar e normalizar `timerStartedAt` (ISO|null), `elapsedMs` (inteiro ≥ 0, default 0), `pausedAt` (ISO|null).
- `src/data/models/validate.js`: validar tipos **aceitando ausência** (`undefined`/`null` válidos; `elapsedMs` ausente conta como 0).
- Verificação: testes novos **MF-55..MF-58** — defaults corretos; sessão legada sem os campos passa em `validateFocusSession`; `elapsedMs` negativo/NaN vira 0; `pausedAt` inválido vira `null`.

**T2 — Operações de timer no service**
- `src/services/focusSessionService.js`: adicionar `startFocusTimer(sessionId)` (define `timerStartedAt` se ainda nulo), `pauseFocusTimer(sessionId)` (acumula em `elapsedMs`, grava `pausedAt`), `resumeFocusTimer(sessionId)`, `getFocusElapsedMs(session, now)` (pura: `elapsedMs + (pausedAt ? 0 : now - timerStartedAt)`).
- Verificação: **MF-59..MF-64** — pausar duas vezes seguidas não duplica acumulado; retomar após pausa continua de onde parou; elapsed de sessão nunca iniciada é 0; `completeFocusSession` congela o elapsed.
- Commit 1: `feat: adicionar controle de tempo persistido às sessões de foco`

### Bloco B — Entrada pela página de conteúdo

**T3 — Hook de sessão de foco**
- Novo `src/hooks/useFocusSession.js`: encapsula `getOrResumeFocusSession`, `startFocusSession`, avanço/retorno de step, conclusão e timer — sempre através do `mutate` do `ContentStoreContext`. Nenhum `localStorage.setItem` em componente.
- Estados expostos: `session`, `status: "idle"|"loading"|"ready"|"error"`, `error` (com `kind` do `FocusError`).
- Verificação: lógica pura extraída testável no runner (**MF-65..MF-67**: mapa `FocusError.kind` → mensagem em português; nunca expõe erro cru).

**T4 — `FocusEntry` no ContentDetail**
- Novo `src/components/study/FocusEntryCard.jsx`, inserido em `src/screens/ContentDetailScreen.jsx` **acima da fileira de ações** (Flashcards/Quiz/Perguntas), sem substituí-las.
- Sem sessão ativa: botão `🎯 Modo Foco`.
- Com sessão ativa: card "Sessão em andamento — X minutos · Você parou na etapa N de M", CTA primário `Continuar sessão` + ação secundária discreta `Nova sessão`.
- Conteúdo insuficiente (`hasEnoughContent` falso): estado explicativo, sem botão quebrado (seção 45).
- Verificação manual: abrir conteúdo com resumo; abrir conteúdo sem resumo/extractedText; confirmar os três estados.
- Commit 2: `feat: adicionar entrada do modo foco à página de conteúdo`

**T5 — Seletor de duração**
- Novo `src/components/study/FocusDurationSheet.jsx` usando o `Modal` existente (bottom sheet). Opções geradas a partir de `FOCUS_DURATIONS` importado de `src/constants.js` — **nunca** lista literal duplicada.
- Título "Quanto tempo você tem?", descrição por duração, CTA "Começar" desabilitado durante geração.
- Verificação: **MF-68** (mapa de descrições cobre exatamente `FOCUS_DURATIONS`, quebra se alguém adicionar duração) + teste manual das 3 opções.

**T6 — Loading e erro de geração**
- Estado "Preparando sua sessão focada..." dentro do próprio sheet; botão desabilitado; duplo clique bloqueado (já há dedupe no service, mas a UI também impede).
- Erro: "Não conseguimos preparar sua sessão agora." + `Tentar novamente` / `Voltar`. Mensagem específica para `insufficient_content` e `network`.
- Verificação: forçar erro desligando a chave do Gemini / bloqueando `/api/focus` no DevTools; confirmar ausência de tela branca e de sessão parcial persistida.
- Commit 3: `feat: implementar seleção de duração e geração da sessão de foco`

### Bloco C — Focus Lock

**T7 — Tela e ocultação do shell**
- Nova `src/screens/FocusScreen.jsx`; `src/App.jsx` ganha `screen === "focus"` e `"focus"` entra na lista que zera `showNav` (junto de `camera`/`analysis`), além do `paddingBottom` condicional.
- Header mínimo: sair (`ChevronLeft`), título curto do conteúdo, tempo, botão pausar.
- Verificação (seção 50): durante a sessão não aparecem BottomNav, biblioteca, calendário, Study Vision+; o usuário ainda consegue sair e navegar entre steps.

**T8 — Renderer de steps + progresso**
- Novo `src/components/study/FocusStepRenderer.jsx`: um switch sobre `FOCUS_STEP_TYPES` com **um** layout base (título + corpo legível, `maxWidth` de leitura confortável) e variações leves — `example`/`practice` dentro de `Card`, `summary` com destaque discreto.
- Progresso: `ProgressBar` existente + texto "Etapa N de M" (informação textual, não só cor).
- Uma etapa por vez, transição `fadeUp` do `src/styles/motion.js`.
- Verificação: **MF-69..MF-71** (mapeamento de tipo → variante cobre todos os `FOCUS_STEP_TYPES`, com fallback) + inspeção visual dos 6 tipos.

**T9 — Step de questão**
- Se `step.type === "question"`, um adapter pequeno converte o step em objeto compatível com `QuizQuestion` (`{ type:"mc", question, options, correctAnswer, explanation }`) quando o conteúdo do step trouxer alternativas parseáveis; caso contrário, renderiza como `practice` (reflexão sem alternativas). **Sem segundo sistema de quiz e sem tocar em `quizAttempts`/analytics.**
- Verificação: **MF-72..MF-74** (adapter com alternativas válidas; sem alternativas → fallback; conteúdo malformado não lança).
- Commit 4: `feat: implementar experiência imersiva das sessões de foco`

**T10 — Navegação entre steps com persistência**
- `Continuar` → `advanceFocusStep`; `Voltar` → `setFocusStepIndex(i-1)`; último step → `Concluir sessão`.
- Cada mudança persiste imediatamente via service; o state React apenas espelha.
- Verificação (seções 51/52): avançar 1→2→3, recarregar a página, cair no step 3; conferir `sv_db.focusSessions[].currentStepIndex` no DevTools.

**T11 — Timer na UI**
- Um único `setInterval` de 1 s em `useEffect` com cleanup; o valor exibido é **derivado** de `getFocusElapsedMs(session, Date.now())`, nunca um contador independente.
- Ao sair/desmontar: `clearInterval` + persistir elapsed.
- Ao chegar a 00:00: troca para "Tempo planejado concluído. Finalize esta etapa no seu ritmo." — **sem** bloquear, expulsar, alterar `status` ou apagar progresso.
- Verificação (seções 54/55): 2/5/10 min iniciam certo; reload não cria dois timers (contar ticks no console); sair limpa o intervalo; zero não bloqueia; status permanece `in_progress`.
- Commit 5: `feat: adicionar temporizador não punitivo ao modo foco`

### Bloco D — Saída, retomada e conclusão

**T12 — Sair com confirmação**
- `ConfirmDialog` existente: "Seu progresso será salvo." · `Sair` / `Continuar estudando`. Linguagem não punitiva. Sair → `goBack()` para o conteúdo.
- Verificação (seção 56): sair no meio, sessão segue `in_progress`, card de continuar aparece no ContentDetail.

**T13 — Retomada sem Gemini**
- `Continuar sessão` chama apenas `getOrResumeFocusSession` e abre a tela no `currentStepIndex` salvo. `Nova sessão` exige confirmação e explica que a sessão atual será preservada (o service já poda além de 3 por conteúdo).
- Verificação (seções 53/57 — **crítico**): com a aba Network aberta e filtro `focus`, executar avançar / voltar / reload / sair / retornar / continuar — **nenhuma requisição a `/api/focus`**. Confirmar mesmo `session.id` e mesmos steps.
- Commit 6: `fix: garantir retomada e persistência do progresso no modo foco`

**T14 — Conclusão**
- Último step → `completeFocusSession` (grava `status:"completed"` + `completedAt` real) → tela de conclusão simples: "Sessão concluída", duração planejada, número de etapas concluídas, `Voltar ao conteúdo`. **Nenhuma métrica inventada** (seção 34). Não tocar na Chama do Conhecimento (seção 35).
- Verificação (seção 58): concluir, recarregar, sessão continua `completed`; ContentDetail volta a oferecer "Modo Foco" (nova sessão), não "Continuar".
- Commit 7: `feat: adicionar conclusão das sessões de foco`

### Bloco E — Auxílio contextual

**T15 — "Me perdi" (local, sem Gemini)**
- Ação discreta no rodapé do step: abre sheet com recapitulação montada da própria sessão (título do step anterior + trecho inicial do conteúdo + "Você está na etapa N de M"). Sem rede, sem chat.
- Verificação: **MF-75..MF-76** (função pura de recapitulação; no step 1 usa o próprio step, sem quebrar).

**T16 — "Outro jeito" (Gemini leve)**
- Novo `api/rephrase.js` + rota em `API_ROUTES` do `vite.config.js`; novo builder em `lib/rephrasePrompts.js` reutilizando `buildPreferenceBlock` de `lib/prompts.js` e `requestJson`/`GeminiError` de `lib/gemini.js`. Payload: apenas `{ title, content, preferences }`, com limite de caracteres. **Sem imagem, sem Content inteiro, sem histórico, sem nova FocusSession.**
- No cliente: função em `focusModeService.js` (mesmo padrão de `requestFocusPlan`), resultado exibido no sheet, uma chamada por toque, com loading e erro tratados. Não altera a sessão persistida.
- Verificação: **MF-77..MF-79** (sanitização do payload; `FocusError` por tipo de falha; ausência de chave → erro tratado) + teste manual com Gemini real.
- Commit 8: `feat: adicionar apoio contextual durante as sessões de foco`

### Bloco F — Qualidade

**T17 — Responsividade, acessibilidade e Modo Inclusão na apresentação**
- Áreas de toque ≥ 44 px, `aria-label` nos ícones, foco visível (já há `:focus-visible` global), progresso com texto, navegação por teclado no sheet (o `Modal` já traz focus trap e Esc).
- Preferências já persistidas (`getPreferenceOptions()`, mesmo padrão de `ContentBlocks.jsx`): `longText` → mais espaçamento e largura de leitura; `concentration` → remover qualquer elemento secundário do step. **Sem novo diagnóstico, sem nova lógica de preferências.**
- Verificação (seção 39): larguras 320 / 375 / desktop dentro do `PhoneFrame`.

**T18 — Regressão (seção 61)**
- `npm run test:data` completo, `npm run build`, e passagem manual: Câmera → Content; Modo Inclusão → Content; Content → Flashcards / Quiz / Perguntas; Biblioteca; Evolution; Chama; Study Vision+; exclusão de conteúdo (cascata de `focusSessions`).
- Testes de erro (seção 60): sessão inexistente, content inexistente, sessão corrompida no `localStorage`, `currentStepIndex` fora do intervalo — nenhuma tela branca.
- Correções que surgirem entram aqui antes do último commit.
- Commit 9 (se necessário): `fix: corrigir problemas encontrados na validação do modo foco`

---

## Arquivos

**Novos**
- `src/hooks/useFocusSession.js` — ponte componente ↔ services
- `src/screens/FocusScreen.jsx` — Focus Lock
- `src/components/study/FocusEntryCard.jsx` — entrada/estado no ContentDetail
- `src/components/study/FocusDurationSheet.jsx` — seleção 2/5/10
- `src/components/study/FocusStepRenderer.jsx` — renderiza um step
- `src/components/study/FocusHelpSheet.jsx` — "Me perdi" / "Outro jeito"
- `api/rephrase.js`, `lib/rephrasePrompts.js` — endpoint leve de reexplicação

**Modificados**
- `src/data/models/focusSession.js`, `src/data/models/validate.js` — campos de timer
- `src/services/focusSessionService.js` — operações de timer
- `src/services/focusModeService.js` — cliente de `/api/rephrase`
- `src/App.jsx` — tela `"focus"` e ocultação do BottomNav
- `src/screens/ContentDetailScreen.jsx` — entrada do Modo Foco
- `vite.config.js` — rota `/api/rephrase`
- `scripts/test-data-layer.mjs` — MF-55 em diante

**Não tocar:** Chama do Conhecimento, Evolution, Study Vision+, Quiz analytics, sistema de preferências, pipeline de imagem.

---

## Verificação final (fluxo obrigatório, seção 63)

Com `npm run dev` e a aba Network filtrando `focus`:

Content → Modo Foco → 5 min → sessão gerada (**1** chamada a `/api/focus`) → Focus Lock → step 1 → 2 → 3 → sair → Content mostra "Continuar" → Continuar → **mesmo step 3, mesmo `session.id`, 0 chamadas** → concluir → `status: "completed"` + `completedAt` → voltar ao conteúdo → reload → continua `completed`.

Comandos: `npm run test:data` (esperado: todos verdes, ≥ 274 testes), `npm run build`, e `npm run test:focus` apenas uma vez ao validar `/api/rephrase`.

---

## Skills a usar durante a execução

| Momento | Skill | Para quê |
|---|---|---|
| Início da execução | `superpowers:executing-plans` | Executar este plano tarefa a tarefa, com checkpoint de revisão entre elas — casa com a regra "não passar para a próxima sem validar". |
| Tarefas com lógica (T1, T2, T3, T5, T8, T9, T15, T16) | `superpowers:test-driven-development` | Escrever os testes MF-xx **antes** da implementação, no runner já existente (`scripts/test-data-layer.mjs`). |
| Qualquer bug, teste vermelho ou comportamento inesperado | `superpowers:systematic-debugging` | Investigar causa raiz antes de propor correção — especialmente nos pontos de risco: timer duplicado, retomada chamando Gemini, persistência do `currentStepIndex`. |
| T4, T7, T8 (telas e componentes novos) | `frontend-design` + `ui-ux-pro-max` | Direção visual do Focus Lock coerente com a identidade do Study Vision (tokens de `src/styles/tokens.css`), hierarquia e padrões de UX mobile. |
| T17 (acessibilidade e responsividade) | `ui-ux-pro-max` | Checklist de acessibilidade (área de toque, contraste, labels, foco visível, progresso textual). |
| Antes de cada commit | `superpowers:verification-before-completion` | Proibir alegação de "pronto" sem saída real de `npm run test:data` e `npm run build`. |
| Após T14 e ao final (T18) | `superpowers:requesting-code-review` ou `/code-review` | Revisão do diff antes de fechar os blocos C/D e antes do commit final. |
| Validação visual do fluxo | `run` | Subir o app e confirmar o fluxo completo na tela, não só nos testes. |

Skills deliberadamente **não** usadas: `superpowers:brainstorming` (requisitos já fechados neste plano), `caveman:caveman-commit` (mensagens precisam ser Conventional Commits em português, não caveman), `superpowers:using-git-worktrees` (a branch `feat/modo-foco-motor` já está isolada).

---

## Git

Antes do primeiro commit, confirmar no repositório (sem `--global`):

```
git config user.name "zackdevbr"
git config user.email "contatoisacn@gmail.com"
```

Conventional Commits em português, sem Co-Author, sem menção a IA, sem `amend`/`force push`. Commits apenas após a validação da tarefa correspondente.

---

## Fora de escopo (apenas registrar no relatório)

Ler Comigo, voz/SpeechSynthesis, OCR, Pomodoro, notificações, gamificação, novo dashboard, duração customizada, chatbot/tutor, integração da FocusSession com a Chama.
