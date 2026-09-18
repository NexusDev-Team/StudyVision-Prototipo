# Correção do fluxo Captura → IA → Resultado

> **Baseline:** commit `31b9741` (feature "Extrair texto da foto" já concluída e mergeada).
> Suíte atual: **357 testes** em `scripts/test-data-layer.mjs`, todos verdes. `npm run build` OK.
> As referências `arquivo:linha` abaixo valem para esse commit; `api/analyze.js` teve as
> constantes de imagem extraídas para `lib/imageDataUrl.js`, então suas linhas estão ~2 acima
> do que constava antes.

## Contexto

O usuário relata que, depois de tirar a foto, o app cai com frequência na tela de erro
"Não foi possível analisar / Tentar novamente" — e que ao clicar em "Tentar novamente"
a análise **funciona, e rápido**. Esse sintoma (falha na 1ª tentativa, sucesso imediato na 2ª)
é a assinatura clássica de **falhas transitórias não tratadas** somadas a **validação
excessivamente rígida da resposta do modelo**.

A investigação do código confirmou 10 causas concretas. Nenhuma delas é "erro de tempo de
carregamento da UI" como se suspeitava: a tela de loading já é dirigida pelo status real da
requisição (`AnalysisScreen.jsx:10-12`), não por timer. O problema está no **backend e no
tratamento de erro**, não na animação.

Objetivo: reduzir drasticamente a frequência da tela de erro, mantendo o usuário na tela de
carregamento até o resultado essencial estar pronto, e completando o material secundário em
segundo plano.

---

## Diagnóstico — causas encontradas (ordenadas por probabilidade)

| # | Causa | Onde | Efeito |
|---|---|---|---|
| C1 | **Nenhuma retentativa no servidor.** Qualquer 429/503/`UNAVAILABLE` do Gemini (comuns no `gemini-flash-lite-latest`) vira `GeminiError("UPSTREAM")` → HTTP 502 na primeira falha | `lib/gemini.js:133-140`, `api/analyze.js:62-69` | **Causa nº1 do "retry manual funciona"** |
| C2 | **Validação de forma "tudo ou nada".** Se **uma única** questão do quiz tiver `answer` fora de `Number.isInteger` ou fora do range, a análise inteira (resumo, conceitos, flashcards válidos) é descartada com 502 | `api/analyze.js:84-98` | Descarta trabalho bom; erro aparentemente aleatório |
| C3 | **`checks.success === true` é obrigatório.** O modelo precisa emitir literalmente `"success": true`. Omitir esse campo meta — variação natural sem `responseSchema` — invalida tudo | `api/analyze.js:85` | Erro intermitente puro |
| C4 | **Sem `maxOutputTokens` e sem recuperação de JSON truncado.** Saída longa (Modo Inclusão com várias necessidades) é cortada; `repairJson` não fecha chaves/colchetes → `BAD_JSON` → 502 | `lib/gemini.js:55-91, 120-132` | Piora justamente no Modo Inclusão |
| C5 | **`response?.text` vira `undefined`** quando `finishReason` é `SAFETY`/`MAX_TOKENS`/`RECITATION` → "Resposta vazia" → 502 com mensagem genérica | `lib/gemini.js:142`, `:41-43` | Erro sem diagnóstico possível |
| C6 | **Sem code-fence stripping.** Se o modelo devolver ` ```json …``` ` apesar do `responseMimeType`, `repairJson` não remove → `BAD_JSON` | `lib/gemini.js:55-57` | Intermitente |
| C7 | **Cold start da Serverless Function.** 1ª invocação lenta (import do SDK + TLS) somada aos 55s de teto; a 2ª cai em container quente | `vercel.json` (`maxDuration:60`), `lib/gemini.js:15` | Explica o "vai rápido no retry" |
| C8 | **Sem timeout no cliente e sem saída durante `analyzing`.** Se o `fetch` pendurar, a tela de loading fica presa para sempre — não há botão de cancelar nesse estado | `useAnalysis.js:20-48`, `AnalysisScreen.jsx:41-74` | Travamento permanente |
| C9 | **Mensagem enganosa.** Timeout/função morta pela plataforma cai no ramo "Sem conexão com a internet", e o único eixo de erro é `technical`/`not_academic` — sem `analysisErrorMessage(kind)` como nos outros fluxos de IA | `studyVisionService.js:34-37`, `useAnalysis.js:43` | Usuário não entende o que houve |
| C10 | **`validation` descartado.** `normalizeAnalysisResult` retorna `{content, validation}` mas o hook ignora `validation` — um Content inválido pelo próprio schema interno passa silencioso para a SummaryScreen | `useAnalysis.js:38` | Falha silenciosa a jusante |

Bugs adjacentes confirmados (escopo aprovado pelo usuário):

| # | Bug | Onde |
|---|---|---|
| C11 | Dois `setTimeout` (180ms/350ms) sem cleanup no disparo da captura; se o componente desmontar no meio, o callback roda sobre closure obsoleta | `CameraScreen.jsx:91-110` |
| C12 | No `mode="attach"`, `capturing` nunca volta a `false` → shutter trava permanentemente | `CameraScreen.jsx:96-99` |
| C13 | `cameraReady` depende só de `onloadedmetadata`; se o metadata já carregou antes do handler ser atribuído, fica `cameraReady=false` **e** `cameraError=null` → shutter morto **sem** overlay de erro. Estado sem saída | `CameraScreen.jsx:47-53, 258` |
| C14 | `startCamera` não para o stream anterior → vazamento de tracks no "Tentar novamente" da câmera | `CameraScreen.jsx:40-63` |
| C15 | `useEffect([status, onDone])` com `onDone` = arrow inline recriada a cada render (`App.jsx:135`) → efeito re-dispara em loop enquanto `status === "done"` | `AnalysisScreen.jsx:10-12` |
| C16 | `retry()` é no-op silencioso se `lastPhotoRef.current` for `null` (após `reset`): botão clicado, nada acontece | `useAnalysis.js:50-53` |
| C17 | Voltar da Summary para a câmera não chama `analysis.reset()` → `status` fica `"done"` e `content` stale | `App.jsx:141, 144` |

---

## Decisões (confirmadas com o usuário)

1. **Dois níveis de resultado.**
   - **Núcleo (obrigatório, não aceita degradação):** `subject`, `topic`, `title`, `summary`,
     `keyConcepts`, `extractedText` — é o que a `SummaryScreen` mostra como conteúdo identificado
     e o que alimenta `ContentBlocks`. Se o núcleo vier inválido, **retenta**.
   - **Secundário (degradável):** `flashcards`, `quiz`, `openQuestions`. Itens inválidos são
     **filtrados**, não rejeitam a resposta inteira.
2. **Completar em segundo plano.** O que ficou faltando no secundário é regenerado por uma
   chamada dedicada (só texto, sem imagem, rápida) **depois** que o usuário já está vendo o
   resumo — "ir atualizando conforme dar certo".
3. **Orçamento de tempo:** até ~60s na tela de carregamento, até 3 tentativas totais.
   Só mostra erro se todas falharem.
4. **Feedback de loading:** mantém a tela atual; após 15s acrescenta uma linha honesta
   ("Está demorando um pouco mais que o normal…"). Sem etapas falsas, sem contador de tentativas.
5. Corrigir também os bugs de câmera (C11–C14), de navegação (C15, C17) e adicionar cancelar
   durante o carregamento (C8).

---

## Blocos de execução

Regra obrigatória: **nenhum bloco avança sem sua verificação passar.** Se a verificação falhar,
corrigir dentro do mesmo bloco antes de seguir. Commits em português, conventional commits,
sempre no usuário `zackdevbr` (sem linha de co-autoria).

Comandos de verificação disponíveis no projeto (`package.json:9-15`):
`npm run build`, `node scripts/test-data-layer.mjs` (= `npm run test:data`), `npm run dev`.
Não há vitest/jest nem lint — testes de serviço vivem no runner caseiro
`scripts/test-data-layer.mjs` (padrão de mock: substituir `globalThis.fetch`, ver `:3117-3128`
e `:3277`), e a verificação de UI é manual no `npm run dev`.

---

### Bloco 1 — Retentativa com backoff no servidor (causa C1, C7)

**Arquivo:** `lib/gemini.js`

> ⚠️ **`requestJson` é compartilhado por 5 fluxos**: `generateAnalysis`, `generateFocusPlan`,
> `generateRephrase`, `generateReadingHelp` e `extractPhotoText` (`lib/gemini.js:207-228`).
> Mexer nele melhora todos de uma vez, mas qualquer regressão derruba Modo Foco, Ler Comigo e
> Extrair Texto junto. A verificação deste bloco **precisa** exercitar os outros fluxos, não só
> a análise.

- Em `requestJson`, envolver a chamada num laço de até **3 tentativas** com backoff
  (600ms, 1500ms + jitter), governado por um **orçamento total** (`TOTAL_BUDGET_MS = 52000`,
  abaixo do `maxDuration: 60` de `vercel.json`) e um **teto por tentativa**
  (`ATTEMPT_TIMEOUT_MS = 26000`, substituindo o `REQUEST_TIMEOUT_MS = 55000` atual).
- Só retentar em falha **transitória**: `AbortError` da tentativa, e erros do SDK cujo
  status/mensagem indique `429`, `500`, `502`, `503`, `504`, `UNAVAILABLE`, `RESOURCE_EXHAUSTED`,
  `DEADLINE_EXCEEDED`, `fetch failed`, `ECONNRESET`. Erros de autenticação (`401/403`,
  `API key`) **não** retentam.
- Não iniciar nova tentativa se o orçamento restante for menor que `ATTEMPT_TIMEOUT_MS / 2`.
- Aceitar `signal` externo opcional (para o Bloco 2) e abortar o laço inteiro se ele disparar.
- Anexar `attempts` e o código classificado (`transient` | `permanent`) ao `GeminiError`.

**Verificação:**
- `node scripts/test-data-layer.mjs` → **357/357** (nenhuma regressão) + os novos.
- Novo teste no runner: stub de `ai.models.generateContent` que falha 2× com erro 503 e
  sucede na 3ª → `requestJson` resolve; stub que falha com `401` → rejeita na 1ª tentativa
  (`attempts === 1`); orçamento esgotado → não inicia nova tentativa.
- Regressão dos fluxos vizinhos que compartilham `requestJson`: `npm run test:focus` e
  `npm run test:inclusao` (ambos ao vivo, exigem `.env.local`) + no `npm run dev`, extrair
  texto de uma foto pelo visualizador (`/api/extract-text`) e pedir "Outro jeito" no Modo Foco.
- `npm run build`.

**Commit:** `fix: retentar chamadas transitorias ao Gemini com backoff`

---

### Bloco 2 — Retentativa também em resposta inutilizável (causas C4, C5, C6)

**Arquivos:** `lib/gemini.js`

- Adicionar `stripCodeFence(text)` no início de `repairJson` (remove ` ```json … ``` `).
- Adicionar `closeTruncatedJson(text)`: após escapar controles, fechar strings/chaves/colchetes
  ainda abertos com base numa pilha, permitindo recuperar saída cortada.
  **Só roda sobre entrada que já falhou no `JSON.parse`** — não pode corromper JSON válido.
- Em `requestJson`, ler `finishReason` da resposta; quando for `MAX_TOKENS`, `SAFETY` ou
  `RECITATION`, lançar `GeminiError` com código específico (`TRUNCATED` / `BLOCKED`) em vez
  de cair em "Resposta vazia".
- Tratar `TRUNCATED` e `BAD_JSON` como **transitórios** no laço do Bloco 1 (nova geração
  costuma resolver — é exatamente o que o retry manual do usuário faz hoje).
- Definir `maxOutputTokens: 8192` no `config` (`lib/gemini.js:123-131`) para tornar o corte
  previsível em vez de aleatório.

**Verificação:**
- Testes no runner para `repairJson`: entrada com code fence; JSON truncado no meio de string;
  JSON truncado no meio de array; JSON já válido passa intacto por `parseModelJson`.
- `parseModelJson` é usado pelos 5 fluxos — rodar de novo `npm run test:focus` e a extração
  de texto no `npm run dev` para garantir que o fechamento de JSON truncado não corrompe as
  respostas de texto longo (a transcrição de foto é o caso mais longo do app hoje: ~3650
  caracteres observados).
- `node scripts/test-data-layer.mjs`, `npm run build`.

**Commit:** `fix: recuperar resposta truncada e com cerca de codigo do Gemini`

---

### Bloco 3 — Validação em dois níveis no endpoint (causas C2, C3)

**Arquivo:** `api/analyze.js`

- Reescrever `normalizeResult` + `checks` em duas funções:
  - `validateCore(result)` → exige `topic` e `summary` strings não vazias; `subject` cai para
    `"Geral"` quando ausente; `title` cai para `topic`; `keyConcepts` cai para `[]`.
    **`success` deixa de ser exigido** — ausência passa a significar sucesso; só
    `result.success === false` (explícito) indica "não acadêmico".
  - `sanitizeExtras(result)` → **filtra** itens inválidos em vez de rejeitar:
    - `quiz`: coage `answer` de string numérica, letra (`"B"` → 1) ou `q.correct`; descarta
      questões sem `options` array ou com `answer` fora do range.
    - `flashcards`: descarta itens sem `question`/`answer`.
    - `openQuestions`: mantém a normalização atual (objeto → string).
- Se `validateCore` falhar → **não** responder 502 direto: lançar erro classificado como
  transitório para que o laço do Bloco 1 gere de novo (dentro do orçamento).
- Responder 200 com `result` + campo novo `partial: ["quiz", "flashcards", ...]` listando as
  seções que ficaram vazias/incompletas.
- Manter `console.error` de diagnóstico, agora com `requestId` curto para correlacionar com o
  cliente.

**Verificação:**
- Testes no runner chamando `validateCore`/`sanitizeExtras` diretamente:
  resposta sem `success` → válida; quiz com 1 questão ruim e 2 boas → devolve 2 e marca
  `partial: ["quiz"]` só se a contagem final ficar abaixo do mínimo; resposta sem `summary` →
  classificada como transitória.
- `node scripts/test-data-layer.mjs`, `npm run build`.

**Commit:** `fix: aceitar resposta parcial da IA preservando o conteudo essencial`

---

### Bloco 4 — Endpoint de complemento em segundo plano

**Arquivos novos:** `api/analyze-extras.js`, `lib/extrasPrompts.js`
**Arquivo alterado:** `lib/gemini.js` (nova `generateExtras`), `vite.config.js` (rota dev)

- **Espelhar `api/extract-text.js`** (mesmo formato de handler, mesmas mensagens, mesmo
  `console.error` prefixado por rota) — é o endpoint mais novo e o molde já validado.
- `POST /api/analyze-extras` recebe `{ topic, summary, extractedText, missing: ["quiz","flashcards","openQuestions"], preferences }`.
- Chamada **só texto**, sem imagem → rápida e barata; não precisa de `lib/imageDataUrl.js`.
  Reusa `requestJson` + `parseModelJson` (com o retry do Bloco 1 já embutido) e
  `sanitizePreferences` (`lib/prompts.js:177`).
- Devolve só as seções pedidas, já saneadas por `sanitizeExtras` (extraída do Bloco 3 para
  módulo compartilhado).
- Registrar `/api/analyze-extras` em `API_ROUTES` (`vite.config.js:7-15`, onde
  `/api/extract-text` foi adicionado no commit `8561e4a`). **Atenção:** o match é exato por
  `req.url`; sem a entrada na tabela, a rota cai em `next()` e devolve HTML — que no cliente
  vira erro de `response.json()`.

**Verificação:**
- `npm run dev` + `curl -X POST http://localhost:5173/api/analyze-extras` com payload de teste →
  200 com as seções pedidas.
- Payload sem `missing` → 400. Método GET → 405.
- `npm run build`.

**Commit:** `feat: adicionar endpoint de complemento do material de estudo`

---

### Bloco 5 — Timeout, mensagens e códigos de erro no cliente (causas C8, C9)

**Arquivo:** `src/services/studyVisionService.js`

- `analyzeImage`: compor o `signal` recebido com um timeout de cliente de **70s**
  (`AbortSignal.any` quando disponível, senão um `AbortController` interno + `setTimeout` com
  `clearTimeout` no `finally`). Timeout vira `AnalysisError(..., "timeout")`.
- Ampliar `AnalysisError.kind` para `"technical" | "not_academic" | "network" | "timeout" | "server"`.
- Criar `analysisErrorMessage(kind)` seguindo o padrão já existente em
  `src/hooks/useFocusSession.js:22-37` e `src/services/readingService.js:155-166` — nunca
  expor `err.message` cru na UI.
- Propagar o campo `partial` do body para o chamador. **Precedente já no código:**
  `src/services/photoTextService.js:57` devolve `{ text, partial }` da mesma forma — manter o
  mesmo nome e a mesma semântica booleana/lista.

**Verificação:**
- Testes no runner com `globalThis.fetch` mockado (padrão de `scripts/test-data-layer.mjs:3277`):
  `TypeError("failed to fetch")` → kind `network`; 502 → kind `server`; 200 + `success:false` →
  `not_academic`; abort por timeout → kind `timeout`; sempre restaurar com `blockNetwork()` no `finally`.
- `node scripts/test-data-layer.mjs`, `npm run build`.

**Commit:** `fix: classificar erros da analise e aplicar tempo limite no cliente`

---

### Bloco 6 — Retentativa automática dentro da tela de carregamento (causas C1, C10, C16)

**Arquivo:** `src/hooks/useAnalysis.js`

- `run()` passa a executar um laço interno de até **3 tentativas** (orçamento total ~60s),
  **sem sair do status `"analyzing"`**. Só retenta em kinds retentáveis
  (`network`, `timeout`, `server`); `not_academic` nunca retenta.
- Usar o `validation` hoje descartado (`useAnalysis.js:38`): Content inválido pelo schema
  interno conta como tentativa falha e dispara nova tentativa.
- Expor `slow` (boolean, vira `true` após 15s do início) e `partial` (seções pendentes).
- `retry()`: quando `lastPhotoRef.current` for `null`, sinalizar explicitamente (ex.: expor
  `canRetry`) para a UI desabilitar o botão em vez de ele ser um no-op silencioso.
- `reset()` continua abortando; garantir que os `setTimeout` do "slow" tenham `clearTimeout`.

**Verificação:**
- Testes no runner do hook via chamada direta às funções de serviço mockadas
  (mesmo padrão do Modo Foco em `scripts/test-data-layer.mjs:3100-3109`): fetch falha 2× com
  502 e sucede na 3ª → status final `"done"`, uma única transição para `"error"` nunca ocorre;
  `not_academic` na 1ª → erro imediato, **sem** retentativas.
- `npm run dev`: capturar foto real com rede normal → resumo aparece. Depois, com o dev server
  desligado no meio, confirmar que a tela de erro só aparece ao fim das tentativas.
- `node scripts/test-data-layer.mjs`, `npm run build`.

**Commit:** `fix: retentar analise automaticamente sem sair da tela de carregamento`

---

### Bloco 7 — Tela de análise: aviso de demora, cancelar e efeito estável (causas C8, C15)

**Arquivos:** `src/screens/AnalysisScreen.jsx`, `src/App.jsx`

- Estabilizar o efeito de conclusão: guardar `onDone` num `useRef` atualizado a cada render e
  deixar o `useEffect` com deps `[status]`, mais um `firedRef` para garantir disparo único.
  (Este é exatamente o "React useEffect trap" já documentado em `EXTRACAO-TEXTO-FOTO.md`.)
- No estado `analyzing`: quando `slow === true`, renderizar uma terceira linha
  "Está demorando um pouco mais que o normal — continuamos tentando."
- Adicionar botão discreto **"Cancelar"** no estado `analyzing`, chamando o mesmo `onCancel`
  já ligado em `App.jsx:134` (`analysis.reset()` + `goBack()`).
- Desabilitar visualmente "Tentar novamente" quando `canRetry === false`.

**Verificação:** `npm run dev` — capturar foto, confirmar (1) aviso de demora só aparece após
15s, (2) botão cancelar volta à câmera e a requisição é abortada, (3) ao concluir, a navegação
para a Summary acontece **uma única vez** (instrumentar temporariamente com um contador e
remover antes do commit). `npm run build`.

**Commit:** `fix: estabilizar conclusao da analise e permitir cancelar durante o carregamento`

---

### Bloco 8 — Completar o material em segundo plano na SummaryScreen

**Arquivos novos:** `src/services/analysisExtrasService.js`, `src/hooks/useAnalysisExtras.js`
**Arquivos alterados:** `src/App.jsx`, `src/screens/SummaryScreen.jsx`

- `analysisExtrasService.requestExtras({ content, missing, signal })` → `POST /api/analyze-extras`,
  com o mesmo tratamento de erro do Bloco 5.
- `useAnalysisExtras(content, partial)`: dispara **uma** vez ao montar a Summary se `partial`
  não estiver vazio; ao responder, mescla as seções no Content em memória
  (reusando os mapeamentos de `normalizeAnalysisResult`, `studyVisionService.js:92-110`).
- Falha do complemento é **silenciosa** — nunca leva à tela de erro; o usuário já tem o núcleo.
- `SummaryScreen`: enquanto o complemento roda, mostrar um marcador discreto nas seções
  pendentes de `ContentBlocks` ("preparando…"); `handleSave` salva o que estiver disponível
  no momento do clique (o `savedRef` de `SummaryScreen.jsx:28` já impede clique duplo).

**Verificação:**
- `npm run dev` com o endpoint `/api/analyze` forçado temporariamente a devolver
  `partial: ["quiz"]` → a Summary abre sem quiz, o marcador aparece e o quiz surge segundos
  depois sem recarregar.
- Com `/api/analyze-extras` forçado a 502 → nada quebra, marcador some, nenhum erro na tela.
- `node scripts/test-data-layer.mjs`, `npm run build`.

**Commit:** `feat: completar material de estudo em segundo plano apos o resumo`

---

### Bloco 9 — Bugs da câmera (causas C11, C12, C13, C14)

**Arquivo:** `src/screens/CameraScreen.jsx`

- Guardar os `setTimeout` de `handleCapture` (`:93-94`) em refs e limpá-los no `useEffect` de
  unmount (`:65-71`), junto com a parada das tracks.
- Ramo `attach` (`:96-99`): chamar `setCapturing(false)` antes de `onCapture`.
- `cameraReady` (`:47-53`): além de `onloadedmetadata`, checar sincronamente
  `videoRef.current.readyState >= 1` logo após atribuir `srcObject`, e adicionar um fallback de
  segurança (ex.: 6s) que define `cameraError` caso nem o evento nem o `readyState` resolvam —
  assim nunca existe shutter morto sem overlay de saída.
- `startCamera` (`:40-63`): parar as tracks do `streamRef.current` anterior antes de pedir um
  novo `getUserMedia`.

**Verificação:** `npm run dev` — (1) capturar e cancelar rapidamente não gera erro no console;
(2) modo anexar: capturar 2 fotos seguidas, shutter continua ativo; (3) negar permissão da
câmera → overlay com "Tentar novamente" aparece e funciona; (4) clicar "Tentar novamente" 3×
e confirmar no DevTools que só existe um stream ativo. `npm run build`.

**Commit:** `fix: corrigir timers e estados travados da tela de camera`

---

### Bloco 10 — Limpeza de estado ao voltar da Summary (causa C17)

**Arquivo:** `src/App.jsx`

- `onBackToCamera` (`:144`) e o `onSave` (`:141`) passam a chamar `analysis.reset()` antes de
  navegar, evitando `status === "done"` stale que reempurra o usuário para a Summary.
- Manter o `setTimeout` de navegação existente com `clearTimeout` no unmount.

**Verificação:** `npm run dev` — analisar uma foto, voltar à câmera sem salvar, capturar outra:
a segunda análise roda do zero e não há salto automático para a Summary antiga. `npm run build`.

**Commit:** `fix: limpar estado da analise ao sair da tela de resumo`

---

### Bloco 11 — Observabilidade mínima do fluxo

**Arquivos:** `api/analyze.js`, `api/analyze-extras.js`, `src/services/studyVisionService.js`

- Gerar um `requestId` curto no cliente, enviá-lo no header `x-sv-request-id` e ecoá-lo em
  todos os `console.error` do servidor (padrão já existente em `api/analyze.js:64`).
- No servidor, logar em cada requisição: `requestId`, tamanho do base64, número de tentativas
  gastas, `finishReason` e as seções marcadas como `partial`.
- Frontend continua sem `console.*` em `src/**` (invariante atual do projeto) — o `requestId`
  aparece apenas na tela de erro, em texto pequeno, para suporte.

**Verificação:** `npm run dev`, capturar uma foto e confirmar no terminal do Vite uma linha por
requisição com o mesmo id mostrado na UI em caso de erro. `npm run build`.

**Commit:** `feat: registrar diagnostico correlacionado das chamadas de analise`

---

### Bloco 12 — Bateria de testes do fluxo e validação ao vivo

**Arquivos:** `scripts/test-data-layer.mjs`, `scripts/test-analise-live.mjs` (novo)

- Consolidar no runner os testes escritos nos blocos anteriores, no formato existente
  (`test`/`testAsync`, `scripts/test-data-layer.mjs:48-60`).
- `scripts/test-analise-live.mjs` (espelhando `scripts/test-focus-live.mjs`): roda com
  `node --env-file=.env.local`, envia 3 imagens reais (quadro, livro, imagem sem conteúdo
  acadêmico) contra `/api/analyze` 5× cada e reporta taxa de sucesso, tentativas gastas e
  seções `partial`. Serve como medida objetiva do "antes e depois".
- Adicionar `"test:analise": "node --env-file=.env.local scripts/test-analise-live.mjs"` ao
  `package.json`.

**Verificação:** `node scripts/test-data-layer.mjs` 100% verde (357 originais + os novos de
todos os blocos); `npm run test:analise` com taxa de sucesso ≥ 95% nas 10 execuções de conteúdo
acadêmico e `not_academic` correto nas 5 da imagem sem conteúdo; `npm run test:focus` e
`npm run test:inclusao` sem regressão. `npm run build`.

**Commit:** `test: cobrir fluxo de analise de foto com testes automatizados e ao vivo`

---

## Verificação end-to-end (após todos os blocos)

1. `node scripts/test-data-layer.mjs` → 0 falhas (≥ 357 testes).
2. `npm run build` → sem erros.
3. `npm run test:analise` → taxa de sucesso ≥ 95%.
4. `npm run test:focus` + `npm run test:inclusao` → sem regressão nos fluxos que dividem
   `requestJson`/`parseModelJson`.
5. `npm run dev`, no navegador:
   - Capturar quadro/caderno real → resumo aparece **sem** passar pela tela de erro.
   - Ativar throttling "Slow 3G" no DevTools → aviso de demora aparece, a análise ainda conclui.
   - Desligar o dev server no meio da análise → tela de erro só após as 3 tentativas, com
     mensagem de rede correta, e "Tentar novamente" funciona.
   - Fotografar algo sem conteúdo de estudo → "Sem conteúdo de estudo" **imediatamente**
     (sem retentativas, sem espera).
   - Forçar `partial: ["quiz"]` no endpoint → Summary abre sem quiz e o quiz chega depois.
   - Cancelar durante o carregamento → volta à câmera, sem requisição pendente no Network.
   - **Fluxos vizinhos (regressão):** extrair texto de uma foto no visualizador, iniciar uma
     sessão de Modo Foco e pedir "Me perdi" no Ler Comigo — todos continuam funcionando.

## Ordem de entrega e pontos de parada seguros

Os blocos são independentes o bastante para parar em qualquer ponto com o app funcionando:

- **Blocos 1–3** já derrubam a maior parte da frequência do erro (C1, C2, C3, C4, C5, C6, C7).
  Se o tempo for curto, entregar só até aqui já resolve o sintoma relatado.
- **Blocos 5–7** são a experiência do usuário (nunca sair do loading, cancelar, mensagens certas).
- **Bloco 4 + 8** são o "ir completando conforme dá certo" — a parte mais nova e a única que
  adiciona um endpoint; podem ficar por último sem bloquear os ganhos anteriores.
- **Blocos 9–10** são os bugs adjacentes de câmera e navegação, independentes de tudo acima.
- **Blocos 11–12** são diagnóstico e medição — é o que prova que a frequência caiu de fato.

## Riscos e observações

- **`maxDuration: 60` da Vercel é o teto duro.** O orçamento de 52s do Bloco 1 e o timeout de
  70s do cliente (Bloco 5) existem para que o cliente nunca desista antes do servidor responder.
- **Custo:** retentativas multiplicam chamadas ao Gemini no pior caso. O endpoint de
  complemento é só texto (sem imagem), então é a parte barata.
- **`.env.local` contém `GEMINI_API_KEY` real e um `VERCEL_OIDC_TOKEN`** — os scripts live
  dependem dele e ele já está coberto pelo `.gitignore:9`. Não versionar.
- **Não existe runner de teste de componente React** no projeto; toda verificação de UI
  permanece manual no `npm run dev`, como já documentado em `EXTRACAO-TEXTO-FOTO.md:46`.
- **Raio de alcance maior do que parece:** `requestJson` e `parseModelJson` (`lib/gemini.js`)
  são o coração dos 5 fluxos de IA do app. Os Blocos 1 e 2 melhoram todos simultaneamente —
  e são também os únicos blocos que podem quebrar tudo de uma vez. São os que exigem a
  verificação mais ampla.
- O plano **não** altera prompts em `lib/prompts.js` além do necessário; se após o Bloco 12 a
  taxa de `partial` continuar alta, o ajuste de prompt vira um bloco 13 separado, medido.

