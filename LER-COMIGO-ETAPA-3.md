# LER COMIGO — ETAPA 3: Leitura Guiada do Conteúdo

> Ao iniciar a execução, salvar este documento como `LER-COMIGO-ETAPA-3.md` na raiz do projeto (mesmo padrão de `MODO-FOCO-ETAPA-1.md` / `MODO-FOCO-ETAPA-2.md`).

## Contexto

O Study Vision já entrega câmera → análise Gemini → `Content`, e sobre esse conteúdo já existem Biblioteca, Flashcards, Quiz, Reviews, Evolution, Chama, Study Vision+, Modo Inclusão e Modo Foco (Etapas 1 e 2 concluídas e commitadas em `feat/modo-foco-motor`).

Falta uma ferramenta de **acessibilidade de leitura**: hoje o estudante que tem dificuldade com textos longos ou de concentração precisa ler a parede de texto do resumo sozinho. Esta etapa entrega o **Ler Comigo**: leitura guiada, um trecho por vez, narrada pela Web Speech API nativa do navegador, com progresso persistido e auxílio contextual do Gemini ("Me perdi" / "Outro jeito").

O Ler Comigo lê **o texto que o Study Vision já gerou** — nunca a imagem, nunca OCR, nunca reprocessamento multimodal. `grep` confirma: hoje o projeto tem **zero** uso de `speechSynthesis` (única ocorrência é a linha "fora de escopo" em `MODO-FOCO-ETAPA-2.md:245`), e nenhuma dependência de áudio no `package.json`.

Resultado esperado: abrir um conteúdo → "Ler Comigo" → ouvir e acompanhar trecho a trecho → pausar/avançar/voltar/mudar velocidade → pedir ajuda → sair (áudio para na hora) → voltar depois no mesmo trecho.

---

## Auditoria (arquitetura real encontrada)

### Fonte do texto — modelo `Content`

`src/data/models/content.js:47` → `createContent(input)`. Campos textuais **reais**:

| Campo | Origem | Uso no Ler Comigo |
|---|---|---|
| `summary` | Gemini, já adaptado às preferências de inclusão | **fonte primária** |
| `keyConcepts[]` | Gemini | bloco complementar, após o resumo |
| `extractedText` | texto cru extraído da imagem | **fallback apenas** se não houver `summary`/`keyConcepts` |
| `notes` | digitado pelo usuário | não é lido (não é conteúdo acadêmico gerado) |
| `title` / `topic` / `subjectName` | metadados | só cabeçalho da tela, nunca narrados |
| `flashcards`, `quizzes`, `openQuestions`, `mastery`, `reviewPlan`, `images`, `id`, datas | estruturais | **nunca** entram na leitura |

Fluxo de criação: `src/services/studyVisionService.js:75` (`normalizeAnalysisResult`) → `src/screens/SummaryScreen.jsx:63` (`createContentEntry`). O Ler Comigo entra **depois** disso e só lê o que já está persistido.

### Persistência

- `src/data/storage/db.js` — chave única `sv_db`, `SCHEMA_VERSION = 2`, coleções de topo (`contents`, `reviews`, `focusSessions`, …), `readDb/writeDb/withDb`, coerção defensiva por coleção, poda de emergência em `QuotaExceededError`.
- `src/data/storage/index.js` — `ensureMigrated()` antes de qualquer acesso. Nenhum componente chama `localStorage` direto.
- Comentário em `db.js:61-70` documenta a decisão (reaproveitável aqui): **coleção nova de topo não exige bump de `SCHEMA_VERSION`**, porque `readDb()` nunca ramifica por versão e array vazio para chave ausente é retrocompatível por construção.
- IDs: `src/utils/id.js` — `newId(prefix)` + tabela `ID_PREFIX`.

### Modo Foco (referência de padrão, **não** refatorar)

| Camada | Arquivo | O que reaproveitamos como *padrão* |
|---|---|---|
| Persistência | `src/services/focusSessionService.js` | forma do service: só storage, zero rede, `updateSession(id, updater)`, operações idempotentes |
| Orquestração | `src/services/focusModeService.js` | `FocusError(kind)`, `buildFocusPayload`, `hasEnoughContent`, `requestRephrase`, dedupe `inFlight` |
| Hook | `src/hooks/useFocusSession.js` | `{ session, status: idle\|loading\|ready\|error, error }` + `focusErrorMessage(kind)`; **nota crítica em `:73-80`**: nunca usar a forma-função de `setState` quando o updater escreve em storage (StrictMode duplica a escrita) |
| Tela imersiva | `src/screens/FocusScreen.jsx` | header mínimo (sair 44×44 com `aria-label`, título truncado), `ProgressBar` + texto "Etapa X de Y", `AnimatePresence mode="wait"` com `key={index}`, `ConfirmDialog` de saída, telas terminais desenhadas (nunca tela branca) |
| Entrada | `src/components/study/FocusEntryCard.jsx` | três estados: sem progresso / com progresso ("Você parou na etapa N de M" + Continuar) / conteúdo insuficiente |
| Ajuda | `src/components/study/FocusHelpSheet.jsx` | folha isolada, uma pergunta por toque, `loading\|done\|error`, sem thread de conversa |
| Backend | `api/rephrase.js` + `lib/rephrasePrompts.js` | endpoint leve: payload textual mínimo, `sanitizePreferences`, limites de caracteres, `GeminiError` → mensagem tratada |

**Focus Lock** não é um componente: é a lista literal em `src/App.jsx:105` — `showNav = !["camera","analysis","focus"].includes(screen)` — que também zera o `paddingBottom` (`:116`) e esconde o `<BottomNav>` (`:222`). `navActive` (`:96-99`) mapeia a tela para o item destacado.

### Modo Inclusão (consumir, não reimplementar)

- Chaves canônicas — `src/constants.js:51`: `["concentration", "longText", "complexContent", "manySteps"]`. Metadados em `LEARNING_PREFERENCE_META`.
- Porta única: `src/services/learningPreferencesService.js` → `getPreferenceOptions()`, `getLearningPreferences()`, `normalizePreferenceOptions()`, `hasActivePreference()`.
- Efeitos de UI hoje: `longText` → `readingStyles()` em `src/components/study/ContentBlocks.jsx:16-27` (fontSize 14→15, lineHeight 1.75→2.05) e `FocusStepRenderer.jsx:36-37`; `concentration` → esconde o rodapé de ajuda em `FocusScreen.jsx:186`. `complexContent` e `manySteps` hoje só afetam prompt.
- Backend replica as chaves em `lib/prompts.js:69` com teste de paridade no runner.

### Gemini

- Endpoints em `api/` (Serverless na Vercel; em dev, plugin do Vite). `vite.config.js:11-15` — `API_ROUTES` com **match exato**; adicionar endpoint = criar `api/<nome>.js` **e** uma linha em `API_ROUTES`.
- `lib/gemini.js` — `isConfigured()`, `GeminiError` (`MISSING_KEY|UPSTREAM|BAD_JSON`), `generateRephrase({prompt})`, `parseModelJson`, `repairJson`. Chave `GEMINI_API_KEY` só em `process.env` (sem prefixo `VITE_`, nunca chega ao frontend).
- `lib/prompts.js` — `buildPreferenceBlock(preferences)`, `sanitizePreferences(raw)`.

### Testes

Runner caseiro em Node puro, sem framework: `scripts/test-data-layer.mjs` (`npm run test:data`), com `test()`/`testAsync()`, `MemoryStorage` shim de `localStorage`, `resetDb()`, `blockNetwork()`, `fakeTransport()`. Baseline atual: **271 testes**, prefixos por fase (`MF-01..MF-79` para o Modo Foco). Verificação live opcional: `npm run test:focus`.

---

## Decisões desta etapa

1. **Fonte da leitura, em ordem fixa e explícita:** `summary` → `keyConcepts[]` (como bloco "Conceitos-chave") → fallback `extractedText` **apenas** se os dois primeiros estiverem vazios. `notes` e todo campo estrutural ficam fora. Nenhuma leitura de imagem, OCR ou nova chamada multimodal — a imagem nunca é tocada.
2. **Nova coleção de topo `readingProgress` em `sv_db`**, um registro por `contentId`, com `readingProgressService.js` espelhando `focusSessionService.js`. **Sem bump de `SCHEMA_VERSION`**, pela mesma justificativa já documentada em `db.js:61-70`. Não engorda `contents` (primeiro array podado na cota).
3. **Endpoint único `POST /api/reading-help` com `mode: "lost" | "rephrase"`** (seção 45 do briefing). Não mexe em `/api/rephrase`, que continua servindo o Modo Foco — zero risco de regressão no que já está validado.
4. **Tela própria `ReadingScreen.jsx`, sem refatorar `FocusScreen`.** Reaproveita os *primitivos* (`Modal`, `ConfirmDialog`, `ProgressBar`, `Card`, `Button`, presets de `src/styles/motion.js`) e o mecanismo de Focus Lock do `App.jsx` — mas não extrai um shell compartilhado, para não tocar no Modo Foco recém-commitado.
5. **TTS em um único hook** `useSpeechSynthesis` (seção 17: não criar service *e* hook). A lógica **pura** (suporte, escolha de voz, fallback de idioma) vive em `src/utils/speech.js` para ser testável no runner Node, que não tem `window`.
6. **Segmentação sensível às preferências, progresso à prova de re-segmentação:** o registro guarda `segmentCount` e um `sourceFingerprint` (hash do texto + perfil de segmentação). Se o conteúdo ou o perfil mudar entre sessões, o índice é **clampado** e o usuário é avisado — nunca aponta para um trecho inexistente nem reinicia silenciosamente sem motivo.
7. **Entrada agrupada:** `ContentDetailScreen` ganha um `SectionLabel` "Ferramentas de estudo" reunindo `FocusEntryCard` + `ReadingEntryCard`. A fileira Flashcards/Quiz/Perguntas permanece exatamente como está.

---

## Modelo final

```js
// src/data/models/readingProgress.js  (id prefix "rdp")
{
  id, contentId,
  currentSegmentIndex,   // inteiro >= 0, clampado por segmentCount
  playbackRate,          // 0.8 | 1 | 1.2 (READING_RATES)
  status,                // "in_progress" | "completed"
  segmentCount,          // quantos trechos existiam quando o índice foi salvo
  sourceFingerprint,     // hash do texto-fonte + perfil de segmentação
  createdAt, updatedAt, completedAt
}
```

Relação com `Content`: **só por `contentId`**. Nada do Content é copiado para dentro do registro. Um registro por conteúdo (upsert) — não há histórico de leituras, logo não há necessidade de poda como em `MAX_SESSIONS_PER_CONTENT`.

Constantes novas em `src/constants.js`: `READING_RATES = [0.8, 1, 1.2]`, `READING_DEFAULT_RATE = 1`, `READING_SEGMENT_BOUNDS = { maxChars: 320, compactMaxChars: 180, minChars: 40 }`.

---

## Tarefas (cada uma verificável e corrigível antes da seguinte)

> Regra: nunca passar para a próxima tarefa sem validar; ao achar bug, corrigir na própria tarefa e revalidar.
> Verificação padrão de cada tarefa de código: `npm run test:data` verde + `npm run build` sem erro.
> Prefixo dos testes novos: **`LC-`** (`MF-` está tomado pelo Modo Foco).

### Bloco A — Fonte do texto e segmentação (puro, sem UI)

**T1 — Seleção do texto acadêmico**
- Novo `src/services/readingService.js`: `buildReadingSource(content)` → `{ blocks: [{ kind, title, text }], usedFields: string[], hasEnough: boolean }`.
  - Ordem: `summary` → `keyConcepts[]` (bloco "Conceitos-chave", itens unidos com pontuação) → `extractedText` só se os anteriores estiverem vazios.
  - `hasEnoughReadingText(source)`: mínimo de caracteres úteis (ex.: 120) após `trim`; nunca aceita `undefined`, `"[object Object]"` ou só espaços.
- Verificação: **LC-01..LC-06** — content só com `summary`; só com `extractedText` (fallback marcado em `usedFields`); com ambos (usa o `summary`, **não** o bruto); `keyConcepts` vazio/não-array não quebra; content sem texto → `hasEnough: false`; nenhum campo estrutural (`id`, datas, `quizzes`, `notes`) aparece no texto de saída.

**T2 — Segmentação robusta**
- Novo `src/utils/readingSegments.js`: `segmentText(text, { maxChars, minChars })` → `string[]`, puro, sem dependência externa.
  - Corta por sentença (`.`, `!`, `?`, `…`, quebra dupla de linha), com guardas para: abreviações comuns em português (`Dr.`, `Dra.`, `Sr.`, `Sra.`, `Prof.`, `Ex.`, `Fig.`, `pág.`, `etc.`, `séc.`), **decimais** (`3.14`, `1.000`), reticências e siglas pontuadas (`E.U.A.`).
  - Linhas de lista (`-`, `•`, `1.`, `a)`) viram trechos próprios, sem perder o marcador semântico.
  - Sentença acima de `maxChars` é quebrada em pontos naturais (`;`, `,`, conjunção) — nunca no meio de palavra. Trecho abaixo de `minChars` é fundido com o vizinho.
  - **Nada é descartado**: a concatenação dos trechos preserva todo o conteúdo textual.
- `segmentationProfile(preferences)` → `{ maxChars }`: `longText` ou `manySteps` ativos → `compactMaxChars`; caso contrário `maxChars`.
- Verificação: **LC-07..LC-16** — `"Dr. Silva explicou."` não vira dois trechos; `"O valor é 3.14 nesse caso."` fica inteiro; parágrafo gigante sem pontuação é quebrado e nada se perde (teste de reconstrução por concatenação); texto vazio → `[]`; lista com marcadores; perfil compacto gera mais trechos que o padrão sobre o mesmo texto.
- Commit 1: `feat: selecionar e segmentar o texto acadêmico para leitura guiada`

### Bloco B — Persistência do progresso

**T3 — Modelo e coleção**
- Novo `src/data/models/readingProgress.js` (`createReadingProgress`, `READING_PROGRESS_STATUSES = ["in_progress","completed"]`), exportado por `src/data/models/index.js`; `ID_PREFIX.readingProgress = "rdp"` em `src/utils/id.js`.
- `src/data/models/validate.js`: `validateReadingProgress(p)` → `{ valid, errors }`, tolerante a campos ausentes.
- `src/data/storage/db.js`: coleção `readingProgress: []` em `emptyDb()`, `coerceReadingProgress()` em `readDb()` — **sem** bump de `SCHEMA_VERSION` (comentário citando `db.js:61-70`).
- Verificação: **LC-17..LC-22** — defaults (`currentSegmentIndex: 0`, `playbackRate: 1`, `status: "in_progress"`); `playbackRate` fora de `READING_RATES` cai no default; índice negativo/NaN vira 0; `sv_db` antigo sem a chave lê como `[]`; DB legado (`sv_items`) continua migrando; nenhuma coleção existente é afetada.

**T4 — Service de progresso**
- Novo `src/services/readingProgressService.js` (só storage, zero rede, espelhando `focusSessionService.js`): `getReadingProgress(contentId)`, `startOrResumeReadingProgress(contentId, { segmentCount, sourceFingerprint })` (upsert + clamp em mudança de fingerprint), `setReadingSegmentIndex(contentId, index)`, `setReadingRate(contentId, rate)`, `completeReadingProgress(contentId)`, `restartReadingProgress(contentId)`, `deleteReadingProgressForContent(contentId)`.
- Cascata: chamar `deleteReadingProgressForContent` na exclusão de conteúdo em `src/services/contentService.js`, junto de `deleteFocusSessionsForContent`.
- Verificação: **LC-23..LC-32** — upsert não duplica registro; índice clampado ao `segmentCount`; `fingerprint` diferente → índice clampado/zerado com `segmentCount` atualizado, sem apagar o registro; `completeReadingProgress` grava `completedAt` real e mantém `completed` após releitura; `restart` volta a `in_progress` com índice 0 e **não** apaga `createdAt`; `rate` inválido rejeitado; excluir conteúdo remove o progresso e **não** toca em `focusSessions` de outros conteúdos.
- Commit 2: `feat: persistir o progresso da leitura guiada`

### Bloco C — Camada de voz

**T5 — Helpers puros de voz**
- Novo `src/utils/speech.js`: `isSpeechSupported(win)` (checa `speechSynthesis` **e** `SpeechSynthesisUtterance`), `pickVoice(voices, lang)` com cadeia de fallback `pt-BR` → `pt*` → voz `default` → primeira disponível → `null`, `normalizeRate(rate)`.
- Verificação: **LC-33..LC-38** — lista vazia → `null` (não lança); só `en-US` → cai no default/primeira; `pt-PT` aceito quando não há `pt-BR`; `win` sem as APIs → `false`; `undefined` → `false`.

**T6 — Hook `useSpeechSynthesis`**
- Novo `src/hooks/useSpeechSynthesis.js` — **única** camada que toca `speechSynthesis`; nenhuma tela chama a API direto.
  - Expõe `{ supported, status: "idle"|"speaking"|"paused"|"unsupported", speak(text, { rate, onEnd }), pause(), resume(), cancel() }`.
  - **Uma fala ativa por vez:** `cancel()` antes de cada `speak`, mais um *token de geração* (`useRef` incrementado) — callbacks `onend`/`onerror` de utterances antigas são ignorados. Isso mata a duplicação por toques repetidos no play.
  - **Vozes assíncronas:** primeira chamada de `getVoices()` pode vir vazia; registrar `voiceschanged`, resolver a voz e **remover o listener** no cleanup.
  - **Cleanup obrigatório:** `useEffect` de desmontagem chama `cancel()`; idem em `pagehide`/`beforeunload`.
  - Sem suporte → `status: "unsupported"`, todas as ações viram no-op silencioso (a tela decide o que mostrar).
- Verificação: manual no navegador nesta tarefa (a API não existe no runner Node); a lógica testável já foi coberta em LC-33..LC-38.
- Commit 3: `feat: adicionar camada de sintese de voz do navegador`

### Bloco D — Experiência de leitura

**T7 — Hook de sessão de leitura**
- Novo `src/hooks/useReadingSession.js`: junta `buildReadingSource` + `segmentText` + `readingProgressService`, expõe `{ segments, index, rate, status, progress, error, goTo, next, previous, setRate, complete, restart }`.
- Toda escrita passa pelo service (nenhum `localStorage.setItem` em componente) e usa `mutate` do `ContentStoreContext` quando o snapshot precisar recarregar.
- **Atenção StrictMode:** seguir a nota de `useFocusSession.js:73-80` — nada de forma-função de `setState` em updater que escreve em storage.
- Verificação: **LC-39..LC-42** sobre a lógica pura extraída (mapa de erro → mensagem em português; clamp de índice nas bordas; `next` no último trecho não estoura).

**T8 — Tela imersiva `ReadingScreen`**
- Nova `src/screens/ReadingScreen.jsx`; `src/App.jsx` ganha `screen === "reading"`, entra na lista do `showNav` (`:105`) e no `navActive` (`:96-99`, mapeado para `library`).
- Layout: header mínimo (sair `ChevronLeft` 44×44 com `aria-label`, título truncado) · "Trecho X de Y" + `ProgressBar` · **trecho atual em destaque** · controles · ações contextuais.
- **Regra de exibição:** um trecho por vez em destaque; trechos vizinhos só como contexto esmaecido, e **nenhum** vizinho quando `concentration` estiver ativo. Nada de parede de texto.
- Transição entre trechos: `AnimatePresence mode="wait"` + `key={index}` + `fadeUp` de `src/styles/motion.js`. Nenhuma animação por palavra.
- Estados terminais desenhados (nunca tela branca): conteúdo sem texto suficiente, navegador sem suporte, leitura concluída.
- Verificação manual: durante a leitura não aparecem BottomNav, calendário, Evolution nem Study Vision+; sair funciona.

**T9 — Controles**
- Play / Pause / Retomar / Anterior / Próximo / velocidade (`READING_RATES`, segmentos de 3 opções, não slider) / Sair.
- Play: fala o trecho atual, destaca, e no `onEnd` avança sozinho; no último trecho **não** reinicia — vai para o estado de leitura concluída.
- Próximo/Anterior: `cancel()` → muda o índice → persiste → refala **apenas se** estava tocando. Índice nunca negativo, nunca além do último.
- Velocidade: altera `utterance.rate`; mudar durante a fala recomeça o trecho atual com a nova taxa (comportamento documentado na UI com uma linha discreta).
- **Resume:** usa `pause()`/`resume()` nativos; se ao retomar o navegador não voltar a falar (checagem de `speechSynthesis.speaking/paused` logo após), **fallback documentado**: refala o trecho atual desde o início. Sem arquitetura para offset dentro da frase.
- Mitigação do corte do Chrome (~15 s por utterance): trechos já limitados por `maxChars` + *keep-alive* opcional (`pause()`/`resume()` a cada ~10 s) isolado e comentado no hook.
- Verificação manual: seções 61–65 do briefing (play, pause/resume, próximo, anterior, velocidade), sempre confirmando **uma** voz ativa.
- Commit 4: `feat: adicionar experiencia de leitura guiada aos conteudos`

**T10 — Entrada pela página de Content**
- Novo `src/components/study/ReadingEntryCard.jsx`, com os três estados (espelhando `FocusEntryCard`): sem progresso → botão "📖 Ler Comigo"; com progresso → "Você parou no trecho X de Y" + **Continuar leitura** (primário) + "Recomeçar" (secundário discreto); concluída → "Leitura concluída" + "Ler novamente"; texto insuficiente → aviso explicativo, sem botão quebrado.
- `src/screens/ContentDetailScreen.jsx`: `SectionLabel` "Ferramentas de estudo" agrupando `FocusEntryCard` + `ReadingEntryCard` (hoje o `FocusEntryCard` está solto em `:250`); fileira Flashcards/Quiz/Perguntas intocada.
- Verificação manual: conteúdo com resumo, conteúdo só com `extractedText`, conteúdo sem texto — três estados corretos.

**T11 — Progresso, saída e retomada**
- Persistir em: avanço, retorno, mudança de velocidade, saída e conclusão (nunca a cada segundo).
- Sair: `ConfirmDialog` existente, linguagem não punitiva ("Seu progresso será salvo."), `cancel()` do TTS **antes** de navegar.
- Reload: reabrir cai no mesmo trecho, com a velocidade salva e **zero** chamadas ao Gemini.
- Conclusão: último trecho → `status: "completed"` + `completedAt` → tela "Leitura concluída / Você terminou este conteúdo" + `Voltar ao conteúdo`. **Sem gamificação nova, sem tocar na Chama.**
- Verificação (seções 68, 73, 74 — **crítico**): com a aba Network aberta, avançar/voltar/reload/sair/continuar não dispara **nenhuma** requisição; `sv_db.readingProgress` confere no DevTools; conclusão sobrevive a reload; "Ler novamente" volta ao trecho 1 sem corromper o Content.
- Commit 5: `feat: integrar progresso e retomada a leitura guiada`

### Bloco E — Auxílio contextual (Gemini)

**T12 — Endpoint `/api/reading-help`**
- Novo `api/reading-help.js` + nova linha em `API_ROUTES` de `vite.config.js` (match exato).
- Body aceito: `{ mode: "lost"|"rephrase", topic, current, previous: string[], preferences }`. Limites rígidos: `topic` 80 chars, `current` 1200 chars, `previous` **no máximo 2 itens** de 400 chars cada, `sanitizePreferences(preferences)`. `mode` inválido → 400.
- **Nunca** aceita nem encaminha imagem, base64, Content inteiro, histórico, quizzes ou tentativas.
- Novo `lib/readingHelpPrompts.js`: `buildReadingHelpPrompt({ mode, ... })` reusando `buildPreferenceBlock` de `lib/prompts.js`; `mode: "lost"` → "explique brevemente o que ele precisa entender para continuar, poucas frases, sem avançar assunto novo, sem criar perguntas"; `mode: "rephrase"` → "explique este mesmo trecho de outra maneira, preservando o significado, sem adicionar conteúdo". Resposta em JSON `{ success, content }`, igual ao padrão de `api/rephrase.js`.
- Cliente: `requestReadingHelp({ mode, topic, current, previous }, { preferences, signal })` em `src/services/readingService.js`, mesmo padrão de `requestRephrase` (`focusModeService.js:94`), com erro tipado.
- Verificação: **LC-43..LC-50** — sanitização do payload (imagem/campos extras são descartados; `previous` truncado a 2; limites de caracteres); `mode` inválido rejeitado; erro por tipo de falha; ausência de `GEMINI_API_KEY` tratada sem vazar detalhe. Teste manual com Gemini real, uma vez.

**T13 — "Me perdi" e "Outro jeito" na tela**
- Novo `src/components/study/ReadingHelpSheet.jsx` (dois exports, espelhando `FocusHelpSheet.jsx`): uma chamada por toque, estados `loading|done|error` com "Tentar novamente", botão final **"Continuar daqui"** que retoma no **mesmo trecho**. Sem thread, sem histórico, sem chat.
- Ao acionar: `cancel()` do TTS antes de abrir a folha.
- A resposta é **só auxílio temporário**: nunca grava em `summary`, `generatedContent`, `keyConcepts`, `notes` nem em qualquer campo do Content.
- Ler a explicação em voz alta **não** é automático; se couber sem esforço, um botão opcional "Ouvir explicação" reusa o mesmo hook — se aumentar o escopo, fica fora.
- Verificação (seções 69/70): payload pequeno confirmado no Network; resposta curta e útil; Content inalterado no DevTools antes/depois.
- Commit 6: `feat: adicionar auxilio contextual durante a leitura guiada`

### Bloco F — Qualidade

**T14 — Modo Inclusão na leitura**
- Consumir `getPreferenceOptions()` (sem criar preferência nova, sem novo perfil): `longText`/`manySteps` → perfil de segmentação compacto + espaçamento de leitura no padrão de `readingStyles()`; `concentration` → esconde vizinhos e ações secundárias (mesma regra de `FocusScreen.jsx:186`); `complexContent` → entra no bloco de preferências enviado ao prompt de "Me perdi".
- **Sem infantilização**: terminologia acadêmica preservada, fidelidade ao conteúdo (regra explícita no prompt).
- Verificação: **LC-51..LC-53** — perfil de segmentação por combinação de preferências; preferências ausentes/`null` (content legado) não quebram.

**T15 — Ciclo de vida do áudio (crítico)**
- Auditar e provar: desmontagem, troca de conteúdo, saída pela confirmação, `goBack`, reload, abertura de folha de ajuda — **sempre** `cancel()`.
- Sem falas simultâneas, sem listener (`voiceschanged`, `pagehide`) pendurado, sem timer órfão.
- Verificação (seções 66/67 — **obrigatórias**): iniciar leitura no Content A, sair → áudio para **na hora**; abrir Content B → nada do A continua; navegar para Biblioteca/Evolution/Quiz durante a fala → silêncio imediato.

**T16 — Acessibilidade e mobile**
- `aria-label` em todo botão só-ícone; estado play/pause perceptível **sem depender de cor** (ícone + rótulo/`aria-pressed`); progresso textual além da barra; foco visível (já existe `:focus-visible` global); áreas de toque ≥ 44 px; `aria-live="polite"` discreto no trecho atual.
- Larguras 320 / 375 / desktop dentro do `PhoneFrame`, sem overflow horizontal, controles alcançáveis com o polegar.

**T17 — Sem suporte e sem texto**
- Navegador sem Speech API: banner "A leitura em voz não está disponível neste navegador.", **leitura visual continua funcionando** (navegar trecho a trecho sem áudio), Content permanece acessível. Simular apagando `window.speechSynthesis` no console.
- Content sem texto adequado: estado de indisponibilidade no `ReadingEntryCard`, entrada bloqueada, **zero** chamada ao Gemini e nenhuma tentativa de fallback pela imagem.
- Verificação: seções 71/72.

**T18 — Regressão (seção 75)**
- `npm run test:data` completo, `npm run build`, e passagem manual: Câmera → Content; Modo Inclusão; **Modo Foco (completo, incluindo "Outro jeito" — `/api/rephrase` não pode ter regredido)**; Biblioteca; Flashcards; Quiz; Reviews; Evolution; Chama; Study Vision+; exclusão de conteúdo (cascata de `focusSessions` **e** `readingProgress`).
- Atenção especial: `speechSynthesis` nunca ativo ao navegar entre esses módulos.
- Correções que surgirem entram aqui, antes do último commit.
- Commit 7 (se necessário): `fix: corrigir problemas encontrados na validacao da leitura guiada`

---

## Arquivos

**Novos**
- `src/services/readingService.js` — seleção do texto, orquestração e cliente de `/api/reading-help`
- `src/services/readingProgressService.js` — persistência do progresso (só storage)
- `src/data/models/readingProgress.js` — modelo `ReadingProgress`
- `src/utils/readingSegments.js` — segmentação pura e testável
- `src/utils/speech.js` — helpers puros de suporte/voz
- `src/hooks/useSpeechSynthesis.js` — única camada que toca `speechSynthesis`
- `src/hooks/useReadingSession.js` — ponte componente ↔ services
- `src/screens/ReadingScreen.jsx` — experiência imersiva de leitura
- `src/components/study/ReadingEntryCard.jsx` — entrada/estado no ContentDetail
- `src/components/study/ReadingHelpSheet.jsx` — "Me perdi" / "Outro jeito"
- `api/reading-help.js`, `lib/readingHelpPrompts.js` — endpoint único de auxílio contextual

**Modificados**
- `src/constants.js` — `READING_RATES`, `READING_DEFAULT_RATE`, `READING_SEGMENT_BOUNDS`
- `src/utils/id.js` — `ID_PREFIX.readingProgress = "rdp"`
- `src/data/models/validate.js`, `src/data/models/index.js` — validação e export do modelo
- `src/data/storage/db.js` — coleção `readingProgress` + coerção (sem bump de versão)
- `src/services/contentService.js` — cascata de exclusão
- `src/screens/ContentDetailScreen.jsx` — seção "Ferramentas de estudo" + `ReadingEntryCard`
- `src/App.jsx` — tela `"reading"`, `showNav`, `navActive`
- `vite.config.js` — rota `/api/reading-help`
- `scripts/test-data-layer.mjs` — testes `LC-01` em diante

**Não tocar:** pipeline de imagem/câmera, `api/analyze.js`, `api/focus.js`, `api/rephrase.js`, Modo Foco (motor e telas), sistema de preferências do Modo Inclusão, Chama do Conhecimento, Evolution, Study Vision+, Reviews, analytics de Quiz.

---

## Verificação final (fluxo obrigatório, seção 77)

Com `npm run dev` e a aba Network aberta:

Content real → Ler Comigo (**0** requisições) → texto segmentado → trecho 1 → play → trecho destacado → avanço automático → pausar → retomar → próximo → **Me perdi** (1 requisição a `/api/reading-help`, payload textual pequeno, **sem imagem**) → Continuar daqui → sair (**áudio para imediatamente**) → Content → Continuar leitura → **mesmo trecho, mesma velocidade, 0 requisições** → concluir → `status: "completed"` + `completedAt` → reload → continua `completed`.

Durante todo o fluxo: **zero reprocessamento da imagem**, zero OCR, zero chamada multimodal.

Comandos: `npm run test:data` (esperado: todos verdes, ≥ 324 testes) e `npm run build` sem erro.

---

## Skills a usar durante a execução

| Momento | Skill | Para quê |
|---|---|---|
| Início da execução | `superpowers:executing-plans` | Executar tarefa a tarefa com checkpoint entre elas — casa com "não passar para a próxima sem validar". |
| T1, T2, T3, T4, T5, T7, T12, T14 | `superpowers:test-driven-development` | Escrever os `LC-xx` antes da implementação, no runner existente. |
| Qualquer bug ou teste vermelho | `superpowers:systematic-debugging` | Causa raiz antes da correção — risco alto em fala duplicada, resume entre navegadores e clamp de índice. |
| T8, T9, T10 | `frontend-design` + `ui-ux-pro-max` | Identidade visual do Study Vision (tokens de `src/styles/tokens.css`) e padrões de UX mobile. |
| T16 | `ui-ux-pro-max` | Checklist de acessibilidade (toque, contraste, labels, foco, progresso textual). |
| Antes de cada commit | `superpowers:verification-before-completion` | Proibir "pronto" sem saída real de `npm run test:data` e `npm run build`. |
| T15 e T18 | `superpowers:requesting-code-review` ou `/code-review` | Revisar o diff de ciclo de vida do áudio e o fechamento da etapa. |
| Validação visual | `run` | Subir o app e confirmar o fluxo na tela, não só nos testes. |

Deliberadamente **não** usadas: `superpowers:brainstorming` (requisitos fechados neste plano), `caveman:caveman-commit` (mensagens precisam ser Conventional Commits em português), `superpowers:using-git-worktrees` (a branch atual já isola o trabalho).

---

## Git

Antes do primeiro commit, confirmar no repositório (**sem** `--global`):

```
git config user.name "zackdevbr"
git config user.email "contatoisacn@gmail.com"
```

Conventional Commits em português, sem acentos no subject, **sem `Co-Authored-By`**, sem menção a IA ou agentes, sem `amend`, sem `force push`, sem reescrever histórico. Commits apenas após a validação da tarefa correspondente. Proibidos: `update`, `changes`, `final`, `ajustes`, `fix stuff`, `read with me`.

---

## Relatório final obrigatório (seção 82)

Ao terminar, apresentar: auditoria inicial · fonte da leitura (campos reais e ordem, com a confirmação "a imagem original não é utilizada") · segmentação · SpeechSynthesis (play/pause/resume/cancel/velocidade/voz/sem suporte) · persistência · "Me perdi" · "Outro jeito" · lifecycle · arquivos criados e modificados · testes e correções · regressão · commits (hash, mensagem, autor, e-mail, arquivos) com a confirmação explícita de que não foi usado Co-Author.

---

## Fora de escopo (apenas registrar no relatório)

OCR/Tesseract, leitura da imagem ou da câmera em tempo real, gravação de aula, transcrição, speech-to-text, chatbot/tutor falante, TTS pago (ElevenLabs, Google Cloud TTS, Azure), voz neural externa, download de áudio/MP3, playlist, background audio, Pomodoro, sincronização palavra por palavra, novas opções do Modo Inclusão, novas métricas, nova gamificação, mudanças no Study Vision+, calendário, Reviews e Evolution.
