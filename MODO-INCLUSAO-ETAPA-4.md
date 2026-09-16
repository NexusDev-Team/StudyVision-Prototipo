# Modo Inclusão — Etapa 4 (final desta fase de upgrades)

> Na execução, a **primeira ação** é copiar este arquivo para a raiz do projeto como
> `c:\Users\isacn\Desktop\studyvision\MODO-INCLUSAO-ETAPA-4.md` (mesmo padrão de
> `MODO-FOCO-ETAPA-1.md`, `MODO-FOCO-ETAPA-2.md`, `LER-COMIGO-ETAPA-3.md`).

---

## 1. Contexto

O Modo Inclusão já existe e está em produção no branch `feat/modo-foco-motor` (Fases 10 e 11).
As quatro necessidades declaradas pelo estudante já são coletadas, persistidas, separadas em
padrão × captura, e enviadas ao Gemini. Esta etapa **não reconstrói** nada disso.

O problema que motiva a Etapa 4 é um bug de fidelidade da adaptação, relatado pelo usuário:

> "quando eu falo que tenho dificuldade em acompanhar lista e etapas, o estudo está vindo
> exatamente como uma lista de etapas"

Ou seja: a necessidade `manySteps` existe justamente para **evitar** a pilha de etapas, e hoje
o resultado entregue é a pilha de etapas. A adaptação está contraditória de ponta a ponta —
prompt, renderizador e camada visual. O objetivo da etapa é fechar essa contradição, auditar os
critérios de aceitação do briefing contra o que existe, e encerrar a fase.

**Resultado esperado:** com `manySteps` ativo, um processo de cinco etapas aparece como cinco
blocos separados e respiráveis (nunca `1. … 2. … 3. …` empilhado), sem perder nenhuma etapa.

---

## 2. Auditoria da arquitetura real encontrada

| Camada | Arquivo | O que expõe |
|---|---|---|
| Contrato de chaves | `src/constants.js:52` | `LEARNING_PREFERENCE_KEYS` = concentration, longText, complexContent, manySteps |
| Metadados UI | `src/constants.js:59-84` | `LEARNING_PREFERENCE_META` (emoji/label/description) |
| Prompts | `lib/prompts.js:69` | `PREFERENCE_KEYS` (réplica, paridade travada por teste F11-28) |
| Prompts | `lib/prompts.js:75-85` | `PREFERENCE_GUARDRAILS` (reusado por Foco/Ler Comigo/Rephrase) |
| Prompts | `lib/prompts.js:96-114` | `SUMMARY_FORMATTING` (contrato de marcadores com o renderizador) |
| Prompts | `lib/prompts.js:124-146` | `PREFERENCE_RULES` — uma regra por necessidade |
| Prompts | `lib/prompts.js:149,184-197` | `FORMATTING_KEYS`, `buildAnalysisPrompt` |
| Persistência | `src/data/storage/db.js:35,83-107` | `LEARNING_KEYS_VERSION = 3` + coerção defensiva |
| Serviço | `src/services/learningPreferencesService.js:39,50,57` | porta única de leitura/escrita |
| UI seleção | `src/components/study/LearningPreferencesSheet.jsx` | bottom sheet dos 3 contextos |
| UI câmera | `src/screens/CameraScreen.jsx:200,87-122` | ⚙️ do padrão + fluxo pós-captura + `makeDefault` |
| Render | `src/components/study/ContentBlocks.jsx:15-27,38,40-102` | `readingStyles`, `INLINE_LABEL_RE`, `SummaryBody` |
| API | `api/analyze.js:34,41,61` | `{ image, preferences }` → `sanitizePreferences` → `generateAnalysis` |
| Testes | `scripts/test-data-layer.mjs:2065-2500` | família `F11-1..F11-44` (node puro, sem DOM) |

**O que já atende o briefing (nada a fazer):** as opções são específicas e não-diagnósticas;
multiselect; persistência com versionamento; ⚙️ na câmera; padrão × captura separados; envio
das preferências junto da imagem no endpoint existente; guardrails de preservação acadêmica.

### Diagnóstico do bug (causa raiz — cinco pontos verificados)

1. **Contradição dentro do próprio prompt.** `SUMMARY_FORMATTING` (`lib/prompts.js:96-114`) é
   injetado quando `longText` **ou** `manySteps` está ativo, e ensina genericamente
   *"Item de lista: linha iniciada por `- `"* com exemplo de lista sob subtítulo. Duas linhas
   abaixo tenta proibir lista para etapas. O modelo lite resolve o conflito pela instrução
   genérica e positiva — e empilha.
2. **O renderizador aceita exatamente o formato proibido.** `ContentBlocks.jsx:70,77-80`
   reconhece `^\d+[.)]\s+` e monta um `<ol>` compacto. Mesmo que o prompt acertasse, o render
   estaria pronto para exibir a pilha.
3. **O marcador canônico não é reconhecido.** `INLINE_LABEL_RE` (`ContentBlocks.jsx:38`) usa
   `[\p{L} ]`, que não casa dígito — então `"Etapa 1: isole o x"` **não** vira subtítulo+parágrafo,
   cai em parágrafo corrido sem hierarquia. As etapas grudam.
4. **`manySteps` não tem efeito visual nenhum.** `readingStyles(comfort)` (`:15-27,124-130`) só
   liga com `longText`. Com `manySteps` sozinho, as etapas saem no espaçamento apertado.
5. **`repairJson`** (`lib/gemini.js:55-91`) trata `- ` vazado em arrays, mas nada sobre etapas.

### Decisões confirmadas com o usuário

- **Manter 4 necessidades.** `longText` segue cobrindo "ler e acompanhar textos" (o antigo
  `textTracking` da Fase 11). Sem bump de `LEARNING_KEYS_VERSION`, sem reset de preferências
  salvas. A 5ª opção do briefing fica coberta por texto, não por chave nova.
- **Escopo da correção:** prompt + renderizador + eixo visual próprio para `manySteps`.
  **Sem** navegação "uma etapa por vez" com botão (fica fora desta etapa).
- **Conforto visual continua lendo a preferência ATUAL** do usuário, não o snapshot do conteúdo.

---

## 3. Modelo final da adaptação de etapas

Marcador canônico no `summary`, linha isolada:

```
Etapa 1:
Isole o termo com x de um lado da igualdade.
Etapa 2:
Divida os dois lados por 3.
```

- Prompt: quando `manySteps` ativo, lista numerada para processo é **proibida** e o bloco de
  formatação genérico passa a excluir explicitamente processos do padrão de lista.
- Render: `Etapa N:` / `Passo N:` (isolado **ou** com texto na mesma linha) vira um **bloco de
  etapa** destacado — número em pílula + título + parágrafo — nunca item de `<ol>`.
- Fallback: se a IA ainda emitir `1. texto` **e** `manySteps` estiver ativo, o parser converte
  em bloco de etapa em vez de `<ol>`. Com `manySteps` desligado, `<ol>` continua como hoje.

---

## 4. Tarefas

Regra de gate, sem exceção: **nenhuma tarefa avança** sem `npm run test:data` verde e, quando
tocar em `src/`, `npm run build` limpo. Anotar o baseline de testes antes do primeiro commit
(`npm run test:data` → `N passaram, 0 falharam`) e conferir que o número só cresce.

### Bloco A — Prompt: eliminar a contradição

**T1.** `lib/prompts.js`: extrair `STEP_FORMATTING` (novo bloco, só quando `manySteps` ativo) com
o marcador canônico `Etapa N:` em linha isolada + parágrafo curto, e a proibição explícita de
lista numerada/bullet para etapas de processo.
*Verificação:* `buildAnalysisPrompt({manySteps:true})` contém `STEP_FORMATTING`; com
`{manySteps:false, longText:true}` não contém.

**T2.** `lib/prompts.js`: reescrever `SUMMARY_FORMATTING` para o padrão de lista valer apenas
para enumerações **que não sejam processo**, removendo a instrução negativa duplicada (que migra
para `STEP_FORMATTING`). Manter intacto o parágrafo que protege `openQuestions`/`flashcards`/`quiz`.
*Verificação:* sem nenhuma preferência, `buildAnalysisPrompt(null) === ANALYSIS_PROMPT` byte a
byte (teste F11-19 continua verde).

**T3.** `lib/prompts.js:139-145`: enxugar `PREFERENCE_RULES.manySteps` para não repetir a regra
de formato (que agora vive em `STEP_FORMATTING`) e manter só o que é semântico: granularidade,
separar ação/porquê/resultado, preservar todas as etapas.
*Verificação:* F11-20..23 (isolamento por regra) ajustados e verdes.

**T4.** Novos testes `F12-01..F12-08` em `scripts/test-data-layer.mjs` (após o bloco F11):
ordem dos blocos no prompt; `manySteps` sozinho; `longText` sozinho; os dois juntos (sem
duplicar instrução conflitante); nenhuma; combinação das 4; bloco JSON preservado ao final.
*Verificação:* `npm run test:data` → baseline + 8, 0 falharam.

> **Commit 1:** `fix: remover contradicao de formato nas etapas do modo inclusao`

### Bloco B — Parser do resumo (extração testável)

**T5.** Novo `src/utils/summaryBlocks.js`: mover a lógica de parsing de `SummaryBody` para uma
função pura `parseSummaryBlocks(text, { stepMode })` que devolve uma lista de descritores
(`{kind:"heading"|"paragraph"|"list"|"step", ...}`). Sem React, sem DOM — testável em node.
*Verificação:* `npm run build` limpo; nenhuma mudança visual ainda.

**T6.** `summaryBlocks.js`: reconhecer `Etapa N:` / `Passo N:` (linha isolada **e** com texto na
mesma linha) como `kind:"step"` — corrige o buraco do `INLINE_LABEL_RE` com dígito.
*Verificação:* testes `F12-09..F12-12`.

**T7.** `summaryBlocks.js`: com `stepMode:true`, linhas `^\d+[.)]\s+` viram `kind:"step"` em vez
de `list ordered`. Com `stepMode:false`, o resultado é **idêntico** ao comportamento atual.
*Verificação:* testes `F12-13..F12-16`, incluindo um caso de regressão que compara o parse de um
resumo legado (sem `\n`, e com `\n` + bullets) contra o formato antigo.

**T8.** `ContentBlocks.jsx`: `SummaryBody` passa a consumir `parseSummaryBlocks` — só renderiza.
Zero regra de parsing no componente.
*Verificação:* `npm run build`; abrir um conteúdo existente e confirmar que nada mudou com as
preferências desligadas.

> **Commit 2:** `refactor: extrair o parser do resumo para util testavel`

### Bloco C — Render e conforto visual das etapas

**T9.** `ContentBlocks.jsx`: novo `StepBlock` — número em pílula, título da etapa e parágrafo,
com separação clara entre blocos. Não depender só de cor: a pílula numerada e o espaçamento já
carregam a informação; contraste do texto ≥ 4.5:1.
*Verificação:* visual no `npm run dev` com um resumo de teste contendo `Etapa 1:`…`Etapa 3:`.

**T10.** `ContentBlocks.jsx:15-27,124-130`: `readingStyles` ganha um segundo eixo. `comfort`
(= `longText`) segue controlando fonte/entrelinha; novo `steps` (= `manySteps`) controla o
espaçamento **entre blocos de etapa**. Ambos lidos de `getPreferenceOptions()` dentro do mesmo
`useState` já existente, com o `try/catch` preservado.
*Verificação:* alternar cada preferência no ⚙️ e recarregar — os dois eixos agem
independentemente e juntos.

**T11.** Propagar o mesmo eixo para as telas que já leem `longText`:
`src/components/study/FocusStepRenderer.jsx:36-37` e `src/screens/ReadingScreen.jsx:40,223-231`.
Fonte da verdade continua sendo o snapshot em `session.inclusionPreferencesSnapshot` no Foco.
*Verificação:* `npm run build`; abrir uma sessão de Foco e uma de Ler Comigo com `manySteps` ativo.

> **Commit 3:** `feat: apresentar etapas como blocos separados no modo inclusao`

### Bloco D — Acessibilidade da própria interface

**T12.** `LearningPreferencesSheet.jsx`: ligar a descrição ao controle via `aria-describedby`
(hoje a descrição é texto solto dentro do botão), e garantir foco visível no item selecionado
via `:focus-visible`. Manter o `role="checkbox"`/`aria-checked` já corretos.
*Verificação:* navegar a sheet só pelo teclado (Tab/Espaço/Esc) e confirmar leitura de
label + descrição + estado.

**T13.** Auditar os textos de UI contra a seção 12 do briefing (nada de "você sofre/possui/seu
transtorno/modo especial") em `LearningPreferencesSheet.jsx`, `CameraScreen.jsx:271-301` e
`src/constants.js:59-84`. Corrigir só o que divergir.
*Verificação:* varredura por termos proibidos sem resultado.

> **Commit 4:** `fix: reforcar acessibilidade da folha de necessidades`

### Bloco E — Validação com o Gemini real

**T14.** Estender `scripts/test-focus-live.mjs` (ou criar `scripts/test-inclusao-live.mjs` no
mesmo molde) para chamar a análise com uma imagem de exercício em quatro combinações
(nenhuma / `manySteps` / `longText` / ambas) e imprimir o `summary` para inspeção.
*Verificação:* rodar e confirmar, no output de `manySteps`, **zero** linhas `^\d+[.)]` e presença
de `Etapa N:` isolado.

**T15.** Rodar o roteiro de regressão manual do briefing (seção 16), cenário a cenário:
nenhuma opção; uma opção; duas ou mais; recarregar a aplicação; alterar pelo ⚙️; nova captura
chegando à IA (conferir payload na aba Network); usuário sem necessidade alguma; alteração
temporária na captura **não** alterando o padrão.
*Verificação:* anotar o resultado dos 8 cenários; qualquer falha vira tarefa de correção antes
do commit seguinte.

**T16.** Corrigir o que T14/T15 revelarem. Se o modelo insistir na lista numerada apesar do
prompt, o fallback do T7 já garante a apresentação correta — registrar isso como comportamento
esperado, não como falha silenciosa.
*Verificação:* `npm run test:data` verde + `npm run build` + reexecução do cenário que falhou.

> **Commit 5:** `fix: ajustes do modo inclusao apos validacao com a IA`

### Bloco F — Fechamento da fase

**T17.** Atualizar o changelog dentro de `PRD.md` (seção 10) com a Etapa 4 e o encerramento da
fase de upgrades (Foco 1-2, Ler Comigo 3, Inclusão 4).
*Verificação:* leitura do trecho.

**T18.** Checklist final dos critérios de aceitação da seção 17 do briefing, marcando cada item
com o arquivo/teste que o comprova.
*Verificação:* `npm run test:data` + `npm run build` uma última vez, com o número final de testes.

> **Commit 6:** `docs: registrar a etapa 4 do modo inclusao no PRD`

---

## 5. Arquivos

**Novos:** `src/utils/summaryBlocks.js`; possivelmente `scripts/test-inclusao-live.mjs`;
`MODO-INCLUSAO-ETAPA-4.md` (raiz).

**Modificados:** `lib/prompts.js`, `src/components/study/ContentBlocks.jsx`,
`src/components/study/LearningPreferencesSheet.jsx`, `src/components/study/FocusStepRenderer.jsx`,
`src/screens/ReadingScreen.jsx`, `scripts/test-data-layer.mjs`, `PRD.md`.

**Intocados de propósito:** `src/constants.js` (chaves), `src/data/storage/db.js`
(`LEARNING_KEYS_VERSION` fica em 3), `src/services/learningPreferencesService.js`,
`api/analyze.js`, `src/screens/CameraScreen.jsx` (fluxo).

---

## 6. Verificação final

1. `npm run test:data` — baseline + ~16 novos casos `F12-xx`, `0 falharam`.
2. `npm run build` — sem erro nem warning novo.
3. `npm run dev` + câmera real: capturar um exercício resolvido com `manySteps` ativo e conferir
   blocos de etapa separados no resumo.
4. Aba Network em `/api/analyze`: payload traz `preferences` com as 4 chaves booleanas.
5. Recarregar a aplicação: preferências padrão preservadas (`sv_db` → `learningPreferences`).
6. Desmarcar uma necessidade só na captura (sem "tornar meu padrão") e confirmar que o ⚙️ segue
   mostrando o padrão antigo.

---

## 7. Fora de escopo

Nova chave `textTracking`; navegação "uma etapa por vez" com botão; qualquer diagnóstico ou
rótulo médico; áudio/TTS novo; gamificação; pagamento; novas páginas; mudança na arquitetura de
IA ou em endpoints; alteração do conteúdo acadêmico gerado.

## 8. Git

Branch atual `feat/modo-foco-motor`. Seis commits, conventional commits em português, sem linha
de co-autor, autoria apenas do usuário (`zackdevbr`).
