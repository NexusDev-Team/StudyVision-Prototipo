# MODO FOCO — ETAPA 1 (MOTOR)

> Plano aprovado, **ainda não implementado**. Nenhum arquivo de código foi alterado.

## Contexto

O Study Vision já transforma uma captura de câmera em um `Content` estruturado via Gemini, e esse `Content` alimenta Biblioteca, Flashcards, Quiz, Revisões, Evolução, Chama do Conhecimento, Study Vision+ e Modo Inclusão.

Falta uma forma de estudar **dentro do tempo que o estudante realmente tem**. O Modo Foco resolve isso: pega um `Content` que já existe, soma o tempo disponível (2, 5 ou 10 minutos) e as barreiras declaradas no Modo Inclusão, e gera uma sessão guiada etapa por etapa.

Esta etapa entrega **só o motor**: dados → Gemini → normalização → persistência → retomada. A experiência visual (Focus Lock, timer, animações) fica para a Etapa 2. O critério de sucesso não é uma tela bonita — é o fluxo `Content real → 5 min → preferências reais → backend → Gemini → FocusSession persistida → progresso → reload → mesma sessão → zero novas chamadas ao Gemini`.

---

## Arquitetura encontrada (auditoria)

JS puro (sem TypeScript), Vite 8 + React 18, ESM. Exports nomeados, comentários em português, imutabilidade estrita.

| Camada | Onde | Fatos que determinam o plano |
|---|---|---|
| Persistência | [db.js](src/data/storage/db.js) | `sv_db` no localStorage, `SCHEMA_VERSION = 2`. `readDb()` faz coerção defensiva de cada campo; `writeDb()` poda **`contents`** ao estourar cota; `withDb(mutator)` é o único caminho de escrita |
| Models | [src/data/models/](src/data/models/) | Fábricas puras `createX`; `validateContent` em [validate.js](src/data/models/validate.js) devolve `{valid, errors[]}` e nunca lança |
| IDs | [id.js](src/utils/id.js) | `ID_PREFIX` map + `newId(prefix)`, `crypto.randomUUID` com fallback |
| Services | [src/services/](src/services/) | 16 arquivos; erros como classes (`AnalysisError { kind }`) |
| Modo Inclusão | [learningPreferencesService.js](src/services/learningPreferencesService.js), [constants.js:52](src/constants.js#L52) | 4 barreiras, `getPreferenceOptions()` é a porta de leitura. `LEARNING_KEYS_VERSION = 3` |
| Gemini | [lib/gemini.js](lib/gemini.js), [lib/prompts.js](lib/prompts.js), [api/analyze.js](api/analyze.js) | Chave só em `process.env.GEMINI_API_KEY`; `lib/` nunca importa `src/`; sem `responseSchema` (decisão documentada); `repairJson` + `GeminiError` |
| Testes | [scripts/test-data-layer.mjs](scripts/test-data-layer.mjs) | Runner artesanal, 189 casos, `npm run test:data`, shim `MemoryStorage`, **síncrono** |

### Correções de auditoria (verificadas no código)

1. **[vite.config.js:11](vite.config.js#L11)** — `if (req.url !== "/api/analyze") return next();`. É **rota literal**, não `/api/*`. Endpoint novo não funciona em dev sem generalizar isso.
2. **[lib/prompts.js:72,119](lib/prompts.js#L72)** — `PREFERENCE_GUARDRAILS` e `PREFERENCE_RULES` são `const` **privados**. Reusar exige exportá-los.
3. **[scripts/test-data-layer.mjs:962](scripts/test-data-layer.mjs#L962)** — `deepEqual(removed, {...5 chaves})`. Adicionar `focusSessions` a `sweepOrphans` **quebra esse teste**; a correção entra no mesmo commit.
4. **Runner é síncrono** — `test(name, fn)` chama `fn()` sem `await`. Função async que rejeita passaria como verde. Precisa de `testAsync`.
5. **[migrations.js:131-149](src/data/storage/migrations.js#L131)** devolve o db montado à mão, sem passar por `emptyDb()`. Campo novo tem que ser adicionado lá também.

---

## Decisões arquiteturais

| Questão | Decisão | Motivo |
|---|---|---|
| Endpoint | **Criar `api/focus.js`** | `api/analyze.js` inteiro é sobre imagem (`DATA_URL_RE`, `MAX_IMAGE_BYTES`, `checks` exigindo `flashcards`/`quiz`). Um flag `mode` viraria dois handlers colados. `vercel.json` já cobre `api/*.js` com `maxDuration: 60`. Risco zero no caminho quente da câmera |
| Onde guardar | **Coleção nova `sv_db.focusSessions`** | `writeDb` poda `db.contents` na cota — embutir engordaria justamente o array sacrificado. `reviews`/`quizAttempts` já são o precedente para "pertence a um content, ciclo de vida próprio" |
| Bump de schema | **NÃO bumpar (fica em 2)** | `readDb` nunca ramifica por versão; não existe `if (db.version < N)` no projeto. Adicionar coleção vazia é retrocompatível por construção (`Array.isArray(undefined) ? ... : []`). Bumpar criaria incoerência com `migrateItems` que grava `version: 2` hardcoded. Reavaliar só quando um campo existente mudar de tipo/significado |
| Prompt | **`lib/focusPrompts.js` novo**, importando de `lib/prompts.js` | Mantém `ANALYSIS_PROMPT` e o teste de paridade F11-28 intocados. Dependência unidirecional, sem ciclo |
| Reuso do Modo Inclusão | **Exportar o que é privado + extrair `buildPreferenceBlock`** | Uma única fonte das regras por barreira; teste trava que a string em `buildFocusPrompt` é **idêntica** à de `buildAnalysisPrompt`. `SUMMARY_FORMATTING` fica fora (é contrato com [ContentBlocks.jsx](src/components/study/ContentBlocks.jsx), sobre o campo `summary`, que o Foco não tem) |
| Durações | **Canônico em `src/constants.js`, réplica em `lib/focusPrompts.js`, teste de paridade** | `lib/` não pode importar `src/`. Mesmo padrão já escolhido para `PREFERENCE_KEYS` |

---

## Modelo final

### FocusSession
```js
{
  id: "fcs_9a3f21c0d7e4b815",
  contentId: "cnt_4b2e...",
  durationMinutes: 5,                 // sempre um de FOCUS_DURATIONS
  status: "in_progress",              // "in_progress" | "completed"
  steps: [ /* FocusStep[] */ ],       // ordenado, nunca vazio
  currentStepIndex: 0,                // inteiro em [0, steps.length - 1]
  inclusionPreferencesSnapshot: {     // CARIMBO: congelado na geração, nunca reescrito
    concentration: false, longText: true, complexContent: false, manySteps: true
  },
  createdAt: "2026-09-14T13:02:11.482Z",
  updatedAt: "2026-09-14T13:02:11.482Z",
  completedAt: null
}
```

### FocusStep
```js
{
  id: "fst_1c7d88f0a2b34e69",
  sessionId: "fcs_9a3f21c0d7e4b815",
  order: 0,                           // reatribuído na normalização
  type: "concept",                    // FOCUS_STEP_TYPES; desconhecido -> "explanation"
  title: "O que é uma derivada",      // não-vazia, <= 80 chars
  content: "A derivada mede..."       // não-vazia, <= 1200 chars
}
```

`inclusionPreferencesSnapshot` é sempre as 4 chaves booleanas, **nunca `null`** — diferente de `content.learningPreferences`, que usa `null` para "conteúdo legado sem Modo Inclusão". Sessão de foco nasce depois do Modo Inclusão existir; não há legado.

Campos inesperados do Gemini são descartados **por construção**: `createFocusStep` só lê as chaves que conhece, não há spread do objeto bruto em lugar nenhum.

### Constantes ([src/constants.js](src/constants.js))
```js
export const FOCUS_DURATIONS = [2, 5, 10];
export const FOCUS_DEFAULT_DURATION = 5;
export const FOCUS_STEP_TYPES = ["concept","explanation","example","practice","question","summary"];
export const FOCUS_STEP_BOUNDS = { 2:{min:2,max:4}, 5:{min:4,max:7}, 10:{min:6,max:10} };
```

### Profundidade por duração (`FOCUS_DEPTH_PROFILES` em `lib/focusPrompts.js`)

O que faz 2 ≠ 5 ≠ 10 é um parágrafo qualitativo próprio por duração — **mais** a faixa de etapas, não só ela:

- **2 min** — UM único conceito central. 2-4 etapas. Sem contexto histórico, digressão ou caso particular. 2-3 frases por etapa. O estudante sai sabendo **a ideia**.
- **5 min** — Conceito central + 2 ou 3 desdobramentos diretos. 4-7 etapas. Pelo menos um exemplo concreto e uma etapa de prática. 3-5 frases por etapa. O estudante sai sabendo **aplicar**.
- **10 min** — Tópico completo em progressão, do pré-requisito à síntese. 6-10 etapas. Define cada termo técnico antes de usá-lo, mais de um exemplo, prática, questão de verificação e fechamento. 4-7 frases por etapa. O estudante sai capaz de **explicar**.

---

## Arquivos

### Criar

| Caminho | Responsabilidade |
|---|---|
| `src/data/models/focusSession.js` | `createFocusSession`, `createFocusStep`, `FOCUS_SESSION_STATUSES`. Puro, sem I/O |
| `src/services/focusSessionService.js` | Só persistência via `withDb`/`readDb`. Nenhum `fetch` |
| `src/services/focusModeService.js` | Orquestração + rede + normalização. Espelha `studyVisionService.js` |
| `lib/focusPrompts.js` | Prompt do Modo Foco, profiles de profundidade, réplica das constantes |
| `api/focus.js` | Endpoint `POST /api/focus` |
| `scripts/test-focus-live.mjs` | Verificação com Gemini real, **fora** do `test:data` |

Assinaturas de `focusSessionService.js`:
```js
export const MAX_SESSIONS_PER_CONTENT = 3;
export function getFocusSessions()
export function getFocusSession(sessionId)
export function getActiveFocusSession(contentId)      // in_progress mais recente, senão null
export function getFocusSessionsForContent(contentId)
export function persistFocusSession(session)          // poda além do MAX
export function setFocusStepIndex(sessionId, index)   // clampeado
export function advanceFocusStep(sessionId)
export function completeFocusSession(sessionId)
export function deleteFocusSessionsForContent(contentId)
```

Assinaturas de `focusModeService.js`:
```js
// kind: "not_found"|"insufficient_content"|"invalid_duration"|"network"|"upstream"|"invalid_plan"
export class FocusError extends Error { constructor(message, kind) }
export function isDurationSupported(durationMinutes)
export function buildFocusPayload(content)   // 8 campos, sem imagens/attempts/mastery
export function hasEnoughContent(payload)
export async function requestFocusPlan(payload, { durationMinutes, preferences, signal })
export function normalizeFocusPlan(rawPlan, { contentId, durationMinutes, preferences })  // pura
export async function startFocusSession(contentId, durationMinutes, opts = {})  // opts.transport injetável
export function getOrResumeFocusSession(contentId)   // NUNCA chama Gemini
```

### Modificar

| Arquivo | Mudança | Risco |
|---|---|---|
| [src/utils/id.js](src/utils/id.js) | `ID_PREFIX` += `focusSession:"fcs"`, `focusStep:"fst"` | nulo |
| [src/constants.js](src/constants.js) | 4 constantes novas | nulo |
| [src/data/storage/db.js](src/data/storage/db.js) | `emptyDb()` += `focusSessions: []`; `readDb()` += `coerceFocusSessions`; comentário do não-bump | baixo |
| [src/data/storage/migrations.js](src/data/storage/migrations.js) | retorno de `migrateItems` += `focusSessions: []` | nulo |
| [src/data/models/validate.js](src/data/models/validate.js) | `validateFocusSession(session)` → `{valid, errors[]}` | nulo |
| [src/data/models/index.js](src/data/models/index.js) | re-exports | nulo |
| [src/services/contentService.js](src/services/contentService.js) | `deleteContent` filtra `focusSessions` | baixo |
| [src/services/integrityService.js](src/services/integrityService.js) | `sweepOrphans` cobre `focusSessions` | **quebra teste :962** |
| [lib/prompts.js](lib/prompts.js) | exporta `PREFERENCE_GUARDRAILS`/`PREFERENCE_RULES`, novo `buildPreferenceBlock`, `buildAnalysisPrompt` refatorado sobre ela | **médio** |
| [lib/gemini.js](lib/gemini.js) | extrai `parseModelJson(text)` e `requestJson({...})`; novo `generateFocusPlan({prompt})` | **médio** |
| [vite.config.js](vite.config.js) | `apiPlugin` com tabela de rotas de **match exato** | médio (dev) |
| [scripts/test-data-layer.mjs](scripts/test-data-layer.mjs) | `testAsync` + ~54 casos `MF-*` + correção do assert :962 | — |
| [package.json](package.json) | `"test:focus": "node --env-file=.env.local scripts/test-focus-live.mjs"` | nulo |

---

## Fluxo de geração

```
startFocusSession(contentId, 5, { signal })
 │
 ├─ 1. RETOMADA — getActiveFocusSession(contentId)
 │      existe? → return { session, resumed: true }   ◄── SEM GEMINI. FIM.
 │
 ├─ 2. GUARDA DE DUPLICAÇÃO — inFlight.get(`${contentId}:${duration}`)
 │      existe? → devolve a MESMA Promise (duplo clique não gera 2x)
 │
 ├─ 3. VALIDAÇÕES LOCAIS (nenhuma rede ainda)
 │      isDurationSupported        → FocusError("invalid_duration")
 │      getContent(id)             → FocusError("not_found")
 │      buildFocusPayload(content) → 8 campos
 │      hasEnoughContent(payload)  → FocusError("insufficient_content")
 │      getPreferenceOptions()     ◄── ÚNICA fonte do Modo Inclusão
 │
 ├─ 4. REDE — transport(payload, { durationMinutes, preferences, signal })
 │      └─ POST /api/focus → api/focus.js
 │           ├─ 400 método/duração/payload insuficiente
 │           ├─ sanitizePreferences()                [lib/prompts.js — REUSO]
 │           ├─ buildFocusPrompt()                   [lib/focusPrompts.js]
 │           │    └─ buildPreferenceBlock()          [lib/prompts.js — REUSO]
 │           ├─ generateFocusPlan({ prompt })        [lib/gemini.js]
 │           │    └─ AbortController 55s → parseModelJson → repairJson → GeminiError
 │           ├─ GeminiError → 502
 │           ├─ checks de forma (array, faixa, strings) → 502
 │           └─ 200 { success: true, steps: [...] }
 │
 ├─ 5. NORMALIZAÇÃO (pura, gera TODOS os ids)
 │      descarta step sem title/content; trunca title>80, content>1200
 │      type fora da lista → "explanation"
 │      length < min → FocusError("invalid_plan");  length > max → trunca
 │      createFocusSession → id "fcs_", steps "fst_", order 0..n-1
 │      snapshot = normalizePreferenceOptions(preferences)
 │
 ├─ 6. validateFocusSession → !valid → FocusError("invalid_plan")   ◄── NADA gravado
 ├─ 7. persistFocusSession(session)
 └─ finally: inFlight.delete(key)
```

**Retomada após reload:** `getOrResumeFocusSession(contentId)` lê `readDb().focusSessions`. Zero rede.
**Conclusão:** `completeFocusSession` carimba `status`/`completedAt`; a sessão some do `getActiveFocusSession`, então um novo Modo Foco no mesmo content gera de novo — correto.

---

## Tarefas

**Regra sem exceção:** cada tarefa termina com `npm run test:data` imprimindo `N passaram, 0 falharam`. Se `falharam > 0`, **não avança** — corrige ou reverte. O `N` só sobe.

**Baseline antes de começar:** `npm run test:data` → esperado `189 passaram, 0 falharam`.

| # | Tarefa | Verificação |
|---|---|---|
| **T1** | Constantes e ids (`id.js`, `constants.js`) + `MF-01..02` | `191 passaram, 0 falharam` |
| **T2** | `focusSession.js` + `validateFocusSession` + re-exports + `MF-03..08` (ignora id do input, order sequencial, type desconhecido → `explanation`, index clampeado, snapshot 4 chaves, reprova `steps:[]`/`duration:7`/`status:"paused"`) | `197 passaram, 0 falharam` |
| **T3** | `db.js` + `migrations.js` + `MF-09..12` (storage vazio → `[]`; db legado cru sem a chave não lança; `"lixo"` → `[]`; migração traz `[]`) + **contra-teste `SCHEMA_VERSION === 2`** | `201 passaram, 0 falharam` |
| **T4** | `focusSessionService.js` completo + `MF-13..20` (persistir/reler; ativa vs concluída; duas ativas → mais recente; `advanceFocusStep` para no último; `completeFocusSession` some do ativo; poda em `MAX_SESSIONS_PER_CONTENT`) | `209 passaram, 0 falharam` |
| **T5** | Cascade em `deleteContent` + `sweepOrphans` + **correção do assert :962** + `MF-21..22` | `211 passaram, 0 falharam`. Falha do teste antigo de `sweepOrphans` é **esperada** — corrigir o assert, não investigar |
| **T6** | Reuso em `lib/prompts.js`. Escrever `MF-23` **antes** de refatorar (exportar primeiro, lógica intocada, ver passar); só então introduzir `buildPreferenceBlock`. `MF-24`: `buildAnalysisPrompt(undefined) === ANALYSIS_PROMPT` | `213 passaram, 0 falharam`. **Não avançar se `MF-24` falhar** — significa que o prompt de produção mudou |
| **T7** | `lib/focusPrompts.js` + `MF-25..30`: paridade `deepEqual` com `src/constants.js`; 3 prompts distintos, cada um com só o seu profile, comprimento crescente 2<5<10, faixa correta citada; preferências A vs B; **string da regra idêntica** à de `buildAnalysisPrompt`; payload não vaza `mastery`/`images` | `219 passaram, 0 falharam` |
| **T8** | `lib/gemini.js`: extrai `parseModelJson` + `requestJson`, adiciona `generateFocusPlan`. `MF-31..33` offline. `F11-39..44` (`repairJson`) **intactos** | `222 passaram, 0 falharam` |
| **T9** | `api/focus.js` + tabela de rotas no `vite.config.js` | `npm run build` OK **e** 4 curls: duração 7 → 400 `"Duração inválida."`; `/api/analyze` com `{}` → **ainda** `"Nenhuma imagem foi enviada."`; `/api/inexistente` → HTML do index (não 500); `test:data` sem queda |
| **T10** | `focusModeService` parte pura (`FocusError`, `buildFocusPayload`, `hasEnoughContent`, `normalizeFocusPlan`, `getOrResumeFocusSession`) + `MF-34..44` (payload com exatamente 8 chaves; `"id":"HACKED"` descartado; chave inesperada some; 1 step para 10 min → `invalid_plan`; 15 steps para 2 min → truncado em 4; `steps:"nope"`/`[]` → erro) | `233 passaram, 0 falharam` |
| **T11** | `testAsync` no runner + `startFocusSession` + `inFlight` + `MF-45..54` (ver Testes abaixo) | `243 passaram, 0 falharam` |
| **T12** | `scripts/test-focus-live.mjs` + script no `package.json` | `npm run test:focus` → `3/3 planos válidos — profundidade crescente OK`. **Não entra no fluxo obrigatório** — verificação manual, saída vai no corpo do commit |
| **T13** | Regressão final | `test:data` verde, `npm run build` OK, `npm run dev` + captura real de foto pela câmera funcionando |

---

## Testes

### Offline — `scripts/test-data-layer.mjs`

Duas adições ao runner:

```js
// Variante assíncrona. O `test` síncrono engoliria uma rejeição de Promise
// silenciosamente — por isso o Modo Foco usa este.
async function testAsync(name, fn) {
  try { resetDb(); await fn(); passed += 1; console.log(`  ok  ${name}`); }
  catch (err) { failed += 1; failures.push({ name, err }); console.log(`FAIL  ${name}`); console.log(`      ${err.message}`); }
}
```

Mais `fakeTransport(planByDuration)` com contador de invocações. `startFocusSession(..., { transport })` tem default `requestFocusPlan`, então produção não muda.

**Bloqueio de rede acidental:** no bloco do Modo Foco, `globalThis.fetch = () => { throw new Error("teste offline tentou usar a rede"); }`, restaurado no fim. Transforma "esqueci de injetar o transport" em falha explícita em vez de timeout.

Casos-chave de T11:
- **2/5/10 min** — plano canned por duração; `durationMinutes` correto e contagem dentro do bound.
- **Preferências A vs B** — `setLearningPreferences({concentration:true})` → sessão 1; troca para `{manySteps:true}` → sessão 2 em outro content; **a sessão 1 continua com `{concentration:true}`** (retroatividade).
- **Persistência + reload** — `readDb().focusSessions.length === 1`; `getOrResumeFocusSession` devolve o mesmo `id`.
- **Retomada sem Gemini** — `globalThis.fetch` lança; segundo `startFocusSession` devolve `{ resumed: true }` com o mesmo `id`, sem exceção.
- **Duplo clique** — duas chamadas sem `await` entre elas: `transport.calls.length === 1`, mesmo `session.id`, `focusSessions.length === 1`.
- **Conclusão** — `completeFocusSession` → `status`/`completedAt`; `getActiveFocusSession` → `null`; nova chamada aciona o transport de novo.
- **Erros** — `not_found`; duração `7` → `invalid_duration`; content magro → `insufficient_content` **e transport nunca chamado**; `TypeError` de rede → `network`; `{success:false}` → `invalid_plan`; plano inválido → `invalid_plan` **e `focusSessions.length === 0`**.

### Online — `scripts/test-focus-live.mjs` (manual, separado)

`node --env-file=.env.local` (nativo no Node 20+; instalado é v24). **Bypassa HTTP e importa `lib/` direto** — não precisa do dev server e testa exatamente a camada que o endpoint chama. Payload fixo e versionado no script (ex.: derivadas, ~1200 chars) para execuções comparáveis.

Por duração, em sequência (não em paralelo, evita rate limit):
1. `success === true`, `steps` é array.
2. `steps.length` dentro de `FOCUS_STEP_BOUNDS[d]`.
3. Todo step com `title`/`content` não-vazios e `type` válido.
4. Nenhum step traz `id` (avisa, não falha — a normalização descarta).
5. **Profundidade:** `steps.length` e a soma de `content.length` não decrescem de 2 → 5 → 10, e o total de 10 min é ao menos 2× o de 2 min.
6. Segunda rodada com `{concentration:true, manySteps:true}`, impressa lado a lado para inspeção humana.
7. Sai com código ≠ 0 em qualquer falha.

Flag `--http` opcional bate em `http://localhost:5173/api/focus` em vez de importar `lib/` — valida endpoint + plugin do Vite de ponta a ponta. Usado uma vez em T9/T12.

**Por que separado:** `test:data` precisa ser determinístico, offline, rápido e rodável sem chave de API. Chamada real destruiria as quatro propriedades.

---

## Riscos e mitigação

| # | Risco | Mitigação |
|---|---|---|
| R1 | `buildAnalysisPrompt` mudar no refactor T6 → degrada a análise de foto silenciosamente | `MF-24` compara string com `ANALYSIS_PROMPT`; `MF-23` fixa ordem e conteúdo do bloco. T6 é commit isolado |
| R2 | `apiPlugin` quebrar `/api/analyze` em dev | Tabela de rotas com match **exato**, nunca `startsWith`. 4 curls obrigatórios em T9 |
| R3 | Teste `sweepOrphans` :962 quebrar | Previsto e roteirizado em T5 |
| R4 | Refactor de `lib/gemini.js` alterar timeout/abort/`repairJson` sem ninguém perceber | Extrair mantendo o `config` byte a byte (inclusive **sem `responseSchema`**, recomentando a decisão). `F11-39..44` verdes + captura real em T13 |
| R5 | Cota do localStorage — `writeDb` só poda `contents`, então o app sacrificaria conteúdo por causa de sessão de foco | `MAX_SESSIONS_PER_CONTENT = 3` com poda (descarta `completed` mais antiga primeiro); cap de 1200 chars por step; sessão nunca guarda imagem, base64 nem o payload enviado |
| R6 | `migrateItems` gravar direto via `writeDbRaw` sem a chave nova | Chave explícita em `migrations.js` + `MF-12`; coerção de `readDb` é a segunda rede |
| R7 | Sessões órfãs após `deleteContent` | Cascade + `sweepOrphans` (já roda no mount via [ContentStoreContext.jsx:32](src/context/ContentStoreContext.jsx#L32)) |
| R8 | Teste async passando falsamente | `testAsync` com `await` + `MF-00` que confirma que uma promise rejeitada é contabilizada como falha |
| R9 | Drift entre `src/constants.js` e `lib/focusPrompts.js` | Testes de paridade `deepEqual`, no molde do F11-28 existente |
| R10 | Duração virar só timer — Gemini ignorar o profile | Faixa `min..max` explícita no prompt **e** validada na normalização (rejeita abaixo do min) + profiles com escopo qualitativo distinto + check 5 do `test:focus` |
| R11 | Geração duplicada | Duas barreiras independentes: `getActiveFocusSession` antes de tudo + registro `inFlight` |
| R12 | `ContentStoreContext` não conhecer `focusSessions` | Fora de escopo por decisão. **Primeiro item da Etapa 2**: adicionar ao `readSnapshot()`. Na Etapa 1 a UI mínima chama o serviço direto |

---

## Commits

Conventional commits em português, sem co-author, no estilo do histórico (`feat(inclusao):`, `fix(ia):`).

**Antes do primeiro commit:** conferir a config local e ajustar se necessário —
`git config user.name "zackdevbr"` e `git config user.email "contatoisacn@gmail.com"` (sem `--global`).

```
1. feat(foco): modelo e constantes da sessao de foco          [T1-T2]
2. feat(foco): persiste sessoes de foco no sv_db sem bump de schema   [T3-T4]
   > corpo: registrar POR QUE não houve bump de SCHEMA_VERSION
3. fix(foco): apaga sessoes de foco junto com o conteudo      [T5]
4. refactor(ia): extrai bloco de preferencias reutilizavel do prompt de analise   [T6]
   > corpo: prompt de análise permanece idêntico — MF-24 trava isso
5. feat(foco): prompt do Modo Foco com profundidade por duracao   [T7]
6. feat(foco): endpoint /api/focus e rota no dev server       [T8-T9]
7. feat(foco): motor de geracao e retomada de sessao          [T10-T11]
8. test(foco): script de verificacao com o Gemini real        [T12]
   > corpo: colar a saída de `npm run test:focus`
```

Commits 1-3 são puramente de dados. 4-6 backend. 7 amarra. 8 verifica. Commits 4 e 5 vão juntos (reverter 4 sozinho quebraria 5). Sem `--amend` em commits antigos, sem force push.

---

## Verificação final (critérios de aceitação)

```
npm run test:data     # 243 passaram, 0 falharam
npm run test:focus    # 3/3 planos válidos — profundidade crescente OK
npm run build         # sucesso
npm run dev           # captura real de foto → análise funciona igual
```

Mais, explicitamente: usa Content existente · imagem não é reenviada · sem OCR novo · Gemini existente reutilizado · só 2/5/10 aceitos · duração muda a profundidade · preferências atuais do Modo Inclusão consumidas sem reimplementação · sessão com id estável, `contentId`, steps, progresso e status · reload preserva sessão e progresso · sessão concluída continua concluída após reload · retomada não chama Gemini · respostas normalizadas · resposta inválida nunca persistida · chave de API só no backend · sem mocks em runtime · sem dado fictício no produto.

---

## Skills a usar durante a execução

| Quando | Skill | Para quê |
|---|---|---|
| Ao abrir a sessão de implementação | `superpowers:executing-plans` | Executar este plano tarefa a tarefa com checkpoints de revisão, sem pular etapa |
| Em **toda** tarefa T1-T11 | `superpowers:test-driven-development` | Escrever os casos `MF-*` **antes** da implementação. Crítico em T6, onde `MF-23`/`MF-24` precisam existir e passar contra o código atual antes de refatorar `buildAnalysisPrompt` |
| Qualquer teste vermelho, `502` do endpoint ou JSON quebrado | `superpowers:systematic-debugging` | Investigar antes de propor correção — evita "consertar" o prompt quando o bug está no normalizer, e vice-versa |
| Antes de **cada** commit e antes de declarar a etapa pronta | `superpowers:verification-before-completion` | Rodar o comando e conferir a saída real. Nenhuma afirmação de "passou" sem o `N passaram, 0 falharam` colado |
| Ao fechar T7, T11 e T13 | `superpowers:requesting-code-review` ou `/code-review` | Revisar o motor antes de seguir; T7 e T11 são os pontos de maior densidade de lógica |
| Se a revisão apontar problema | `superpowers:receiving-code-review` | Verificar tecnicamente cada apontamento em vez de aceitar ou rejeitar em bloco |
| Em T9 e T13 | `run` | Subir o app e confirmar no fluxo real (curls do endpoint, captura de foto pela câmera) |
| Antes de começar, se faltar contexto histórico | `claude-mem:mem-search` | Recuperar decisões anteriores sobre prompts, `repairJson` e Modo Inclusão (Fases 10/11) sem reler o código todo |
| Para localizar código durante a implementação | `caveman:cavecrew-investigator` | Mapa `file:line` compacto, em vez de queimar contexto lendo arquivos inteiros |

**Não usar:** a skill `claude-api` — a regra de SKIP dela se aplica, este projeto usa Gemini (`@google/genai`), não a API da Anthropic. Também não usar `caveman:caveman-commit`: as mensagens aqui têm formato próprio (Conventional Commits em português, corpo explicativo, sem co-author).

---

## Fora de escopo (confirmado)

Sem TTS, OCR, pomodoro, analytics, timer visual, Focus Lock, animações, navegação de steps, `focusSessions` no `ContentStoreContext`, tela no switch do `App.jsx`. A "UI mínima" da Etapa 1, se necessária, é um botão em `ContentDetailScreen` chamando `startFocusSession` — e é dispensável, porque `test:data` e `test:focus` cobrem o motor inteiro.
