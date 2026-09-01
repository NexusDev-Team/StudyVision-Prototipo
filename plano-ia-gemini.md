# Study Vision — IA real com Gemini (captura → análise → biblioteca)

## Contexto

Hoje o Study Vision **simula** inteligência de ponta a ponta. A exploração do código confirmou:

- **Não existe câmera real.** `src/screens/CameraScreen.jsx:43` usa uma imagem estática (`exemplo-foto1.png`) como fundo do visor; `handleCapture` (`CameraScreen.jsx:32-38`) chama `onCapture()` **sem nenhum argumento**. Zero ocorrências de `getUserMedia`/`canvas`/`toDataURL` no projeto.
- **A "análise" é um `setTimeout(onDone, 1900)`** (`src/screens/AnalysisScreen.jsx:14`). O resultado já foi escolhido antes: `App.jsx:64` faz `setCapturedItem(nextCaptureTemplate())` no clique do obturador, ciclando 3 itens fixos de `src/data/sampleContent.js:170-179`.
- **Não existe backend.** Sem `api/`, sem `lib/`, sem nenhum `fetch` no projeto. Todos os "serviços" em `src/services/` são `setTimeout` mockados.

Objetivo: substituir a simulação por IA real (Gemini multimodal) **sem reescrever o produto** — reaproveitando `CameraScreen`, `AnalysisScreen`, `SummaryScreen`, `storage.js`, biblioteca, flashcards, quiz e revisão que já existem.

Decisões confirmadas:

1. **Só câmera real** (`getUserMedia`) — sem upload de arquivo.
2. **Falha de IA = erro amigável + tentar novamente.** Nunca cair em mock.
3. **Foto salva como miniatura comprimida** no `localStorage`, com poda em caso de cota.

## Ambiente (verificado)

- Node.js **v24.19.0** e npm **11.17.0** já instalados — suficientes para `@google/genai` (requer Node ≥ 20) e para as Serverless Functions da Vercel.
- Vercel CLI disponível via `npx vercel` (**59.11.1**); projeto já linkado como `study-vision`.
- Nenhuma instalação adicional de runtime é necessária. Adicionar `"engines": { "node": ">=20" }` ao `package.json` para fixar o runtime no build da Vercel.

---

## Contrato da API

`POST /api/analyze` — body: `{ "image": "data:image/jpeg;base64,..." }`

Sucesso (200):

```json
{
  "success": true,
  "subject": "Matemática",
  "topic": "Cálculo Diferencial",
  "title": "Introdução às Derivadas",
  "extractedText": "...",
  "summary": "...",
  "keyConcepts": ["Taxa de variação", "Função derivada"],
  "keywords": ["f'(x)", "dy/dx"],
  "flashcards": [{ "question": "...", "answer": "..." }],
  "openQuestions": ["..."],
  "quiz": [{ "question": "...", "options": ["a","b","c","d"], "answer": 0, "explanation": "..." }],
  "difficulty": "medium"
}
```

Falha de leitura (200, `success: false`):

```json
{ "success": false, "error": "Não foi possível identificar o conteúdo da imagem com segurança." }
```

Erros HTTP: `405` método errado · `400` imagem ausente/inválida/grande demais · `502` Gemini indisponível ou resposta inválida · `500` erro interno.
Nenhuma resposta contém chave, stack trace ou detalhe interno.

`keywords` e `openQuestions` são extensões necessárias: a UI já consome `item.keywords` (`ContentBlocks`) e `item.questions` (`QuestionsScreen.jsx:11`). Continuam sendo **uma única chamada** ao Gemini.

---

## Tarefas (revisáveis uma a uma)

### T1 — Backend: `lib/gemini.js`

- `npm i @google/genai` (única dependência nova).
- Lê `process.env.GEMINI_API_KEY` e `process.env.GEMINI_MODEL` (default `gemini-2.5-flash`). Nunca hardcode a chave.
- Exporta `isConfigured()` e `generateAnalysis({ mimeType, base64Data })`: monta `inlineData` + prompt, usa `responseMimeType: "application/json"` + `responseSchema` (saída estruturada, sem texto fora do JSON), com `timeout`/`AbortController` (~45s).
- Erros normalizados em códigos (`MISSING_KEY`, `UPSTREAM`, `BAD_JSON`) para o endpoint traduzir em HTTP + mensagem amigável. Camada isolada — permite trocar de modelo/provedor depois sem tocar no endpoint.

### T2 — Backend: `lib/prompts.js`

- `SYSTEM_INSTRUCTION`: "você é o motor de inteligência do Study Vision", responder em **português do Brasil**.
- `ANALYSIS_PROMPT`: os 11 pontos de análise, regras anti-alucinação (nada de fórmulas/datas/nomes inventados; se ilegível ou não-educacional → `success: false`), e as quantidades (resumo 1–3 parágrafos, 3–6 conceitos, ~5 flashcards, ~5 questões de quiz com 4 alternativas + índice correto + explicação, ~4 questões abertas). Se houver pouco conteúdo, não forçar quantidade.
- `ANALYSIS_SCHEMA`: o `responseSchema` do Gemini, espelhando o contrato acima.

### T3 — Backend: `api/analyze.js`

- `export default async function handler(req, res)`.
- Valida: método `POST` → senão 405; `image` presente e no formato `data:image/(jpeg|png|webp);base64,` → senão 400; tamanho do base64 ≤ ~6 MB → senão 400 (limite de body da Vercel).
- Separa `mimeType` + `base64Data`, chama `generateAnalysis`, valida a forma do JSON (campos obrigatórios, `answer` dentro do range de `options`, arrays não vazios) e responde.
- Se `GEMINI_API_KEY` ausente: 500 com mensagem genérica ("Serviço de análise indisponível no momento") + `console.error` no servidor.
- `maxDuration` configurado em `vercel.json` (`functions: { "api/*.js": { "maxDuration": 60 } }`).

### T4 — Dev local: `/api` no `vite dev`

`vite dev` não serve `api/`. Adicionar plugin `configureServer` em `vite.config.js` que intercepta `POST /api/analyze`, faz `await import("./api/analyze.js")`, e passa um shim mínimo `req` (com `body` já parseado) / `res` (`status().json()`). Mantém `npm run dev` funcionando de ponta a ponta; em produção a Vercel usa o mesmo arquivo como Serverless Function. `dotenv` não é necessário — Vite já carrega `.env.local` em `loadEnv` e o plugin injeta em `process.env`.

### T5 — Env e segurança

- Adicionar `GEMINI_API_KEY` e `GEMINI_MODEL` ao `.env.local` (já ignorado por `.gitignore:10` — `.env*`; verificado com `git check-ignore`).
- Criar `.env.example` (sem valores) e documentar no `README.md`.
- **Nenhum prefixo `VITE_`** — a chave nunca chega ao bundle. Verificação no T12.

### T6 — Frontend: `src/services/studyVisionService.js`

- `analyzeImage(dataUrl, { signal })`: `fetch("/api/analyze", { method: "POST", ... })`; trata rede, HTTP e `success:false`; lança `AnalysisError` com mensagem amigável em pt-BR.
- `toStudyItem(result, thumbnailDataUrl)`: **adaptador** entre o contrato da API e a forma de item já usada pelo app (`sampleContent.js:7-39`) — este é o ponto que evita mexer em todas as telas:
  - `subject` → `subject` + `subjectIcon`/`subjectColor`/`subjectBg` via `SUBJECT_META` (T10)
  - `topic` → `topic`; `title` → `concept`
  - `keyConcepts` → `concepts`; `keywords` → `keywords`
  - `flashcards[{question,answer}]` → `[{front,back}]`
  - `openQuestions` → `questions` (array de strings)
  - `quiz[{question,options,answer,explanation}]` → `[{type:"mc", question, options, answer, explanation}]`
  - `extractedText`, `difficulty` preservados; `photo` = miniatura; `time: "Agora"`.
- Segue o padrão dos serviços existentes (`exportService.js`, `notionService.js`), sem chave nenhuma.

### T7 — Frontend: `src/utils/image.js`

- `captureFrame(videoEl)` → canvas, redimensiona para **máx. 1280px** no maior lado, `toDataURL("image/jpeg", 0.8)` — payload para a API.
- `makeThumbnail(dataUrl)` → **máx. 640px, q0.6** (~50-80 KB) — o que vai para o `localStorage`.

### T8 — `CameraScreen.jsx`: câmera real

Manter **todo** o layout, overlays, grid, foco, flash branco e animações. Mudanças cirúrgicas:

- `<video autoPlay playsInline muted>` no lugar do `div` com `backgroundImage` (`CameraScreen.jsx:43`), mesmo posicionamento/`objectFit: cover`; overlays continuam por cima.
- `useEffect` abre `getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 } } })` e para todas as tracks no cleanup.
- Permissão negada / sem câmera: overlay dentro do próprio visor com mensagem amigável e botão "Tentar novamente"; obturador desabilitado.
- `handleCapture` mantém o flash branco de 180ms (feedback visual legítimo, não é simulação de IA), mas agora captura o frame e chama `onCapture(dataUrl)`.
- `previewPhoto` e o import de `exemplo-foto1.png` saem do componente.

### T9 — Fluxo real: `App.jsx` + `AnalysisScreen.jsx` + `SummaryScreen.jsx`

- Novo hook `src/hooks/useAnalysis.js` (padrão dos hooks existentes): `{ status, item, error, run(dataUrl), retry(), reset() }`, com `status` em `idle | uploading | analyzing | done | error` e `AbortController` cancelado no unmount.
- `App.jsx`: `onCapture={(dataUrl) => { runAnalysis(dataUrl); go("analysis"); }}`; remove `nextCaptureTemplate`/`peekCaptureTemplate` do fluxo de captura; navega para `summary` quando `status === "done"`, passando o item real.
- `AnalysisScreen.jsx`: apaga o `setTimeout(onDone, 1900)` (`:14`). Recebe `status`, `error`, `photo`, `onRetry`, `onCancel`. Os `STEPS` deixam de ser 4 strings fixas com delays cosméticos e passam a refletir o estado real (enviando foto → analisando conteúdo → gerando material), o último ficando "em progresso" enquanto a requisição roda. Remove o literal "Legibilidade 96%". Em `error`, mostra mensagem amigável + "Tentar novamente" / "Voltar à câmera". Toda a identidade visual (anéis, logo pulsante, gradiente) é preservada.
- `SummaryScreen.jsx`: remove o `setTimeout(..., 900)` do save (`:33`) — salva direto. `template = capturedItem || SAMPLE_ITEMS[0]` vira uma guarda real (sem item, não renderiza). O resto da tela já funciona com o item mapeado.
- `CapturedPageVisual` já renderiza `item.photo` quando existe (`:16-17`) — a miniatura real aparece sem nenhuma alteração.

### T10 — Matérias dinâmicas

O Gemini pode retornar "Biologia", "Geografia", "Filosofia" — hoje `SUBJECT_META` (`constants.js:14-22`) tem 7 entradas e `SUBJECT_FILTERS` (`:12`) é uma lista fixa de 5, então uma matéria nova ficaria sem cor/ícone e **inacessível** no filtro da biblioteca.

- Ampliar `SUBJECT_META` com as matérias comuns do ensino médio/superior + `getSubjectMeta(name)` com fallback neutro determinístico (`icon: "BookOpen"`, cor derivada de um hash do nome).
- `LibraryScreen`: derivar a lista de filtros de `["Todos", ...matérias presentes nos itens]` em vez da constante fixa. `SubjectFolderGrid` continua funcionando; seu mapa local `ICONS` recebe as novas entradas.

### T11 — Persistência segura (`storage.js`)

- `saveItem` hoje engole qualquer erro (`storage.js:25`) — com fotos base64 uma cota estourada seria invisível. Passa a retornar `{ ok, reason }` e, em `QuotaExceededError`, poda os itens salvos mais antigos e tenta de novo; se ainda falhar, salva o item **sem** `photo`. `SummaryScreen` mostra toast amigável se o save falhar.
- A deduplicação por `concept` (`storage.js:11-16`) foi feita para o demo com 3 templates repetidos. Com IA real, dois conteúdos distintos podem gerar o mesmo `concept` e um sumiria da biblioteca: deduplicar por `id`, mantendo a poda de duplicatas apenas contra os seeds `SAMPLE_ITEMS`.

### T12 — Correções encontradas na revisão do código existente

- **Bug de quiz (`QuizQuestion.jsx:7`)**: `isCorrect = (opt) => opt === q.answer` compara a **string** da alternativa com o **índice** numérico — nenhuma questão `type:"mc"` pode ser acertada hoje. Com o quiz real do Gemini (todo `mc`), o quiz ficaria 100% quebrado. Corrigir para comparar por índice em `mc` e por valor em `vf`, mantendo `vf` funcionando (os seeds usam os dois formatos). Ajuste correspondente em `QuizScreen.jsx:36`.
- Exibir a `explanation` do Gemini no `QuizQuestion` após a resposta (campo novo; seeds sem `explanation` simplesmente não mostram nada).
- Verificar no bundle de produção que a chave não vaza: `npm run build` e depois procurar `GEMINI` / o valor da chave em `dist/` — deve dar zero.

---

## Arquivos

**Novos:** `api/analyze.js`, `lib/gemini.js`, `lib/prompts.js`, `src/services/studyVisionService.js`, `src/hooks/useAnalysis.js`, `src/utils/image.js`, `.env.example`

**Modificados:** `src/screens/CameraScreen.jsx`, `src/screens/AnalysisScreen.jsx`, `src/screens/SummaryScreen.jsx`, `src/screens/LibraryScreen.jsx`, `src/App.jsx`, `src/services/storage.js`, `src/constants.js`, `src/components/study/QuizQuestion.jsx`, `src/screens/QuizScreen.jsx`, `src/components/ui/SubjectFolderGrid.jsx`, `vite.config.js`, `vercel.json`, `package.json`, `README.md`

**Intocados:** todo o resto — `sampleContent.js` (seeds continuam alimentando a biblioteca), `reviewEngine.js`, `subscription.js`, Vision+, flashcards, revisão, exportação, planejamento, componentes de layout e estilos.

---

## Verificação

Rodar após implementar, corrigindo o que falhar antes de dar por concluído:

1. `npm run build` — build limpo.
2. `grep -ri "GEMINI\|<valor-da-chave>" dist/` → **nenhum resultado**. `grep -r "VITE_GEMINI" src/` → nenhum.
3. `npm run dev` + DevTools: permitir a câmera, ver o stream real no visor, capturar. Aba Network mostra **um** `POST /api/analyze` com o data URL; a tela de análise fica em loading exatamente enquanto a requisição roda (não 1900 ms fixos).
4. Cenários de conteúdo, comparando os resultados entre si — **matéria, tópico, resumo, conceitos, flashcards e quiz precisam ser diferentes** a cada foto: (a) lousa/quadro, (b) slide, (c) página de livro, (d) exercício.
5. Cenários de falha: (e) foto de parede vazia / imagem borrada → `success:false` com mensagem amigável, sem conteúdo inventado; (f) conteúdo não educacional → idem; (g) `GEMINI_API_KEY` removida do `.env.local` → erro amigável, nada de stack trace nem chave na resposta; (h) DevTools offline → erro de rede amigável + "Tentar novamente" funcionando; (i) permissão de câmera negada no navegador → mensagem no visor, sem tela branca.
6. Salvar o resultado real: aparece na biblioteca com a miniatura, matéria/cor corretas, e abre em detalhe → flashcards, questões e quiz com o conteúdo gerado. **Acertar uma questão `mc` do quiz e confirmar que é marcada como correta** (regressão do T12).
7. Regressão: itens seed (`s1`–`s5`) continuam abrindo normalmente; revisão, Vision+ e exportação intactos.
8. Deploy: `npx vercel --prod` (ou push, projeto já linkado a `study-vision`) com `GEMINI_API_KEY` e `GEMINI_MODEL` configuradas no painel; repetir os passos 3, 4 e 6 na URL de produção (HTTPS é obrigatório para `getUserMedia`), de preferência no celular.
