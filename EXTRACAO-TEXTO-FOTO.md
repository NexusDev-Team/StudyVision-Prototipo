# Extração e cópia de texto de uma foto — plano de implementação

## Contexto

Hoje o Study Vision analisa a foto capturada em `/api/analyze` e transforma tudo em material de estudo
(resumo, flashcards, quiz). O usuário nunca consegue recuperar o **texto original** que está na imagem:
o campo `extractedText` do Content existe (`src/data/models/content.js:80`), mas é uma leitura livre
("não precisa ser literal palavra por palavra", `lib/prompts.js:21-22`), é único por conteúdo, e nunca é
renderizado em nenhuma tela.

A necessidade: ao abrir uma foto específica no visualizador, o estudante pede a extração do texto daquela
foto e copia o resultado. Nada de novo botão na câmera, na biblioteca ou nos cards; nada de página nova.

Decisões tomadas com o usuário:

1. **Não reusar o `extractedText` da análise.** A extração usa um endpoint dedicado, com prompt de
   transcrição fiel. O prompt de análise e os consumidores atuais (`focusModeService`, `readingService`,
   `search`) ficam intocados — zero risco de regressão no Modo Foco / Ler Comigo.
2. **Endpoint sob demanda** `POST /api/extract-text`, reutilizando a infraestrutura de
   `lib/gemini.js` (`requestJson`, `parseModelJson`, `GeminiError`). Chamado só quando o usuário toca na ação.
3. **Cache no registro da imagem** (`createImage` em `content.js`). Segunda abertura da mesma foto não gera
   nova requisição.

Uma tentativa anterior desta feature foi descartada por `git reset --hard` após revisão; este plano refaz o
trabalho do zero, já com os pontos frágeis conhecidos endereçados (empilhamento de modais, cache por foto,
mensagens de erro padronizadas).

## Estado atual relevante

| Peça | Onde |
|---|---|
| Visualizador da foto | `src/components/study/PhotoViewerModal.jsx` (ações: excluir, fechar, navegar) |
| Abertura do visualizador | `src/App.jsx:35` (estado `photoViewer`), render em `src/App.jsx:246-253` |
| Miniaturas | `src/components/study/PhotosSection.jsx:18-21` |
| Modal base (portal, Esc, foco) | `src/components/ui/Modal.jsx` |
| Toast | `src/components/ui/Toast.jsx` + `src/hooks/useToast.js` |
| Clipboard existente | `copyContent()` em `src/services/exportService.js:106-112` |
| Gemini (baixo nível) | `lib/gemini.js` — `requestJson`, `parseModelJson`, `repairJson`, `GeminiError`, `isConfigured` |
| Prompts | `lib/prompts.js` (`SYSTEM_INSTRUCTION` reaproveitável) |
| Endpoint modelo | `api/analyze.js` (validação de data URL, limite 6MB, mapeamento de erro) |
| Registro da imagem | `createImage` em `src/data/models/content.js:20-28` |
| Persistência | `src/services/contentService.js` (`updateContent`, `addImageToContent`, `withDb`) |
| Migrações | `src/data/storage/migrations.js` |
| Testes | `scripts/test-data-layer.mjs` via `npm run test:data` |

Não existe runner de teste de componente React no projeto — a verificação de UI é manual, no `npm run dev`.

## Regras de produto que o código precisa respeitar

- A ação existe **somente** dentro do `PhotoViewerModal`.
- Texto extraído ≠ resumo ≠ notas: fica em campo próprio da imagem, nunca sobrescreve
  `content.extractedText`, `content.summary` ou `content.notes`.
- Nenhuma extração automática ao abrir a foto. Só no toque.
- Nenhum conteúdo/matéria/nota novo é criado.
- Modo Inclusão **não** se aplica ao texto extraído (nenhuma `preference` é enviada ao endpoint).
- Sem texto legível → "Nenhum texto legível foi encontrado nesta foto."
- Falha → "Não foi possível extrair o texto desta foto." + única ação "Tentar novamente".

---

## Tarefas

Cada bloco termina com verificação obrigatória e um commit próprio (Conventional Commits, em português,
sem linha de co-autoria). **Nenhum bloco avança sem a verificação passar.** Se a verificação falhar,
corrigir dentro do mesmo bloco antes de seguir.

### Bloco 0 — Salvar o plano na raiz
Copiar este plano para `EXTRACAO-TEXTO-FOTO.md` na raiz do projeto.
Verificação: arquivo existe e abre.
Commit: `docs: registrar o plano de extracao de texto da foto`

---

### Bloco 1 — Corrigir o empilhamento de modais (pré-requisito, BUG REAL JÁ CONFIRMADO)

**O bug.** `src/components/ui/Modal.jsx:42` registra, por instância, um listener de `keydown` em
`document` na fase de captura. Com dois modais abertos (visualizador + folha, ou visualizador +
`ConfirmDialog` — que também é um `Modal`, ver `src/components/ui/ConfirmDialog.jsx:14`), os dois
listeners estão pendurados no **mesmo nó** (`document`). O `e.stopPropagation()` da linha 23 só impede a
propagação para **outros nós** — não impede listeners irmãos registrados no mesmo nó (isso exigiria
`stopImmediatePropagation`, e mesmo assim dependeria da ordem). Listeners do mesmo nó disparam na ordem de
registro, e o modal de fora registrou primeiro. Resultado: **um único Esc chama o `onClose` dos dois** —
a folha e o visualizador fecham juntos.

Como a folha de texto (Bloco 9) abre por cima do `PhotoViewerModal`, isso precisa estar corrigido antes —
é pré-requisito, não melhoria opcional.

**A correção.**

- Manter uma pilha em módulo (`const stack = []`) dentro de `Modal.jsx`; cada instância se empilha no mount
  e se desempilha no unmount.
- No handler de Esc, só age quem for o topo da pilha (`stack[stack.length - 1] === token`).
- **Armadilha conhecida — causa provável do descarte da tentativa anterior:** o `useEffect`
  (`Modal.jsx:15-47`) hoje depende de `[onClose]`. Os pais passam `onClose` como arrow function inline
  (ex.: `App.jsx:249`, `PhotoViewerModal.jsx:38` e `:85`), ou seja, referência **nova a cada render**. Todo
  re-render do pai roda o cleanup e re-executa o efeito: o modal de baixo se desempilha e se re-empilha, indo
  parar no **topo** da pilha mesmo com a folha aberta — o Esc volta a fechar o modal errado, e a correção
  parece "funcionar às vezes". Correção: guardar `onClose` num `useRef` atualizado a cada render, ler
  `onCloseRef.current` dentro do handler, e rodar o efeito de registro/empilhamento com deps `[]` (monta uma
  vez, desmonta uma vez). O efeito de foco inicial/restauração também passa a rodar só no mount/unmount.
- Trap de Tab e restauração de foco permanecem com o comportamento atual.

Verificação:
- `npm run build` sem erro.
- `npm run test:data` — todos os casos passam.
- Manual (`npm run dev`): abrir foto → lixeira → `ConfirmDialog` aparece → Esc fecha **só** o diálogo, a
  foto continua aberta; Esc de novo fecha a foto. Repetir abrindo/fechando o diálogo três vezes seguidas
  (garante que re-render do pai não quebra a ordem).

Commit: `fix: fechar apenas o modal do topo ao pressionar Esc`

---

### Bloco 2 — Campos de texto no registro da imagem
`src/data/models/content.js`, em `createImage`:

```
extractedText: string   // "" = nunca extraído
extractedTextAt: string|null   // ISO
extractedTextPartial: boolean  // trecho parcialmente ilegível
```

- `createContent` já repassa imagens existentes com spread (`content.js:54-56`) — confirmar que os novos
  campos sobrevivem ao round-trip.
- `src/data/storage/migrations.js`: imagens legadas recebem os defaults (`""`, `null`, `false`).
- `src/data/models/validate.js`: se houver validação de imagem, aceitar os campos novos.

Verificação: adicionar casos em `scripts/test-data-layer.mjs` — (a) `createImage` traz os defaults;
(b) imagem legada sem os campos é migrada com defaults; (c) `createContent` preserva os valores de uma
imagem já extraída. `npm run test:data` verde.

Commit: `feat: adicionar campos de texto extraido ao registro da foto`

---

### Bloco 3 — Serviço de persistência por foto
`src/services/contentService.js`: nova função

```js
export function setImageExtractedText(contentId, imageId, { text, partial })
```

- Usa `withDb`, mapeia só a imagem alvo, grava `extractedText`, `extractedTextAt: nowIso()`,
  `extractedTextPartial`, e bumpa `updatedAt` do conteúdo.
- Retorna `{ image, result }` no mesmo padrão de `addImageToContent` (`result` sinaliza poda por cota do
  localStorage — texto longo + fotos base64 pesam).
- Não toca em nenhum outro campo do Content.

Verificação: casos em `test-data-layer.mjs` — grava na imagem certa; não altera as demais imagens; não
altera `content.extractedText`/`summary`/`notes`; id inexistente não quebra. `npm run test:data` verde.

Commit: `feat: persistir o texto extraido na foto correspondente`

---

### Bloco 4 — Prompt de transcrição fiel
Novo `lib/photoTextPrompts.js` (mesmo padrão de `lib/focusPrompts.js` / `lib/rephrasePrompts.js`),
exportando `PHOTO_TEXT_SYSTEM_INSTRUCTION` e `PHOTO_TEXT_PROMPT`:

- Transcrever fielmente todo o texto legível; preservar ordem, títulos, listas, quebras de linha, fórmulas e
  símbolos; **não** resumir, explicar, completar nem interpretar.
- Sem texto legível → `{ "success": false, "reason": "no_text" }`.
- Parte ilegível → transcrever só o que foi identificado e marcar `"partial": true`.
- Sem Modo Inclusão: nenhuma adaptação de acessibilidade entra aqui.
- Resposta JSON estrita: `{ "success": true, "text": "string", "partial": false }`.
- Sem `responseSchema` (decisão vigente em `lib/gemini.js:138-140`).

Verificação: `node -e "import('./lib/photoTextPrompts.js').then(m=>console.log(Object.keys(m)))"` lista os
exports; revisar o texto do prompt contra as seções 9–12 do briefing.

Commit: `feat: adicionar prompt de transcricao fiel da foto`

---

### Bloco 5 — Função Gemini
`lib/gemini.js`: `export async function extractPhotoText({ mimeType, base64Data })`, no molde de
`generateAnalysis` (`lib/gemini.js:152-160`) — monta as parts, chama `requestJson`, passa por
`parseModelJson`, devolve o objeto. Sem duplicar client, timeout ou tratamento de erro.

Verificação: `npm run build` limpo; conferir que `requestJson`/`parseModelJson`/`GeminiError` são
reutilizados e nada foi copiado.

Commit: `feat: adicionar extracao de texto da foto ao motor Gemini`

---

### Bloco 6 — Endpoint `POST /api/extract-text`
Novo `api/extract-text.js`, espelhando `api/analyze.js`:

- Só POST; `DATA_URL_RE` e limite de 6MB reaproveitados (extrair para módulo compartilhado se ficar
  idêntico — evitar terceira cópia da regex).
- **Não** aceita nem repassa `preferences`.
- `isConfigured()` falso → 500 com mensagem amigável.
- `GeminiError` → 502 "Não foi possível extrair o texto desta foto."
- Resposta do modelo com `success: false` → HTTP 200 com `{ success: false, reason: "no_text" }`.
- Validação de forma: `text` string; se vazio depois de `trim()`, tratar como `no_text`.
- Registrar a rota no plugin do Vite (`vite.config.js`), ao lado de `/api/analyze`, `/api/focus`,
  `/api/reading-help`, `/api/rephrase`.

Verificação: `npm run dev` e, com `.env.local` configurado,
`curl -X POST localhost:5173/api/extract-text` com (a) foto com texto → `success: true` + texto;
(b) imagem em branco → `success: false, reason: "no_text"`; (c) body sem imagem → 400;
(d) data URL inválido → 400.

Commit: `feat: adicionar endpoint de extracao de texto da foto`

---

### Bloco 7 — Serviço de frontend
Novo `src/services/photoTextService.js`, no molde de `studyVisionService.js`:

- `extractPhotoText(dataUrl, { signal })` → POST `/api/extract-text`, trata rede/JSON inválido/HTTP !ok,
  devolve `{ text, partial }` ou lança `PhotoTextError` com `kind: "technical" | "no_text"`.
- `copyText(text)` **genérico**: extrair de `exportService.js` a lógica de clipboard hoje embutida em
  `copyContent` (`exportService.js:106-112`) para um util compartilhado, e fazer `copyContent` passar a
  usá-lo — sem segunda implementação de clipboard no projeto. Rejeita com
  "Área de transferência indisponível neste navegador." quando `navigator.clipboard` não existe.

Verificação: novo `scripts/test-photo-text.mjs` (ou casos em `test-data-layer.mjs`) com `fetch` mockado:
sucesso, `no_text`, HTTP 500, JSON quebrado, abort. Rodar e ver verde. Confirmar que `copyContent`
continua funcionando (caso existente de export).

Commit: `feat: adicionar servico de extracao de texto da foto`

---

### Bloco 8 — Hook `usePhotoTextExtraction`
Novo `src/hooks/usePhotoTextExtraction.js`, no molde de `useAnalysis.js`:

- Estado: `status` (`idle | loading | done | empty | error`), `text`, `partial`, `error`.
- `run(image)`:
  - se `image.extractedText` já tiver conteúdo → entra direto em `done`, com `partial` restaurado do
    registro, **sem chamar a API** (§19 do briefing);
  - se `status === "loading"` → ignora (protege contra toque duplo, §14);
  - senão chama o serviço com `AbortController`, ignora respostas de requisições abortadas, e ao terminar
    persiste via `setImageExtractedText`.
- `reset()` limpa tudo e aborta a requisição em voo.
- **Isolamento entre fotos**: o hook guarda o `imageId` da requisição corrente e descarta resultado cujo id
  não bate; quem consome também chama `reset()` ao trocar de foto (Teste 6).
- Mensagens de erro vêm centralizadas de um único lugar (nada de string solta duplicada entre hook e UI).

Verificação: `npm run build`; validação de comportamento junto ao Bloco 9 (não há runner de componente).

Commit: `feat: adicionar hook de extracao de texto com cache por foto`

---

### Bloco 9 — Folha de resultado
Novo `src/components/study/PhotoTextSheet.jsx`, reutilizando `Modal` (bottom sheet, sem `center`), no molde
visual de `FocusHelpSheet.jsx` / `ReadingHelpSheet.jsx`:

- Título "Texto identificado".
- `loading`: "Identificando texto..." (indicador simples + `aria-live="polite"`).
- `done`: texto em `<p>`/`<pre>` com `white-space: pre-wrap`, selecionável, área rolável com
  `max-height` — texto longo rola, não estoura (Teste 5). Se `partial`, linha discreta
  "Algumas partes da imagem podem não ter sido identificadas."
- `empty`: "Nenhum texto legível foi encontrado nesta foto." sem botão copiar.
- `error`: "Não foi possível extrair o texto desta foto." + única ação "Tentar novamente".
- Ação principal "Copiar texto" fixa no rodapé da folha, sempre alcançável; ao copiar, feedback
  "Texto copiado!" que some sozinho (sem botão de fechar o feedback), anunciado por `aria-live`.
  Falha de clipboard mostra a mensagem do serviço no mesmo lugar.
- Alvos de toque ≥44px, rótulos textuais (nunca só ícone), contraste alinhado ao resto do app.

Verificação (`npm run dev`, viewport de celular): cada um dos quatro estados renderiza; texto longo rola com
o botão ainda visível; folha fecha por Esc/backdrop sem fechar a foto.

Commit: `feat: adicionar folha de texto identificado da foto`

---

### Bloco 10 — Ação dentro do visualizador
`src/components/study/PhotoViewerModal.jsx`:

- Uma ação discreta, textual, abaixo da imagem: "Extrair texto" (`FileText` do lucide-react), largura total,
  desabilitada com rótulo "Identificando texto..." enquanto `status === "loading"`.
- Abre a `PhotoTextSheet` por cima do visualizador (padrão do `ConfirmDialog` já presente no arquivo).
- `useEffect` no `index`: ao navegar entre fotos, `reset()` do hook e fecha a folha (Teste 6).
- Nada muda em `PhotosSection.jsx`, `ContentDetailScreen.jsx`, câmera ou biblioteca.

Verificação (`npm run dev`): a ação só aparece com a foto aberta; um toque dispara uma requisição
(checar aba Network); toques repetidos não geram segunda requisição; reabrir a mesma foto mostra o texto em
cache sem nova requisição; navegar para outra foto não vaza o texto anterior.

Commit: `feat: adicionar acao de extrair texto ao visualizador de fotos`

---

### Bloco 11 — Validação ponta a ponta e documentação
Rodar os 8 testes do briefing no `npm run dev` com `.env.local` real, um por vez, anotando o resultado:
foto com texto; copiar; foto sem texto; erro forçado (derrubar o endpoint ou cortar a rede); texto longo;
trocar de foto; toque duplo; recarregar a página (cache persistido, app íntegro).

Depois: `npm run test:data` verde, `npm run build` limpo, e registro da feature no `PRD.md` (changelog),
no mesmo formato das fases anteriores.

Commit: `docs: registrar a extracao de texto da foto no PRD`

---

## Verificação final (critérios de aceitação)

- Nenhum botão novo em câmera, biblioteca, cards ou navegação — `git diff` toca apenas
  `PhotoViewerModal.jsx` na camada de UI existente.
- A ação só existe com a foto aberta; extração só no toque; segunda abertura não chama a API.
- Texto exibido legível, selecionável, rolável; "Copiar texto" acessível com feedback automático.
- Sem texto e erro tratados com as mensagens exatas do briefing; visualizador nunca quebra.
- `image.extractedText` nunca se mistura com `content.extractedText`, `summary` ou `notes`.
- Modo Inclusão não altera o texto extraído (nenhuma preferência enviada a `/api/extract-text`).
- Nenhum Content, matéria ou nota criado pela funcionalidade.
- Nenhuma página nova; nenhum serviço de IA ou clipboard duplicado.
