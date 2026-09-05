# Fase 6 — Integração final, IA real e preparação para entrega (Study Vision)

## Contexto

As Fases 1–5 entregaram, nesta ordem: modelo relacional em `localStorage["sv_db"]` v2 com `Content` no centro (F1), telas ligadas à camada real e remoção do adaptador legado (F2), aprendizado/desempenho/revisões por desempenho (F3), Biblioteca e Calendário reais (F4), Evolução e Study Vision+ com trial que expira (F5). Hoje: 93 cenários em `npm run test:data`, build verde, 186 commits.

A auditoria completa feita para esta fase mostrou que **grande parte do briefing da Fase 6 já está implementada**:

- A IA **já é real**: `CameraScreen` → `useAnalysis` → `POST /api/analyze` (Vercel Function) → `lib/gemini.js` (`@google/genai`) → normalização em `studyVisionService.normalizeAnalysisResult` → `Content`. Uma única chamada multimodal produz título, matéria, tópico, resumo, conceitos, palavras-chave, flashcards, questões abertas e quiz.
- A chave **nunca chega ao frontend**: só `process.env.GEMINI_API_KEY`, lida em `lib/gemini.js:19,28`. Zero `import.meta.env` em `src/`. `.env*` ignorado, sem histórico de commit de `.env`/`.env.local`.
- "Horas estudadas" **nunca existiu** (zero ocorrências no repositório) — decisão de produto registrada em `MOCKS.md`.
- Mocks de dado já foram removidos nas fases anteriores; sobra `notionService.js` (mantido por decisão do usuário, ver Decisões).
- Persistência já é centralizada em `src/data/storage/`, com cascade em `deleteContent` e varredura de órfãos em `sweepOrphans()`.

O que **falta** para o produto virar uma experiência única — e é exatamente o trabalho desta fase — são lacunas de UI e de fechamento: não existe UI de notas do estudante (`content.notes` e `updateNotes` estão prontos e sem consumidor), não existe múltiplas fotos por Content nem visualização ampliada, a mensagem de "imagem sem conteúdo acadêmico" não é diferenciada de erro genérico, quiz e flashcards sem itens caem em "0 de 0" em vez de estado vazio, a tela de Evolução não reage ao store, há botões decorativos sem função na câmera, componentes e campos órfãos, e o README/PRD estão desatualizados.

Ao final desta fase, o fluxo câmera → IA → Content → Biblioteca → estudo → tentativas → desempenho → revisões → calendário → evolução → Study Vision+ deve rodar de ponta a ponta sobre os mesmos dados, sem sistema paralelo em nenhuma etapa.

### Decisões tomadas com o usuário

| # | Decisão |
|---|---|
| 1 | **Moldura de protótipo permanece.** O app continua em 375×812 centralizado; a Fase 6 pole 320/375/430px reais e apenas garante que nada é cortado em tablet/desktop. Sem layout fluido, sem redesenho das 11 telas. |
| 2 | **`notionService` continua como está.** O botão "Enviar ao Notion" e o toast de sucesso ficam no produto como parte da demo do pitch. Fica sendo a **única exceção declarada** ao item 27 do briefing, registrada em `MOCKS.md` e no README. |
| 3 | **Controles falsos da câmera saem.** HDR, Flip, 4:3, Settings e o botão de Flash (que nunca aciona a lanterna) são removidos. Não se implementa flip nem torch. |
| 4 | **Long-press de reset do PLUS permanece.** É o gesto usado para demonstrar o trial na apresentação. |
| 5 | **StatusBar mantém 9:41.** Faz parte da moldura decorativa do protótipo, não é métrica. |
| 6 | **Vision+ ganha entradas novas.** O botão "Vision+" do header da Biblioteca (`LibraryScreen.jsx:122-126`) passa a existir também no header de Revisão e de Evolução; a Evolução ganha, no fim do scroll, o CTA de assinatura (`PlusFinalCta`) como era na antiga tela do Study Vision+. |
| 7 | **Nenhuma funcionalidade nova além dessas.** Item 48 do briefing: melhoria identificada e não essencial vira anotação, não código. |

---

## Auditoria — o que já existe (não recriar)

**Modelos** (`src/data/models/`) — `content.js` (Content, Image, OpenQuestion, Mastery), `subject.js`, `flashcard.js` (Flashcard + FlashcardAttempt), `quiz.js` (Quiz, Question, QuizAttempt), `review.js`, `event.js` (`EVENT_TYPES`, `EVENT_TYPE_META`), `validate.js`. `Content.images[]` **já é array** e `createContent` reancora `contentId` nos filhos.

**Storage** — `db.js` (`sv_db`, `SCHEMA_VERSION 2`, poda por cota `pruned`/`no-photo`), `index.js` (`ensureMigrated()` antes de toda leitura **e** escrita), `migrations.js` (v1→v2, `sv_items` preservado em `sv_items_backup_v1`).

**Services já prontos** (`src/services/`): `contentService` (inclui `addImageToContent`, `removeImageFromContent`, `reorderImages`, `updateNotes`, `moveContentToSubject`, `deleteContent` com cascade), `subjectService`, `studyService` (`registerActivity` como orquestrador único), `reviewService` (`REVIEW_INTERVALS`, no máximo uma pendente por conteúdo), `performanceService`, `evolutionService`, `eventService`, `calendarService`, `subscriptionService`, `integrityService.sweepOrphans()`, `exportService` (PDF real via jsPDF), `notionService` (mock mantido).

**IA** — `api/analyze.js` (valida método, data URL, 6 MB, normaliza `openQuestions`/`quiz[].answer`, checa forma e devolve 502 em resposta inválida), `lib/gemini.js` (timeout 45 s, `GeminiError` com `MISSING_KEY|UPSTREAM|BAD_JSON`), `lib/prompts.js` (o prompt **já instrui** `success:false` + `error` para imagem sem conteúdo educacional), `src/services/studyVisionService.js`, `src/hooks/useAnalysis.js` (AbortController por execução, aborta a anterior).

**Estado React** — `ContentStoreContext` (`contents`, `subjects`, `reviews`, `events`, `mutate`, `dueCount`), `useNavigation` (máquina de estados, sem react-router), `useSubscription`, `useToast`.

**Componentes reutilizáveis** — `ui/`: `Card`, `Modal` (foco-trap + Esc + portal), `Button`, `EmptyState`, `Badge`, `ConfirmDialog`, `SectionLabel`, `ProgressBar`, `ProgressRing`, `SparkChart`, `Toast`, `SubjectFolderGrid`. `study/`: 14 componentes, todos em uso. `plus/`: 10, incluindo `PlusFinalCta` e `PlusPaywall`.

**Utilitários** — `utils/image.js` (`captureFrame` maxSide 1280 q0.8, `makeThumbnail` maxSide 640 q0.6), `utils/id.js`, `utils/date.js`, `utils/search.js` (`matchesQuery`).

**Testes** — runner caseiro `scripts/test-data-layer.mjs` (93 cenários, `node:assert/strict`, `MemoryStorage`), `npm run test:data`. Sem framework de UI e **não se instala nenhum nesta fase**.

### Bugs e lacunas confirmadas na auditoria (são o trabalho da fase)

| # | Problema | Onde |
|---|---|---|
| B1 | `content.notes` e `updateNotes()` existem e **nenhuma tela lê ou escreve** — o estudante não tem onde anotar (briefing §12) | `contentService.js:106`, `ContentBlocks.jsx` (sem bloco de notas) |
| B2 | Não há UI de **múltiplas fotos**: o fluxo captura exatamente 1 frame e `CapturedPageVisual` só lê `images[0]` (briefing §11) | `CameraScreen.jsx:69-77`, `CapturedPageVisual.jsx:100` |
| B3 | Não há **visualização ampliada** da foto (briefing §37, passo 18) | — |
| B4 | Não há UI para **editar título e resumo** do Content (briefing §12 e §39) | `ContentDetailScreen.jsx` |
| B5 ▲ | Imagem sem conteúdo acadêmico volta `success:false` do backend mas a UI mostra o **mesmo erro genérico** de falha técnica (briefing §10) | `studyVisionService.js:40`, `AnalysisScreen.jsx:19-39` |
| B6 ▲ | Quiz sem questões cai em `done` na primeira render e exibe "Você acertou 0 de 0" em vez de estado vazio | `QuizScreen.jsx:38,107` |
| B7 ▲ | Flashcards com deck vazio exibe "Sessão concluída · 0 revisados" em vez de estado vazio | `FlashcardsScreen.jsx` |
| B8 ▲ | `SummaryScreen` só renderiza `null` quando não há `capturedContent` — tela branca sem explicação nem saída | `SummaryScreen.jsx:22` |
| B9 ▲ | `EvolutionScreen` **não consome `useContentStore`**: lê o DB por services no corpo do componente e não re-renderiza quando o store muda | `EvolutionScreen.jsx:38-45` |
| B10 | `ContentDetailScreen` chama 5 services direto na render, sem `useMemo` — recalcula tudo a cada re-render | `ContentDetailScreen.jsx:29-41` |
| B11 ▲ | Passo `"generating"` do `AnalysisScreen` nunca corresponde a um status emitido; `"uploading"` é sobrescrito imediatamente, então o passo 1 é invisível | `AnalysisScreen.jsx:9,41`, `useAnalysis.js:26,29` |
| B12 | Quiz usa apenas `content.quizzes[0]`; quizzes 2..N são inalcançáveis pela UI | `QuizScreen.jsx:30` |
| B13 | Controles decorativos sem handler: HDR, Settings, 4:3, Flip; `flash` alterna cor e não toca `torch` | `CameraScreen.jsx:125-133,141-149,196-198` |
| B14 | `content.isSample` é escrito em três lugares e **nunca lido** — lastro dos seeds removidos | `content.js:83`, `migrations.js:82`, `studyVisionService.js:94` |
| B15 | Componentes órfãos: `layout/ScreenHeader.jsx`, `ui/BackButton.jsx`, `ui/FilterPills.jsx` (+ 3 `.module.css`) e `data/models/attempt.js` (re-export sem consumidor) | — |
| B16 | Assets órfãos: `src/assets/exemplo-foto1.png`, `exemplo2_fisica.jpg`, `exemplo3_portugues.jpg` | — |
| B17 | Imports não usados: `newId` e `readDb` | `migrations.js:7`, `integrityService.js:7` |
| B18 | `ANALYSIS_SCHEMA` exportado e nunca importado (resíduo da remoção do `responseSchema`) | `lib/prompts.js:63-103` |
| B19 | `PerformanceChart` e `SubjectProgress` ainda aceitam `locked`/`onStartTrial`, mas o único chamador passa `locked={false}` — caminho bloqueado é código morto | `EvolutionScreen.jsx:100,102` |
| B20 | `responseTimeMs` é medido e persistido em toda tentativa de flashcard e **nenhuma tela lê** | `FlashcardsScreen.jsx:59` |
| B21 | PRD §7 declara "PDF mockado" e Notion/Calendar mockados — desatualizado desde a Fase 2 | `PRD.md` §7 |
| B22 | Botões de ícone dos modais têm alvo de toque de 28×28 / `padding:4`, abaixo dos 44px usados no resto do app | `DayEventsModal.jsx:26,46,52`, `CommitmentsSection.jsx:43,47`, `EventFormModal.jsx:48` |

▲ = falha silenciosa: acontece sem erro visível.

---

## Regras de execução (valem para todas as tarefas)

1. **Uma tarefa por vez.** Não começar a próxima antes de a atual estar verificada.
2. Ao fim de cada tarefa: `npm run test:data` verde **e** `npm run build` verde. Tarefa de UI exige também verificação no browser (`npm run dev`).
3. Bug encontrado durante uma tarefa é corrigido **dentro dela**, antes do commit. Nada de "corrijo depois".
4. **Um commit por tarefa**, Conventional Commits com tipo em inglês e descrição em português, sem acentos, escopo `fase-6`. **Sem `Co-Authored-By`, sem menção a Claude/IA na mensagem ou no corpo.** Sem `--no-verify`. Branch `main`.
5. **Nenhum dado mockado novo, nenhuma métrica inventada, nenhum ponto de gráfico fabricado.** Sem dado, o estado é vazio (`null` → "Sem dados ainda", nunca `0%`).
6. Nenhuma métrica é calculada dentro de componente React — tudo vem dos services.
7. Nenhum módulo além de `src/data/storage/` toca `localStorage` (exceção histórica documentada: `subscriptionService`).
8. **Não instalar dependências novas.** Não criar telas novas. Não criar segundo modelo de Content.
9. Uma captura = **uma** chamada de IA. Nenhuma tela pode disparar `/api/analyze` ao abrir.
10. Não tocar em cobrança real, backend de dados, autenticação, gamificação ou APIs externas novas.

---

## Tarefas

### T0 — Salvar o plano na raiz

Copiar este plano para `PLANO-FASE-6-INTEGRACAO-FINAL.md` na raiz do projeto, no mesmo padrão das Fases 4 e 5.

**Verificação:** arquivo existe na raiz e aparece em `git status`.

**Commit:** `docs(fase-6): documenta plano de integracao final e ia real`

---

## Bloco A — IA, captura e Content completo

### T1 — Erro de imagem sem conteúdo acadêmico

O backend já devolve `{ success: false, error }` quando a imagem não tem conteúdo educacional legível (`lib/prompts.js:15-17`), mas `studyVisionService.js:40` colapsa isso no `GENERIC_ERROR`. Diferenciar: `AnalysisError` ganha um `kind` (`"not_academic"` vs `"technical"`), preservando a frase curta vinda da IA. `useAnalysis` propaga o `kind`. `AnalysisScreen` mostra copy própria — "Essa imagem não parece conter um conteúdo de estudo." — com as ações **Tirar outra foto** e **Tentar novamente**, contra a copy técnica atual ("Não conseguimos analisar esta imagem. Verifique sua conexão e tente novamente.") para os demais casos.

**Verificação (browser):** fotografar uma paisagem/parede e confirmar a mensagem não-acadêmica; desligar a rede e confirmar a mensagem técnica; conferir que nenhum Content é criado nos dois casos.

**Commit:** `feat(fase-6): distingue imagem sem conteudo academico de falha tecnica na analise`

---

### T2 — Estados da análise e loading honesto

Corrigir B11: alinhar `STEPS` do `AnalysisScreen` aos status realmente emitidos por `useAnalysis` (`idle|uploading|analyzing|done|error`) — ou eliminar o passo fantasma `"generating"`, ou fazer `useAnalysis` emitir `uploading` de forma observável enquanto o thumbnail é gerado. Nunca deixar a tela sem progresso visível. Garantir que o estado de erro sempre encerra o loading (sem loading infinito em timeout de 45 s, `!response.ok`, `AbortError` e `BAD_JSON`).

**Verificação (browser):** capturar com rede lenta (throttling) e observar os passos avançando; simular timeout e confirmar que a tela sai do loading com ação de retry.

**Commit:** `fix(fase-6): alinha passos da analise aos estados reais e evita loading infinito`

---

### T3 — Múltiplas fotos por Content

Ligar `addImageToContent` / `removeImageFromContent` (já existentes em `contentService.js:67-90`) à UI. No `ContentDetailScreen`, bloco de fotos com miniaturas de `content.images` ordenadas por `order`, botão **Adicionar foto** que abre a câmera em modo "anexar" (`App.jsx` guarda o `contentId` alvo e, ao capturar, chama `addImageToContent` **sem** disparar `/api/analyze`) e ação de remover foto com `ConfirmDialog`. `CapturedPageVisual` continua mostrando `images[0]` como capa. Tratar `result.ok === false` da poda por cota com toast (o mesmo texto já usado em `SummaryScreen.jsx:49`).

**Verificação (browser):** adicionar duas páginas a um Content existente, recarregar, confirmar 3 fotos no mesmo `contentId` e **nenhum** Content novo criado; conferir na aba Network que nenhuma chamada a `/api/analyze` foi feita ao anexar.

**Commit:** `feat(fase-6): permite anexar e remover fotos adicionais no mesmo conteudo`

---

### T4 — Foto em tamanho maior

Visualizador simples reaproveitando `ui/Modal` (já tem foco-trap, Esc e backdrop): toque na miniatura abre a foto ampliada dentro da moldura, com `aria-label` e botão de fechar de no mínimo 44px. Navegação entre fotos quando houver mais de uma.

**Verificação (browser):** abrir cada foto de um Content com 3 imagens, fechar por Esc, por backdrop e pelo botão; conferir que a imagem não estoura a moldura em 320px.

**Commit:** `feat(fase-6): abre foto do conteudo em tamanho maior`

---

### T5 — Notas do estudante

Corrigir B1. Bloco **MINHAS NOTAS** no `ContentDetailScreen`, separado e visualmente distinto do **RESUMO INTELIGENTE** da IA (`ContentBlocks.jsx:22-24`), gravando por `updateNotes(contentId, texto)` via `mutate`. Salvamento explícito (botão) ou blur com feedback — nunca a cada tecla. Empty state: "Adicione suas anotações sobre este conteúdo." Os dois campos nunca se misturam nem se sobrescrevem.

**Verificação (browser):** escrever uma nota, recarregar a aplicação e confirmar que ela persiste; confirmar que o resumo da IA continua intacto.

**Commit:** `feat(fase-6): adiciona bloco de notas do estudante no conteudo`

---

### T6 — Editar título e resumo

Corrigir B4. Edição inline do título e do resumo da IA no `ContentDetailScreen`, persistindo por `updateContent(id, patch)` (`contentService.js:27`), que já descarta `id`/`createdAt` do patch. Título vazio é rejeitado com mensagem, não salvo em branco.

**Verificação (browser):** renomear um conteúdo, conferir o novo nome na Biblioteca, na busca e no evento vinculado; editar o resumo e recarregar.

**Commit:** `feat(fase-6): permite editar titulo e resumo do conteudo`

---

### T7 — Estados vazios em Quiz, Flashcards, Perguntas e Resumo

Corrigir B6, B7, B8. Quiz sem questões e deck de flashcards vazio passam a exibir `EmptyState` com CTA de volta ao conteúdo, em vez de "0 de 0" / "0 revisados". `QuestionsScreen` sem `openQuestions` idem. `SummaryScreen` sem `capturedContent` mostra estado explicativo com botão de voltar à câmera, em vez de `return null`. Aproveitar B12 aqui: o Quiz passa a considerar todos os `content.quizzes` (ou fica documentado, no código, por que só o primeiro é usado).

**Verificação (browser):** criar um Content cuja IA não gerou quiz (ou remover o quiz via DevTools) e abrir cada uma das quatro telas; nenhuma pode mostrar placar/contagem falsa.

**Commit:** `fix(fase-6): adiciona estados vazios em quiz flashcards perguntas e resumo`

---

### T8 — Anti-duplicação de captura e salvamento

Auditar e blindar os pontos do briefing §34: duplo toque em "Salvar" (`SummaryScreen.jsx:31-33` já tem guarda `saving`, confirmar que cobre o re-render), reload da tela de resumo não cria segundo Content, abrir um Content não gera flashcards nem quiz novos, e iniciar análise não dispara duas chamadas simultâneas (`useAnalysis.js:20-22` já aborta a anterior — confirmar com teste). Cobrir com cenários no runner onde for testável fora do browser.

**Verificação (browser + teste):** clicar "Salvar" três vezes seguidas e confirmar 1 conteúdo na Biblioteca; abrir e fechar um Content cinco vezes e confirmar contagem estável de flashcards/quiz; Network sem chamada duplicada a `/api/analyze`.

**Commit:** `fix(fase-6): impede duplicacao de conteudo analise e material gerado`

---

### T9 — Limpar controles decorativos da câmera

Corrigir B13 conforme a decisão 3: remover HDR, Settings, 4:3, Flip e o botão de Flash junto com o estado `flash` não utilizado. Preservar o obturador, o atalho para a Biblioteca, o overlay de erro com "Tentar novamente" e o cleanup das tracks no unmount (`CameraScreen.jsx:49-55`).

**Verificação (browser):** abrir a câmera e confirmar que todo botão visível tem função; negar a permissão e conferir o overlay de erro; sair da tela e confirmar que a luz da câmera apaga.

**Commit:** `refactor(fase-6): remove controles decorativos sem funcao da camera`

---

## Bloco B — Integração de dados e integridade

### T10 — Evolução reativa ao store

Corrigir B9. `EvolutionScreen` passa a consumir `useContentStore()` e a derivar as chamadas de `evolutionService` em `useMemo` dependente do snapshot, para atualizar quando o usuário responde um quiz ou conclui uma review. Nenhum cálculo migra para o componente — só a reatividade muda.

**Verificação (browser):** responder um quiz, ir à Evolução e confirmar que "questões respondidas" e "taxa de acerto" já refletem a tentativa **sem** recarregar a página.

**Commit:** `fix(fase-6): faz a tela de evolucao reagir ao store de conteudos`

---

### T11 — Memoizar derivações do detalhe do conteúdo

Corrigir B10: envolver `getReviewsForContent`, `nextPendingReview`, `isContentDueForReview`, `getContentPerformance` e `getEventsForContent` em `useMemo` com dependência no conteúdo e no snapshot do store (`ContentDetailScreen.jsx:29-41`). Confirmar que nenhuma dessas leituras dispara IA.

**Verificação (browser + teste):** abrir o detalhe e alternar entre blocos; Network sem nenhuma chamada a `/api/analyze`; desempenho continua atualizando após responder um quiz.

**Commit:** `perf(fase-6): memoiza derivacoes do detalhe do conteudo`

---

### T12 — Auditoria de relacionamentos e exclusão

Executar e cobrir com teste a auditoria do briefing §24, §39 e §40 sobre o que já existe: `deleteContent` (cascade em reviews, tentativas de flashcard, tentativas de quiz, e remoção do `contentId` dos eventos, apagando o evento só quando fica sem nenhum conteúdo — `contentService.js:44-62`) e `sweepOrphans()` (`integrityService.js:9-55`). Corrigir o que a auditoria revelar. Nenhuma nova regra de negócio é inventada: evento que sobrevive à exclusão do conteúdo fica sem `contentId` inválido, conforme já implementado.

**Verificação (teste):** cenários novos criando um Content com fotos, flashcards, quiz, tentativas, review e evento vinculado; excluir e verificar zero referências órfãs, Biblioteca/Evolução/Calendário/Revisões íntegros.

**Commit:** `test(fase-6): cobre exclusao de conteudo e ausencia de referencias orfas`

---

### T13 — Teste de integridade do ciclo completo

Cenário de ponta a ponta no runner: criar Content → editar título → editar resumo → adicionar nota → adicionar foto → mover de matéria → registrar tentativa de quiz → registrar tentativa de flashcards → concluir review → criar e vincular evento. Ao final, o mesmo `contentId` mantém **todas** as relações e nenhuma informação some.

**Verificação (teste):** o cenário passa e os asserts cobrem cada relação individualmente.

**Commit:** `test(fase-6): cobre ciclo completo de integridade do conteudo`

---

### T14 — Testes de falha e dados inválidos

Cobrir o briefing §38 no que é testável sem browser: storage vazio, `sv_db` com JSON corrompido, Content inexistente, evento inexistente, matéria inexistente, usuário sem quizzes/flashcards/reviews/eventos/dados de evolução. A aplicação continua utilizável em todos. O que só dá para verificar no browser (rede indisponível, IA indisponível, imagem grande demais) fica como roteiro manual documentado na tarefa.

**Verificação (teste + browser):** suíte verde; roteiro manual executado com rede desligada e com imagem acima de 6 MB.

**Commit:** `test(fase-6): cobre estados de falha storage invalido e ausencia de dados`

---

## Bloco C — Study Vision+ e paywall

### T15 — Entradas do Vision+ em Revisão e Evolução

Decisão 6. Extrair o botão "Vision+" do header da Biblioteca (`LibraryScreen.jsx:122-126`) para um componente reutilizável e usá-lo no header do `ReviewScreen` e do `EvolutionScreen`, com o mesmo `onVisionPlus` já disponível via props do `App`.

**Verificação (browser):** o botão aparece nos três headers, navega para a tela Vision+ e volta pela pilha de navegação; alvo de toque mínimo de 44px em 320px.

**Commit:** `feat(fase-6): adiciona atalho do vision plus nas telas de revisao e evolucao`

---

### T16 — CTA de assinatura no fim da Evolução

Decisão 6. Reaproveitar `PlusFinalCta` (`components/plus/PlusFinalCta.jsx`) no fim do scroll da Evolução, exibido apenas para quem **não** é premium/trial, com `TRIAL_DAYS` (7) e `PLUS_PRICE_FULL` (R$ 9,90/mês) já vindos de `constants.js`. Não bloqueia nada do que já é gratuito.

**Verificação (browser):** como free, ver o CTA no fim da Evolução; iniciar o trial e confirmar que o CTA some; conferir que as seções gratuitas continuam íntegras nos dois estados.

**Commit:** `feat(fase-6): adiciona cta de assinatura no fim da tela de evolucao`

---

### T17 — Revisão do estado free / trial / premium

Auditar `subscriptionService` (`getSubscription` migra formato legado e expira trial vencido a cada leitura; `startTrial`, `resetToFree`, `isPremium`, `trialDaysRemaining`). Confirmar por teste: reload não reseta nem estende o trial; trial vencido vira `expired` e não `premium`; **mudar de plano não apaga nenhum dado acadêmico** (`sv_db` intocado). Limpar B19 aqui: remover as props `locked`/`onStartTrial` mortas de `PerformanceChart` e `SubjectProgress`.

**Verificação (teste + browser):** cenários de trial iniciado, trial expirado e volta para free; conferir que a contagem de conteúdos e as tentativas permanecem após cada troca.

**Commit:** `fix(fase-6): garante persistencia do trial e preserva dados academicos ao trocar de plano`

---

## Bloco D — Limpeza, segurança, responsividade e acessibilidade

### T18 — Remoção de código morto

Corrigir B14–B20: remover `isSample` dos três pontos de escrita, os órfãos `layout/ScreenHeader.jsx`, `ui/BackButton.jsx`, `ui/FilterPills.jsx` (+ `.module.css`), `data/models/attempt.js`, os três PNGs de exemplo em `src/assets/`, os imports não usados (`migrations.js:7`, `integrityService.js:7`) e `ANALYSIS_SCHEMA` de `lib/prompts.js`. Decidir e registrar o destino de `responseTimeMs` (manter gravando, documentado como base de futura métrica, **ou** parar de gravar — sem meio-termo silencioso). Não fazer refatoração estética: nada de reescrever estilos inline ou unificar `PlanningModal`/`EventFormModal` nesta fase.

**Verificação:** `grep -rn "isSample\|ScreenHeader\|FilterPills\|BackButton\|ANALYSIS_SCHEMA\|exemplo-foto" src lib api` sem resultado; `npm run build` e `npm run test:data` verdes.

**Commit:** `chore(fase-6): remove codigo morto componentes orfaos e imports nao usados`

---

### T19 — Auditoria de segurança

Verificar e registrar: nenhuma chave, token ou credencial em `src/`; zero `import.meta.env` no frontend; `GEMINI_API_KEY` lida apenas em `lib/gemini.js`; `.env*` ignorado com exceção de `.env.example`; nenhum `.env` no histórico do git (`git log --all -- .env .env.local` já confirmado vazio); mensagens de erro do endpoint permanecem genéricas para o cliente e detalhadas só em `console.error` do servidor. Confirmar que `dist/` não contém a chave.

**Verificação:** `grep -rni "api[_-]\?key\|secret\|token" src` sem segredo; `grep -r "GEMINI" dist` sem resultado após build; `git log --all --oneline -- .env .env.local` vazio.

**Commit:** `chore(fase-6): audita ausencia de segredos no frontend e no historico`

---

### T20 — Responsividade final (mobile primeiro)

Decisão 1. Percorrer as 11 telas em 320, 375, 430 e 768px, além de desktop, eliminando overflow horizontal, botão cortado, texto sobreposto e modal fora da moldura. Atenção especial a câmera, análise, detalhe do conteúdo, quiz, flashcards, calendário, gráficos e paywall. Não introduzir layout fluido nem redesenhar telas.

**Verificação (browser):** cada tela nas quatro larguras; nenhuma barra de rolagem horizontal; todo modal contido na moldura.

**Commit:** `fix(fase-6): corrige responsividade das telas em telas pequenas`

---

### T21 — Acessibilidade final

Revisar `aria-label` em botões de ícone, contraste dos textos secundários, ordem de foco e navegação por teclado nos modais (`Modal` já tem foco-trap), rótulos de formulário, mensagens de erro e feedback de sucesso, e informação que hoje depende só de cor (status de revisão, tipo de evento — garantir texto ou forma junto). Corrigir B22 elevando os alvos de toque dos ícones de modal para 44px.

**Verificação (browser):** percorrer Biblioteca → detalhe → quiz → calendário só pelo teclado; conferir que todo botão de ícone anuncia sua ação.

**Commit:** `fix(fase-6): melhora acessibilidade de foco rotulos e alvos de toque`

---

### T22 — Teste E2E manual do fluxo principal

Executar o roteiro de 38 passos do briefing §37 no browser, do zero (storage limpo), com foto real de conteúdo acadêmico, e registrar o resultado passo a passo no plano da raiz. Qualquer falha vira correção **dentro desta tarefa**, antes do commit. Também validar o briefing §41: abrir Biblioteca, Content, Evolução, Calendário e Vision+ não dispara nenhuma chamada a `/api/analyze` (aba Network limpa).

**Verificação (browser):** os 38 passos concluídos, com anotação explícita de qualquer passo que não passou e por quê.

**Commit:** `test(fase-6): registra execucao do fluxo e2e completo`

---

### T23 — Documentação final

Atualizar:
- **README.md** — o que é o Study Vision, problema, solução, público-alvo, funcionalidades, arquitetura frontend/backend, tecnologias, **fluxo completo da IA** (frontend → `/api/analyze` → Gemini → JSON → normalização → Content), configuração de `GEMINI_API_KEY` (onde configurar, que não se commita, que o frontend nunca recebe a chave), como executar localmente, como funciona a persistência, modelo de negócio e Study Vision+, e limitações do protótipo. Sem chave real em lugar nenhum.
- **PRD.md** — corrigir §7 (B21: PDF e calendário já são reais), preencher §12 "Próximos passos" e atualizar o changelog com a Fase 6.
- **MOCKS.md** — registrar o que passou a ser real na Fase 6 e a exceção declarada do `notionService` (decisão 2).
- **`.env.example`** — conferir que documenta `GEMINI_API_KEY` e `GEMINI_MODEL`.

**Verificação:** ler os três documentos do começo ao fim conferindo contra o código; `grep -rn "AIza" *.md` sem resultado.

**Commit:** `docs(fase-6): atualiza readme prd e mocks com a integracao final`

---

## Verificação final da fase

1. `npm run test:data` verde, com a contagem final anotada (93 atuais + os novos cenários `F6-*`).
2. `npm run build` verde.
3. Fluxo completo executado do zero: câmera → captura → IA real → Content → Biblioteca → estudo → tentativas → desempenho → review → calendário → evolução → Vision+.
4. Recarregar a aplicação em cada etapa e confirmar persistência.
5. Nenhum `/api/analyze` disparado por abrir Biblioteca, Content, Evolução, Calendário ou Vision+.
6. Nenhuma métrica exibida sem origem real; nenhuma "hora de estudo" em lugar nenhum.
7. Nenhum segredo no frontend, no `dist/` ou no histórico do git.
8. Todas as telas em 320/375/430/768px sem overflow horizontal.
9. README, PRD e MOCKS conferidos contra o código.
10. Relatório final de 21 itens do briefing §50, incluindo o que **não** foi implementado e por quê — sem simular conclusão.

---

## Fora de escopo

Cobrança real, gateway de pagamento, contas de usuário, autenticação, backend de dados, sync entre dispositivos, OCR dedicado (Tesseract), resolução passo a passo de exercícios pela IA, OAuth real de Notion ou Google Calendar, exportação DOCX, compartilhamento nativo, gamificação, ranking, social, novas dependências, novas telas, layout fluido para desktop, refatoração estética de estilos inline, unificação de `PlanningModal` com `EventFormModal`, e qualquer métrica de tempo de estudo. Melhoria identificada durante a execução e não essencial à integração vira anotação no PRD §12, não código.
