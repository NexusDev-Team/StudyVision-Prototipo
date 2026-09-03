# Fase 1 — Fundação de Dados do Study Vision

## Contexto

O Study Vision hoje funciona ponta a ponta (câmera real → Gemini real → localStorage), mas os dados são um **array plano de "items"** onde cada tela guarda o que precisa e descarta o resto. A auditoria do código atual encontrou:

- **Um único documento por captura** (`src/data/sampleContent.js:7-39`), sem entidades separadas. Foto é singular (`item.photo`), não há coleção de imagens.
- **IDs frágeis**: `u_${Date.now()}` (`src/screens/SummaryScreen.jsx:18`). Flashcards, questões de quiz e estágios de revisão **não têm ID** — são chaveados por índice de array.
- **Nenhum registro de desempenho**: as notas de flashcard vivem em `useState` local (`src/screens/FlashcardsScreen.jsx:23`) e o score do quiz idem (`src/screens/QuizScreen.jsx:31`). Ambos morrem ao desmontar a tela.
- **Sem anotações do usuário** — não existe campo separado do resumo da IA.
- **Revisões acopladas ao item** (`item.reviewSchedule`) e transformadas em eventos sintéticos de calendário a cada render (`src/screens/ReviewScreen.jsx:36-41`).
- **Eventos acadêmicos**: no máximo **um** por conteúdo (`item.calendarEvent`), sobrescrito a cada agendamento.
- **Matérias**: strings livres (`item.subject`) — renomear uma matéria é impossível.
- **Persistência sem versão nem migração**: chave `sv_items` hardcoded inline em 3 pontos de `src/services/storage.js`.
- **Datas em 4 convenções coexistindo**: epoch ms, ISO, `"YYYY-MM-DD"` (gerada em UTC num lugar e local em outro — bug real), e string humana `"Há 2 dias"`.
- **Dados sintéticos**: 5 seeds com `done:true` forjado, e todo o dashboard Vision+ vindo de `src/data/plusMetrics.js` (78% domínio, 18h estudadas, 42 conteúdos — nada disso é medido).

**Resultado esperado:** um modelo relacional com CONTENT no centro, persistido de forma versionada, capaz de responder "dado um contentId, quais imagens / flashcards / quizzes / tentativas / revisões / eventos pertencem a ele?" — e o caminho inverso. Sem mudança visual.

## Decisões tomadas com o usuário

| Assunto | Decisão |
|---|---|
| Seeds mock | **Migrar com `isSample: true`, sem histórico falso.** Remover o `done:true` forjado dos `reviewSchedule` dos seeds. App continua com conteúdo de demo para o pitch. |
| Dashboard Vision+ | **Só criar a estrutura.** `plusMetrics.js` continua alimentando a UI nesta fase. O `performanceService` é construído e testado, mas não é ligado às telas — isso fica para a Fase 2. |
| Registro de tentativas | **Só a camada de dados.** `FlashcardsScreen` / `QuizScreen` não são alterados nesta fase. Os serviços `recordFlashcardAttempt` / `recordQuizAttempt` são implementados e cobertos por testes de nó, mas nenhuma tela os chama ainda. |

> Consequência assumida e explícita: ao fim da Fase 1 o app terá a fundação completa mas **ainda nenhum produtor de tentativa real**. A Fase 2 (integração) liga as telas nos serviços e troca a fonte do Vision+. O plano abaixo entrega os pontos de conexão prontos e documentados.

---

## Arquitetura alvo

Estado persistido único, versionado, em `localStorage["sv_db"]`:

```js
{
  version: 2,
  subjects: [Subject],
  contents: [Content],            // imagens, flashcards, quizzes inline (dono exclusivo)
  flashcardAttempts: [Attempt],   // append-only
  quizAttempts: [QuizAttempt],    // append-only
  reviews: [Review],
  events: [AcademicEvent],
}
```

**Por que inline vs. coleção:** imagens, flashcards, quizzes e questões pertencem exclusivamente a um conteúdo e são sempre lidos junto com ele — ficam **aninhados** dentro de `Content`, cada um com `id` próprio. Tentativas, revisões e eventos crescem de forma independente e são consultados por outras dimensões (tempo, desempenho) — ficam em **coleções top-level** referenciando `contentId`. Isso evita reescrever o conteúdo inteiro a cada resposta de quiz.

### Modelos (`src/data/models/`)

```js
// Subject
{ id: "sub_xxx", name: "Matemática", createdAt: ISO, updatedAt: ISO }

// Content — entidade central
{
  id: "cnt_xxx",
  subjectId: "sub_xxx",
  subjectName: "Matemática",       // denormalizado APENAS p/ leitura; subjectId é a verdade
  topic, title,                     // `title` substitui o atual `concept`
  extractedText, summary,
  notes: "",                        // ← NOVO: anotações do usuário, separadas do resumo da IA
  keyConcepts: [], keywords: [],
  difficulty: "easy"|"medium"|"hard"|null,
  images:  [{ id:"img_xxx", contentId, dataUrl, order:0, createdAt }],
  flashcards: [{ id:"fc_xxx", contentId, front, back, source:"ai"|"user", createdAt }],
  quizzes: [{
    id:"qz_xxx", contentId, source:"ai"|"user", createdAt,
    questions: [{ id:"qs_xxx", quizId, type:"mc"|"vf", question, options[], correctAnswer, explanation }]
  }],
  openQuestions: [{ id:"oq_xxx", contentId, question }],
  mastery: { score: 0, level: "not_started", updatedAt: null },
  isSample: false,
  createdAt: ISO, updatedAt: ISO,
}

// FlashcardAttempt (append-only)
{ id, flashcardId, contentId, correct: bool, answeredAt: ISO, responseTimeMs: null }

// QuizAttempt (append-only)
{ id, quizId, contentId, score, correctAnswers, totalQuestions, answeredAt: ISO,
  answers: [{ questionId, selectedAnswer, correct }] }

// Review — entidade própria, NÃO é evento acadêmico
{ id, contentId, stage, scheduledFor: ISO, status: "pending"|"completed"|"skipped",
  completedAt: null, reason: "spaced_repetition"|"low_performance"|"manual" }

// AcademicEvent — N eventos por conteúdo, N conteúdos por evento
{ id, type: "exam"|"assignment"|"class"|"deadline"|"other",
  title, date: "YYYY-MM-DD", time: "HH:MM"|null, reminders: [7,3,1,0],
  contentIds: [], createdAt: ISO }
```

**Regras de integridade fixadas:** IDs estáveis sob edição de título e troca de matéria; toda entidade filha carrega `contentId`; `correctAnswer` guardado como valor semântico (índice para `mc`, boolean para `vf`) e nunca inferido da posição visual; histórico é append-only; `deleteContent` faz cascade em `reviews` / `events.contentIds` / tentativas, sem deixar referência órfã.

**Datas:** uma convenção só — **string ISO 8601 UTC** para todo timestamp. Duas funções em `src/utils/date.js` fazem a ponte com o resto: `toDayKey(iso)` → `"YYYY-MM-DD"` **em horário local** (corrige o bug de `src/screens/ReviewScreen.jsx:38` usar UTC enquanto `src/components/study/CalendarMonth.jsx:10` usa local) e `fromDayKey`. `item.time` ("Há 2 dias") vira derivado de `createdAt`, não campo armazenado.

---

## Tarefas (cada uma é um ponto de revisão)

### T1 — Utilitários base
- `src/utils/id.js`: `newId(prefix)` usando `crypto.randomUUID()` com fallback `${prefix}_${Date.now()}_${random}`. Elimina a colisão possível de `Date.now()`.
- `src/utils/date.js`: `nowIso()`, `toIso(x)` (aceita epoch/Date/ISO), `toDayKey(iso)` local, `fromDayKey(key)`, `addDaysIso(iso, n)`, `relativeLabel(iso)` (substitui o `item.time` hardcoded), `endOfTodayIso()`.
- **Revisão:** funções puras, sem dependências. Testar `toDayKey` contra o caso UTC/local que hoje diverge.

### T2 — Modelos e normalização
- `src/data/models/` — um arquivo por entidade (`content.js`, `subject.js`, `flashcard.js`, `quiz.js`, `review.js`, `event.js`, `attempt.js`), cada um exportando um factory `createX(input)` que aplica defaults, gera IDs e normaliza datas.
- `src/data/models/validate.js` — `validateContent(content)` retorna `{ valid, errors[] }`. Checa: ID presente, título não vazio, `subjectId` resolvível, arrays sempre arrays, cada questão com `correctAnswer` coerente com seu `type`.
- **Revisão:** criar um conteúdo mínimo (só título) e um completo; ambos devem passar sem lançar.

### T3 — Camada de persistência
- `src/data/storage/db.js` — leitura/escrita da chave única `sv_db`, com `SCHEMA_VERSION`. Expõe `readDb()`, `writeDb(db)`, `withDb(mutator)`.
- Portar o tratamento de `QuotaExceededError` que já existe em `src/services/storage.js:29-42` (poda de conteúdos antigos → em último caso salvar sem imagens). É lógica boa, não reescrever do zero.
- **Revisão:** escrever, recarregar, comparar. Simular quota estourada.

### T4 — Migração v1 → v2
- `src/data/storage/migrations.js` — `migrate(raw)`. Lê o `sv_items` legado, converte cada item:
  - `concept` → `title`; `concepts` → `keyConcepts`; `questions` → `openQuestions[]` com ID.
  - `photo` (string única) → `images: [{ id, order: 0 }]`.
  - `flashcards [{front,back}]` → ganham `id` + `contentId`.
  - `quiz[]` (array plano) → um `quizzes[0]` com `questions[]` com ID; `answer` → `correctAnswer`.
  - `subject` (string) → cria/reusa `Subject` e grava `subjectId`.
  - `reviewSchedule[]` → registros em `reviews[]` com `status` derivado de `done`.
  - `calendarEvent` → um `AcademicEvent` com `contentIds: [id]`; mapear os tipos pt-BR de `src/constants.js:3` para os tipos canônicos (`Prova`→`exam`, `Trabalho`→`assignment`, `Apresentação`→`class`, `Revisão`→descartado, vira `Review`).
  - `time` ("Há 2 dias") → **não migra**; `createdAt` é reconstruído do `reviewSchedule[0].dueAt - 1 dia` quando possível, senão `nowIso()`.
- `sv_items` é **preservado** como backup (`sv_items_backup_v1`), não apagado.
- **Revisão:** popular `sv_items` com o formato antigo no navegador, recarregar, confirmar que nada some e que `sv_items` original continua lá.

### T5 — Serviços
Adaptar `src/services/`, reusando o que já existe:
- `contentService.js` — `createContent`, `getContent`, `getContents`, `updateContent` (nunca toca IDs), `deleteContent` (cascade), `addImageToContent`, `removeImageFromContent`, `reorderImages`, `updateNotes`, `moveContentToSubject`.
- `subjectService.js` — `createSubject`, `renameSubject`, `deleteSubject(id, { reassignTo })` — a exclusão **exige** destino explícito para os conteúdos, nunca apaga em cascata silenciosamente.
- `studyService.js` — `recordFlashcardAttempt`, `recordQuizAttempt` (ambos **append**, jamais sobrescrevem), `getAttemptsForContent`, `calculateMastery(contentId)` com os cortes `<60% needs_review / 60-79% developing / ≥80% mastered`, `not_started` sem tentativa alguma.
- `reviewService.js` — reaproveitar as offsets D+1/D+3/D+7/D+15/D+30 já em `src/services/reviewEngine.js:5-11`, mas emitindo entidades `Review`. Manter `isDue`, `formatDue`, `markReviewDone`, `shuffle` como estão (funcionam).
- `eventService.js` — CRUD de `AcademicEvent`, `linkContentToEvent`, `getEventsForContent`.
- `performanceService.js` — derivações **só** do que é medível: conteúdos criados, questões respondidas/corretas, taxa de acerto, flashcards revisados/acertados, contagem por nível de domínio. **Sem `studyHours`** — não é medido. Construído nesta fase, ligado à UI só na Fase 2.
- **Revisão:** cada serviço isolado; confirmar que `updateContent({title})` não altera nenhum ID.

### T6 — Normalização da resposta Gemini
- `src/services/studyVisionService.js` — `toStudyItem` (linhas 50-76) vira `normalizeAnalysisResult(geminiResponse)`, produzindo um `Content` válido: gera todos os IDs, aplica defaults para campos ausentes, converte `flashcards[{question,answer}]` → `{front,back}` com ID, empacota `quiz[]` num objeto `Quiz` com questões identificadas, e passa por `validateContent` antes de retornar.
- **Não alterar `api/analyze.js` nem `lib/gemini.js`** — o contrato de rede fica igual. `normalizeResult` do backend (`api/analyze.js:16-26`) continua fazendo a correção de desvios do modelo; a normalização nova é a camada de domínio no cliente.
- Recuperar `extractedText` e `difficulty`, que hoje são gravados e nunca lidos.
- **Revisão:** alimentar a função com uma resposta completa da Gemini, uma parcial (sem quiz, sem keywords) e uma malformada. Nenhuma deve lançar.

### T7 — Adaptador de compatibilidade + religação das telas
Para não redesenhar UI nesta fase, um adaptador fino traduz `Content` → o shape que as telas já esperam:
- `src/data/adapters/toLegacyItem.js` — projeta `title`→`concept`, `keyConcepts`→`concepts`, `images[0].dataUrl`→`photo`, `quizzes[0].questions`→`quiz[]`, `openQuestions[].question`→`questions[]`, `createdAt`→`time` via `relativeLabel`, e resolve `subjectName`/cor/emoji com `getSubjectMeta` de `src/constants.js:61-65` (já existente, reusar).
- `src/hooks/useStudyItems.js` passa a ler pelo `contentService` e mapear pelo adaptador. Telas ficam **intocadas**.
- `src/screens/SummaryScreen.jsx:13-39` passa a persistir via `contentService.createContent` em vez de montar o objeto à mão.
- `src/services/storage.js` vira um shim fino sobre os serviços novos (ou é removido se nenhum consumidor sobrar) — decidir na execução, sem deixar duas fontes de verdade.
- **Revisão:** navegar por todas as 10 telas com dados migrados e confirmar paridade visual exata.

### T8 — Seeds e mocks
- Migrar os 5 seeds de `src/data/sampleContent.js` para o modelo novo, com `isSample: true` e **sem** `done:true` forjado.
- Remover o código morto confirmado pela auditoria: `CAPTURE_POOL` / `nextCaptureTemplate` / `peekCaptureTemplate` (`sampleContent.js:170-179`) e `SUBJECT_FILTERS` (`src/constants.js:12`) — nenhum consumidor.
- **Não tocar** em `plusMetrics.js` nem nos componentes `plus/` (decisão do usuário).
- Documentar num `MOCKS.md` curto: o que sobrou de sintético, quem consome, e qual serviço real o substitui na Fase 2.
- **Revisão:** `npm run build` limpo; nenhum import quebrado.

### T9 — Cenários de teste
Script Node em `scripts/test-data-layer.mjs` (roda com `node`, sem framework novo — o projeto não tem test runner e a Fase 1 não é hora de adicionar um), com um shim de `localStorage` em memória. Cobre os 20 cenários exigidos: criar conteúdo → adicionar 1ª foto → adicionar 2ª foto **ao mesmo conteúdo** (assert: não criou conteúdo novo) → editar título (assert: ID inalterado) → editar resumo (assert: flashcards/quiz/imagens intactos) → anotações → flashcards → acerto → erro (assert: 2 tentativas, nada sobrescrito) → quiz → tentativa → desempenho → revisão → evento → vínculo evento↔conteúdo → matéria → mover conteúdo (assert: ID inalterado) → excluir conteúdo → **varredura de referências órfãs** → round-trip de persistência.
- **Revisão:** todos os cenários passam; a varredura de órfãos volta vazia.

---

## Arquivos principais

Novos: `src/utils/id.js`, `src/utils/date.js`, `src/data/models/*`, `src/data/storage/{db,migrations}.js`, `src/data/adapters/toLegacyItem.js`, `src/services/{contentService,subjectService,studyService,reviewService,eventService,performanceService}.js`, `scripts/test-data-layer.mjs`, `MOCKS.md`.

Modificados: `src/services/studyVisionService.js`, `src/services/storage.js`, `src/hooks/useStudyItems.js`, `src/screens/SummaryScreen.jsx`, `src/data/sampleContent.js`, `src/constants.js`.

Reusar sem reescrever: offsets e `formatDue`/`shuffle` de `src/services/reviewEngine.js`, `getSubjectMeta`/`getSubjectEmoji` de `src/constants.js:57-65`, tratamento de quota de `src/services/storage.js:29-42`, `captureFrame`/`makeThumbnail` de `src/utils/image.js`.

Intocados: `api/analyze.js`, `lib/gemini.js`, `lib/prompts.js`, `src/data/plusMetrics.js`, todos os `src/components/`, `src/screens/CameraScreen.jsx`.

## Verificação

1. `node scripts/test-data-layer.mjs` — os 20 cenários, incluindo a varredura de referências órfãs.
2. `npm run build` sem erros.
3. `npm run dev` com um `sv_items` legado pré-populado: recarregar e confirmar que os conteúdos antigos aparecem íntegros na biblioteca e que `sv_items_backup_v1` existe.
4. Percorrer manualmente as 10 telas comparando com a UI atual — a Fase 1 não pode produzir diferença visual.
5. Captura real com a câmera → Gemini → salvar → recarregar a página → o conteúdo persiste com imagem, resumo, conceitos, flashcards e quiz.

## Convenções de commit e de arquivos

- **Um commit por tarefa (T1…T9)**, seguindo Conventional Commits com **descrição em português**. O tipo (`feat`, `fix`, `refactor`, `chore`, `docs`, `test`) permanece em inglês, como manda a convenção. Exemplos:
  - `feat(data): adiciona modelos de Content, Subject e Flashcard`
  - `refactor(storage): migra persistencia para chave versionada sv_db`
  - `test(data): cobre os 20 cenarios da camada de dados`
- **Autoria exclusiva do usuário.** Nenhuma linha `Co-Authored-By` e nenhuma menção a Claude/IA na mensagem ou no corpo do commit.
- **Todos os arquivos ficam dentro da raiz do projeto** (`c:\Users\isacn\Desktop\studyvision`) — nada em pastas temporárias do sistema nem fora do repositório. `MOCKS.md` vai na raiz, junto de `PRD.md` e `README.md`; o script de teste vai em `scripts/`.
- Trabalho na branch `main` (padrão atual do repositório), commitando apenas quando a tarefa correspondente estiver verificada.

## Fora de escopo (Fase 2)

Ligar `FlashcardsScreen` / `QuizScreen` aos serviços de tentativa; trocar a fonte do dashboard Vision+ de `plusMetrics.js` para `performanceService`; UI de anotações, múltiplas imagens, gestão de matérias e eventos; separar visualmente revisões de eventos acadêmicos no calendário; remover os mocks de Notion/PDF/calendário.
