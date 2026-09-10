# PRD — Study Vision (JOVI Smartphones)

> Documento vivo. Atualizar sempre que uma decisão de escopo, fluxo ou regra de negócio mudar. Baseado no que está implementado em `src/` + `api/` + `lib/` em **2026-09-05** (Fase 6 — integração final).

## 1. Contexto

Study Vision é uma funcionalidade conceito para smartphones **JOVI**: a câmera do celular reconhece conteúdo de estudo (livro, caderno, quadro) e transforma automaticamente em material estruturado (resumo, flashcards, perguntas, quiz) com revisão espaçada.

Tagline: *"A câmera que captura conhecimento."*

Este repositório é o **protótipo clicável** (React + Vite) usado no Pitch de Inovação, rodando dentro de uma moldura de smartphone simulada — não é o produto final embarcado no hardware.

## 2. Problema

Estudantes fotografam conteúdo (slides, quadro, livro) constantemente, mas essas fotos só acumulam na galeria sem virar aprendizado ativo. Falta um passo entre "capturar" e "estudar de verdade" (resumir, testar conhecimento, revisar antes de esquecer).

## 3. Proposta de valor

Transformar a câmera — algo que o usuário já usa todo dia — no ponto de entrada para estudo ativo, sem esforço extra: aponta, tira a foto, e a IA organiza tudo (resumo, conceitos, flashcards, perguntas, quiz, cronograma de revisão).

## 4. Público-alvo

Estudantes (ensino médio/superior/concursos) que fotografam conteúdo de estudo com frequência e têm dificuldade em manter rotina de revisão.

## 5. Escopo já implementado

### 5.1 Fluxo principal (câmera → resumo) — **IA real (Gemini)**
1. **Câmera** (`CameraScreen`) — viewfinder com **câmera real do dispositivo** (`getUserMedia`, `facingMode: "environment"`), quadro de foco central, botão de obturador. Permissão negada / câmera indisponível mostra overlay de erro com "Tentar novamente"; obturador fica desabilitado até o stream estar pronto.
2. **Captura** — ao tocar no obturador, um frame do `<video>` é capturado via `canvas` (`src/utils/image.js`, redimensionado a até 1280px) e enviado para `POST /api/analyze`.
3. **Análise** (`AnalysisScreen`, `useAnalysis` hook) — loading conectado ao estado real da requisição (`uploading` → `analyzing` → `generating`), sem timeout artificial. Em erro (rede, Gemini indisponível, imagem ilegível, etc.), mostra mensagem amigável com "Tentar novamente" / "Voltar à câmera".
4. **Backend** (`api/analyze.js`, Serverless Function) — valida a imagem, chama a **Gemini API** (`lib/gemini.js` + `lib/prompts.js`) em uma única chamada multimodal, valida/normaliza a resposta e devolve JSON estruturado (matéria, assunto, resumo, conceitos, palavras-chave, flashcards, questões abertas, quiz, dificuldade). Imagem ilegível ou sem conteúdo educacional retorna `success: false` com mensagem amigável — nunca inventa conteúdo.
5. **Resumo** (`SummaryScreen`) — mostra matéria/tópico/conceito identificados **pela IA a partir da foto real**, resumo gerado, conceitos e palavras-chave, com a própria miniatura da foto capturada. Ação: Salvar (persiste em `localStorage`, com poda automática se a foto estourar a cota) ou ir direto à Biblioteca.

Fotos diferentes produzem resultados diferentes — testado com fotos reais de Física (Leis de Ohm), História (Absolutismo) e Matemática (Derivadas), cada uma classificada e resumida corretamente pela IA a partir do conteúdo real da imagem, não do nome do arquivo.

### 5.2 Biblioteca e conteúdo salvo
- **Biblioteca** (`LibraryScreen`) — lista de conteúdos salvos, busca por texto, filtro por matéria, badge de "revisar hoje" quando aplicável.
- **Grade de pastas de matéria** (`SubjectFolderGrid`) — fileira **rolável na horizontal** (não quebra mais linha), com setas de navegação ("Ver mais matérias") e botão de scroll. Estilo em CSS module (`SubjectFolderGrid.module.css`).
- **Detalhe do conteúdo** (`ContentDetailScreen`) — resumo, conceitos, palavras-chave, nível de domínio (`not_started`/`needs_review`/`developing`/`mastered`, com mínimo de 3 interações antes de "dominado"), desempenho real de quiz/flashcards, próxima revisão pendente, acesso a Flashcards / Quiz / Perguntas.

### 5.3 Modos de estudo
- **Flashcards** (`FlashcardsScreen`) — cartão com flip 3D, avaliação "Lembrei" / "Não lembrei". Plano grátis: limite de **5 flashcards por conteúdo** (`FREE_FLASHCARD_LIMIT`) + CTA de upsell nos cards bloqueados. Com **Study Vision+ ativo** (`isPremium`): libera todos os cards do item + cards extras (`extraCards`), sem bloqueio.
- **Perguntas** (`QuestionsScreen`) — perguntas dissertativas geradas. Ilimitado no grátis; conteúdo adicional/personalizado é diferenciado quando `isPremium`.
- **Quiz** (`QuizScreen`) — múltipla escolha / verdadeiro-falso, feedback imediato, placar final. Recebe `isPremium`.

### 5.4 Revisão espaçada
- No máximo **uma revisão pendente por conteúdo** (`reviewService`), criada em D+1 ao salvar o conteúdo (`scheduleInitialReview`). Cada atividade (quiz/flashcards) reagenda essa pendente pelo desempenho real via `REVIEW_INTERVALS`: sem dados ou `<60%` → 1 dia; `60-79%` → 3 dias; `80-89%` → 7 dias; `≥90%` → 14 dias. Revisão agendada manualmente (`reason: "manual"`) nunca é sobrescrita pelo cálculo automático.
- **Revisão** (`ReviewScreen`) — separa "Para hoje" (vencidas) de "Próximas revisões" (ordenadas por data).
- Revisar um conteúdo abre o modo Flashcards em `reviewMode`; ao concluir, `markReviewDone` marca a pendente atual como concluída e `ensureNextReview` garante a próxima, voltando para a tela de Revisão com toast de confirmação.
- Contador de pendências (`dueCount`) exibido como badge vermelho na nav inferior, no ícone "Revisão".

### 5.5 Evolução (dashboard gratuito)
- **Evolução** (`EvolutionScreen`, 4º destino da nav) — dashboard de aprendizado, **gratuito e completo**, alimentado por `evolutionService` (que por sua vez deriva tudo de `performanceService`/`reviewService`/`studyService`/`contentService`/`subjectService` — nenhum dado próprio). Seções: Resumo (conteúdos estudados, questões respondidas, taxa de acerto, reviews concluídas), Desempenho geral (anel + distribuição de domínio), Evolução por matéria (com drill-down para a Biblioteca filtrada), Evolução semanal (`getProgressHistory`, só semanas com tentativa real, sem interpolar), Precisa de reforço (conteúdos fracos ou com revisão atrasada, com drill-down para o conteúdo), Reviews (pendentes/concluídas/atrasadas), Pontos fortes (matérias com ≥80% de acerto). Toda taxa é `null` ("Sem dados ainda") quando não há denominador — nunca `0%`. Tela vazia (nenhum conteúdo) mostra estado vazio único, incentivando a primeira captura.
- **Insights** é a única seção da Evolução que fica atrás de paywall: recomendações determinísticas (`getRecommendations`, sem IA) + delta de acerto das últimas semanas (`getAccuracyDelta`).

### 5.6 Monetização — Study Vision+ (oferta de teste)
- **Vision+** (`VisionPlusScreen`) é uma **tela de oferta**, não um dashboard — o dashboard de evolução é gratuito e vive em 5.5. Composição: `PlusHeader` (long-press no selo dispara `onResetToFree`, reset de demonstração) → `PlusHero` (grátis) **ou** `PlusActiveStatus` com contador de dias do teste (premium) → `PlanComparison` (Free × Plus) → `PlusFinalCta` (só quando grátis).
- **Estado de assinatura** — `services/subscriptionService.js` + hook `useSubscription` (fonte única, chamado 1x em `App.jsx`, propagado via prop `isPremium`).
  - `localStorage["sv_subscription"] = { plan: "free" | "premium", status: "active" | "trial" | "expired", trialStartedAt: ISO | null, trialEndsAt: ISO | null }`.
  - `startTrial()` grava `plan: "premium"`, `status: "trial"`, `trialEndsAt` 7 dias à frente (`TRIAL_DAYS`).
  - **O teste expira de verdade**: toda leitura de `getSubscription()` compara `trialEndsAt` com `Date.now()` e rebaixa para `plan: "free"`, `status: "expired"` quando vencido — sem precisar de ação manual. `useSubscription` reavalia também ao voltar de background (`visibilitychange`).
  - `resetToFree()` volta ao grátis (long-press no selo, toast `"Demonstração reiniciada"`).
  - **Ainda não há checkout/pagamento real** — não cobra R$ 9,90/mês, sem gateway, sem conta de usuário. É só o estado local que destrava/trava features específicas.
- Regra de negócio: **grátis já entrega o produto inteiro** — captura, biblioteca, resumos, quiz, flashcards (limite de 5 por conteúdo), reviews e a Evolução completa. Plus soma: flashcards personalizados ilimitados, quizzes/perguntas ilimitados e a seção de Insights.

### 5.7 Navegação
- Nav inferior com 4 destinos: Câmera, Biblioteca, Revisão, Evolução. Vision+ deixou de ser item de nav — é alcançada pelo CTA de Insights na Evolução (`go("visionplus")`), preservando o histórico de navegação para o "Voltar".
- Histórico de navegação simples (`useNavigation` / `prevScreens`) para o botão "Voltar" dentro de fluxos (ex: Biblioteca → Detalhe → Flashcards).

### 5.8 Responsividade
- Em telas ≤480px de largura (celulares reais), a moldura decorativa de smartphone some e o app ocupa a tela inteira (100vw/100dvh, sem bezel/`border-radius`), como um app de verdade.
- Em telas maiores (desktop/tablet), mantém a moldura de smartphone 375×812 centralizada, com `max-width`/`max-height` para não estourar viewports menores que isso.
- Implementado via CSS (`PhoneFrame.module.css` / `src/styles`) com media query, em vez de estilos inline fixos.

### 5.9 Exportar conteúdo e calendário acadêmico
- **Exportar Conteúdo** (`ExportSection`, na tela de Resumo e no Detalhe do conteúdo) — modal dialog (padrão `Modal` + `Button` do design system) com 3 opções: **Notion** (`notionService.exportToNotion` — **único mock do produto**, `setTimeout` que resolve uma URL falsa, mantido deliberadamente para a demonstração), **PDF real** (`exportService.exportDocument`, gerado sob demanda com `jsPDF` — resumo, itens relacionados e perguntas abertas; ainda sem quiz/flashcards) e **Copiar Conteúdo** (`exportService.copyContent`, `navigator.clipboard`, propaga erro em vez de engolir).
- **Calendário acadêmico** (`ReviewScreen`, seção "Calendário acadêmico") — grid mensal só de eventos (`AcademicEvent`: Prova/Trabalho/Aula/Entrega/Outro), com CRUD completo real: `EventFormModal` (criar/editar, com `contentIds[]` opcional) e `DayEventsModal` (ver/editar/excluir por dia). Tudo persistido em `sv_db` via `eventService`/`calendarService` — sem OAuth, sem API do Google Calendar, sem sincronização externa; é um calendário acadêmico próprio do app, não uma integração.
- **Revisão ≠ Evento** — `scheduleCommitment` (`calendarService`) roteia "Revisão" para `reviewService.scheduleManualReview` (entidade `Review`) e os demais tipos para `eventService.createEventEntry` (entidade `AcademicEvent`); as duas coleções nunca se misturam.
- **Content ↔ Evento** — um Content pode ter N eventos vinculados (`CommitmentsSection`, lista todos, não só o mais recente); abrir o evento pelo calendário permite ir ao Content, e abrir o Content permite ver/criar/editar seus compromissos.

### 5.10 Imagem de conteúdo capturado
- `CapturedPageVisual` (`src/components/brand/`) — renderização **data-driven**: se o item tem `photo`, mostra a foto real (agora a miniatura da foto capturada pela câmera, gerada em `src/utils/image.js`); senão cai na simulação visual (página inclinada com linhas de texto, ícone da matéria no canto, vinheta de câmera, cantos de enquadramento) — usado só pelos itens semente sem foto. Usado na tela de Resumo e no Detalhe do conteúdo.
- O ciclo fixo de captura (`CAPTURE_POOL`/`nextCaptureTemplate`) foi **removido** junto com a câmera simulada — cada captura agora gera um item novo a partir da análise real da IA.

### 5.11 Matérias
- **Sem semente/conteúdo de demonstração** — o app começa vazio; toda matéria e todo conteúdo vêm de uma captura real ou de `subjectService.createSubjectEntry`/`ensureSubject`, que normaliza e reaproveita por nome (case/acento-insensitive).
- **Matérias são dinâmicas**: o filtro da Biblioteca (`LibraryScreen`) é derivado das matérias realmente presentes nos itens salvos, não de uma lista fixa — uma matéria nova identificada pela IA (Biologia, Filosofia, Geografia, Sociologia, Inglês, Artes, Redação, entre outras) aparece automaticamente no filtro.
- `SUBJECT_META` (`src/constants.js`) tem entradas para as matérias mais comuns; `getSubjectMeta(nome)` gera um fallback de cor/ícone determinístico (hash do nome) para qualquer matéria fora da lista, então nada fica sem cor/ícone.

### 5.12 Modo Inclusão — preferências de aprendizagem (Fase 10)
- "Seu jeito de aprender": o estudante escolhe uma ou mais de quatro formas de o Study Vision **adaptar a apresentação** do conteúdo — **Simplificar**, **Foco**, **Visual**, **Passo a passo**. Não é diagnóstico, não classifica o usuário, não cita condição médica; muda só linguagem, ênfase e organização, nunca a veracidade ou as respostas corretas.
- Configuração inicial (pulável) na primeira abertura da câmera; depois editável pelo ⚙️ do cluster central da câmera. Ambos usam o mesmo bottom sheet (`LearningPreferencesSheet`).
- Depois da captura, um passo "Sua captura" mostra a foto e as preferências que serão usadas (pré-marcadas com o padrão do usuário); dá para ajustar só para aquela captura, ou marcar "Tornar meu padrão".
- As preferências vão para a IA junto da imagem, via `buildAnalysisPrompt` (`lib/prompts.js`) — mesma chamada `POST /api/analyze`, mesmo modelo. Sem nenhuma preferência ativa o prompt é idêntico ao de antes do Modo Inclusão.
- O resumo passa a ser renderizado (`ContentBlocks`) reconhecendo subtítulos, listas e etapas numeradas; conteúdo antigo (resumo em parágrafo corrido) renderiza igual. O conteúdo gerado continua sendo um `Content` normal — biblioteca, quiz, flashcards, revisões, evolução e Chama do Conhecimento não mudaram.

## 6. Modelo de dados (`localStorage`, alimentado por IA real)

Camada de dados relacional (Fases 1-4; Fase 5 só lê, via `evolutionService`, nunca escreve nada novo em `sv_db`), versão de schema `2`, definida em
`src/data/models/` e persistida como um único objeto em `localStorage["sv_db"]`
via `src/data/storage/` (`readDb`/`writeDb`/`withDb` — nenhum outro módulo
acessa `localStorage` diretamente). Migração automática do formato legado
(`sv_items`, v1) para o v2 roda uma vez, na primeira leitura/escrita da sessão.

`Content` é a entidade central: `id`, `subjectId?`, `subjectName` (cache de
leitura; `subjectId: null` + `subjectName: ""` é um estado válido — conteúdo
"Sem matéria"), `topic`, `title`, `summary`, `notes`, `keyConcepts[]`,
`keywords[]`, `extractedText?`, `difficulty?` (vindo da IA), `recommendedDifficulty?`
(derivado do desempenho real, nunca do `difficulty`), `images[]`, `flashcards[]`,
`quizzes[]`, `openQuestions[]`, `mastery` (`score`, `level`, `updatedAt`),
`reviewPlan` (`none`/`weekly`/`biweekly`/`monthly`), `learningPreferences?`
(Fase 10 — objeto `{ simplify, focus, visual, stepByStep }` de booleanos, ou
`null` = conteúdo gerado sem o Modo Inclusão; rastro de qual adaptação gerou o
material, prepara medição futura de desempenho por formato), `createdAt`/`updatedAt`.

Entidades relacionadas, cada uma referenciando `content.id`:
- `Subject` — `id`, `name`, `createdAt`/`updatedAt`. CRUD completo (`subjectService`), com reaproveitamento por nome (case/acento-insensitive) e destino obrigatório ao excluir matéria com conteúdo vinculado.
- `Flashcard` / `FlashcardAttempt`, `Quiz`/`Question` / `QuizAttempt` — tentativas são *append-only*, nunca sobrescritas.
- `Review` — revisão espaçada, no máximo uma pendente por conteúdo, reagendada por desempenho real (1/3/7/14 dias).
- `AcademicEvent` — `id`, `type` (`exam`/`assignment`/`class`/`deadline`/`other`), `title`, `date`, `time?`, `notes`, `reminders[]`, `contentIds[]` (N:N — um evento pode não ter nenhum conteúdo, ou vários). **Nunca inclui revisão** — Review e AcademicEvent são entidades e coleções distintas por decisão de arquitetura.

Persistência:
- `localStorage["sv_db"]` — `{ version, subjects[], contents[], flashcardAttempts[], quizAttempts[], reviews[], events[], flameGoals, learningPreferences }`. `flameGoals` (Fase 9) guarda a meta semanal da Chama e o carimbo por semana; `learningPreferences` (Fase 10) guarda a preferência **padrão** do Modo Inclusão (`{ configured, updatedAt, options }`). Ambos entram por coerção defensiva no `readDb`, sem bump de `version`. Se a cota estourar (fotos em base64 pesam), os conteúdos mais antigos são podados automaticamente e, em último caso, salvos sem imagem.
- `localStorage["sv_subscription"]` — estado do plano (`plan`, `status`, `trialStartedAt`, `trialEndsAt`), ver 5.6. Fica fora de `sv_db`: assinatura nunca influencia dado acadêmico.
- `integrityService.sweepOrphans()` roda ao abrir o app: remove tentativas/revisões apontando para conteúdo inexistente, limpa `contentIds` órfãos em eventos (sem apagar o evento) e reseta `subjectId` de conteúdo cuja matéria não existe mais.

Backend serverless (Vercel) para a análise de imagem via Gemini (ver 5.1); sem banco de dados remoto, sem autenticação, sem sincronização entre dispositivos.

## 7. Limitações conhecidas do protótipo

- **Sem OCR dedicado** — a leitura de texto na imagem é feita pelo próprio Gemini multimodal (não usa Tesseract.js); previsto como possível camada de fallback futura (ver 12).
- **Sem backend de dados/autenticação** — a IA roda em backend real (Serverless Function), mas a biblioteca continua em `localStorage`, local ao navegador; limpar dados do site apaga a biblioteca e o estado de plano.
- **Study Vision+ sem cobrança** — `startTrial()` só faz o toggle local de plano (`sv_subscription`); não há checkout, gateway de pagamento, paywall real com cartão, nem conta de usuário. A trava/destrava das features funciona, o dinheiro não existe.
- **Responsividade verificada em 320/375/430/768px e desktop (Fase 6)**, sempre dentro da moldura de smartphone do protótipo (ver 5.7) — sem layout fluido de desktop e sem teste específico de orientação landscape.
- **Exportar para o Notion continua mockado** (ver 5.9) — único mock restante do produto, mantido por decisão deliberada para a demonstração; PDF, cópia de texto e o calendário acadêmico já são reais desde a Fase 2/4.
- **Sem resolução de exercícios pela IA** — o Gemini resume e gera material de estudo a partir do conteúdo capturado, mas não resolve passo a passo problemas matemáticos ou exercícios abertos.
- **`getUserMedia` exige HTTPS** (ou `localhost`) — em produção funciona normalmente (Vercel serve HTTPS); só não funciona acessando por IP puro em rede local sem certificado.

## 8. Stack técnica

**Frontend:** React 18 + Vite 8 + framer-motion (animações/transições) + lucide-react (ícones) + CSS Modules. Código organizado em `src/screens`, `src/components` (`brand`, `layout`, `plus`, `study`, `ui`), `src/hooks`, `src/services`, `src/data`, `src/styles`, `src/utils`.

**Backend (IA real):** `api/analyze.js` — Serverless Function Node.js (Vercel) que expõe `POST /api/analyze`; `lib/gemini.js` centraliza a chamada à **Gemini API** (`@google/genai`, modelo configurável via `GEMINI_MODEL`, chave via `GEMINI_API_KEY` — nunca exposta ao frontend); `lib/prompts.js` centraliza o prompt de análise. Em desenvolvimento, um plugin do próprio `vite.config.js` serve `/api/analyze` dentro do `vite dev`, sem precisar de servidor separado.

Deploy publicado: https://study-vision-one.vercel.app

## 9. Horizonte do projeto

Este PRD é para uso pessoal do autor (Isac), servindo de referência de contexto entre sessões — não é material para banca/avaliadores nem para um time técnico externo (ainda).

Fases previstas para o pitch:
1. **Fase atual** — protótipo clicável mockado (este repo), usado para apresentar o conceito.
2. **Se aprovado para próxima fase** — evoluir o protótipo para o mais próximo possível de um produto real e usável (ainda dentro do escopo de pitch/demo, mas reduzindo o quanto for mockado).
3. **Se selecionado na fase final** — o projeto entra em desenvolvimento oficial com a JOVI (produto real, presumivelmente com câmera nativa, OCR/IA real, backend, contas de usuário, pagamento etc.).

Sem prazo definido no momento.

## 10. Evolução do projeto (changelog)

Ordem cronológica das principais entregas desde o baseline do PRD (2026-08-07).

### 10.1 Refatoração de arquitetura
- Monólito `src/StudyVision.jsx` quebrado em scaffold Vite completo (screens / components / hooks / services / data / styles). Todas as referências deste PRD que citavam `src/StudyVision.jsx` agora apontam pros módulos correspondentes.

### 10.2 Study Vision+ — dashboard premium (2026-08-20)
- `VisionPlusScreen` reconstruída: header + hero premium, cards de métricas, evolução por matéria, gráfico de desempenho, pontos fortes / pontos de atenção / insight da semana, comparação Free vs Plus.
- `PlusPaywall`: overlay com blur + degradê; bloqueio seletivo nas seções de profundidade.
- Ativação simulada de teste de 7 dias: `useSubscription` + `services/subscription.js`, estado `sv_subscription`, contador de dias, reset via long-press no selo.
- Materiais ilimitados liberados no Plus **sem reduzir** o plano gratuito.
- Microinterações, ajustes de copy/posicionamento de CTAs, ajustes de responsividade e verificação de fluxo completo.

### 10.3 Study Vision+ — rodada de enxugamento (2026-08-21)
- Modo compacto no paywall + redução de CTAs repetidas.
- Removida seção de recursos redundante com a comparação de planos.
- Comparação de planos ocultada para quem já é assinante.
- Saldo da rodada: -39 linhas líquidas, tudo dentro do escopo Plus; build mais rápido.

### 10.4 Padronização do Exportar Conteúdo (2026-08-21)
- `ExportSection` migrada de botões inline para modal dialog (padrão `Modal`), adotando o `Button` do design system e tokens de cor consistentes.

### 10.5 Múltiplas matérias e captura variada (2026-08-21)
- Adicionados Física (Leis de Ohm) e Português (Absolutismo) com conteúdo educacional completo e fotos reais (`exemplo2_fisica.jpg`, `exemplo3_portugues.jpg`).
- `SUBJECT_FILTERS` expandido (Física + Português); `SUBJECT_META` com ícone/cor por matéria.
- `CapturedPageVisual` passa a renderizar foto por propriedade `photo` do item (data-driven), não mais por contexto de tela.
- `CAPTURE_POOL` = itens com `photo`; carrossel de preview no viewfinder via `peekCaptureTemplate`.
- Grade de pastas de matéria: de grid que quebrava linha para fileira rolável na horizontal (`SubjectFolderGrid.module.css`), com setas de navegação ("Ver mais matérias"); correção de seta desalinhada e clique bloqueado.

### 10.6 Documentação e deploy (2026-08-21 a 2026-08-28)
- `README.md` expandido pros critérios mínimos de entrega: tecnologias, instalação, execução, credenciais de teste (sem auth — mockado), explicação do uso de IA, link de deploy.
- `integrantes.txt` adicionado; ícone da página HTML configurado.
- Migração de deploy: GitHub Pages descontinuado, projeto recriado do zero na **Vercel** (build via `npm run build`, saída `dist/`), com `vercel.json` explícito e domínio de produção próprio.

### 10.7 IA real com Gemini (2026-09-01)
- **Câmera real**: `CameraScreen` passa a usar `getUserMedia` (stream ao vivo no viewfinder, com fallback de erro/permissão negada), no lugar da imagem estática de fundo.
- **Backend novo**: `api/analyze.js` (Serverless Function) + `lib/gemini.js` + `lib/prompts.js` — `POST /api/analyze` recebe a foto capturada, chama a Gemini API (`gemini-flash-lite-latest`) em uma única chamada multimodal e devolve matéria, assunto, resumo, conceitos, palavras-chave, flashcards, questões abertas e quiz em JSON estruturado.
- **Achado de implementação**: usar `responseSchema` (saída 100% restrita pelo schema do Gemini) causou `503`/timeout consistentes (>130s) em múltiplos modelos testados. Resolvido trocando para `responseMimeType: "application/json"` com o formato exigido descrito diretamente no prompt, mais uma normalização defensiva no backend (`normalizeResult`) para pequenos desvios de forma — latência caiu para 5–10s.
- **Fluxo ponta a ponta real**: `useAnalysis` (novo hook) orquestra captura → upload → análise → resultado, com `AnalysisScreen` refletindo o status real da requisição (sem timeout artificial) e tratamento amigável de erro (rede, Gemini indisponível, imagem ilegível, conteúdo não educacional) com "Tentar novamente".
- **Adaptador** `studyVisionService.toStudyItem` converte a resposta da IA para o mesmo formato de item usado por toda a biblioteca/flashcards/quiz/revisão — nenhuma dessas telas precisou mudar de contrato de dados.
- **Matérias dinâmicas**: filtro da Biblioteca deixa de ser uma lista fixa de 5 matérias e passa a refletir as matérias realmente salvas; `getSubjectMeta` cobre matérias novas com fallback de cor/ícone.
- **Bug corrigido**: `QuizQuestion`/`QuizScreen` comparava o valor da alternativa escolhida com o índice numérico da resposta correta — nenhuma questão de múltipla escolha podia ser marcada como certa. Corrigido para comparar por índice (mc) / valor booleano (vf); explicação da IA agora aparece após responder.
- **Persistência mais robusta**: `saveItem` passa a podar itens antigos automaticamente se a foto real estourar a cota do `localStorage`, e deduplica por `id` em vez de por `concept`.
- **Segurança**: `GEMINI_API_KEY` só existe no backend (`process.env`), nunca em `VITE_*`/frontend; `.gitignore` corrigido para nunca versionar `.env*` (com exceção do `.env.example`, template sem segredo); build de produção auditado (`grep` no bundle) sem nenhum resquício de chave ou código de servidor.
- Testado de ponta a ponta com fotos reais de Matemática, Física e História — cada uma corretamente identificada e resumida a partir do conteúdo real da imagem (inclusive quando o nome do arquivo dizia outra matéria).

### 10.8 Fase 6 — integração final (2026-09-05)
- **Erro de imagem sem conteúdo acadêmico** diferenciado de falha técnica: `AnalysisError` ganha `kind` (`"not_academic"` | `"technical"`), `AnalysisScreen` mostra copy e ações próprias para cada caso.
- **Notas do estudante** — bloco "MINHAS NOTAS" no Detalhe do conteúdo (`NotesSection`), sempre separado do resumo da IA, gravando por `updateNotes`.
- **Título e resumo editáveis** — edição inline no Detalhe do conteúdo, persistindo por `updateContent`.
- **Múltiplas fotos por Content** — `PhotosSection` liga `addImageToContent`/`removeImageFromContent` à UI; a câmera ganha um modo "anexar" que não dispara análise de IA. `PhotoViewerModal` abre qualquer foto em tamanho maior, com navegação entre páginas.
- **Estados vazios reais** em Quiz, Flashcards, Perguntas (sem placar/contagem falsa quando a IA não gerou aquele material) e no Resumo (sem tela em branco quando não há conteúdo capturado).
- **Evolução reativa ao store** e derivações do Detalhe do conteúdo memoizadas — sem recomputar a cada re-render, sem nenhuma chamada de IA fora da captura.
- **Vision+ com mais entradas** — atalho no header de Revisão e Evolução, além da Biblioteca; CTA de assinatura no fim da Evolução para quem não é premium.
- **Limpeza**: campo `isSample` (lastro de seeds já removidos), componentes órfãos (`ScreenHeader`, `BackButton`, `FilterPills`), `data/models/attempt.js`, assets de exemplo não referenciados, `ANALYSIS_SCHEMA` não utilizado.
- **Auditoria de segurança e responsividade** sem achados que exigissem mudança de código — resultado documentado em `PLANO-FASE-6-INTEGRACAO-FINAL.md`.
- Suíte de testes: de 93 para 101 cenários (`F6-1` a `F6-8`), cobrindo exclusão em cascata, integridade de ciclo completo e estados de falha/dados inválidos.

### 10.9 Fase 7 — revisões atreladas a plano/compromisso (2026-09)
- `Review` ganha intenção (`reason`: `plan` / `commitment` / `manual`); `reviewService` passa a reconciliar as revisões de plano quando o `reviewPlan` do conteúdo muda e a sincronizar checkpoints de compromissos do calendário. Cap de 3 revisões concluídas por dia. Cobertura `F7-*` no runner.

### 10.10 Fase 8 — Chama do Conhecimento (2026-09-06)
- Indicador de **constância semanal** (não streak diário): meta de atividades por semana (Seg→Dom) e contagem de semanas consecutivas cumpridas, **100% derivado** de `quizAttempts` / `flashcardAttempts` / `reviews` — nada novo persistido. `src/services/knowledgeFlameService.js` + `KnowledgeFlameCard`, exibido na tela de Evolução (inclusive no estado vazio). Cobertura `F8-*`.
- Calendário da Revisão redesenhado: dias coloridos pela matéria (gradiente cônico para vários assuntos no mesmo dia) e tipo de compromisso indicado por forma, não por cor; "Aula" removida dos compromissos (com coerção legada).

### 10.11 Fase 9 — meta personalizada da Chama (2026-09-07)
- `sv_db.flameGoals` = `{ preferredWeeklyTarget (1..7), weekTargets: { weekStartKey: n } }` — **histórico imutável**: mudar a meta hoje nunca recalcula uma semana passada. `WeeklyGoalModal` + botão "editar meta" no `KnowledgeFlameCard`, alinhados ao tema da chama. Coerção defensiva no `readDb` sem bump de `version`. Cobertura `F9-1` a `F9-16`.
- Correção de fuso em `futureDateKey` (conversão UTC gerava erro de um dia e um checkpoint de revisão a mais).

### 10.12 Fase 10 — Modo Inclusão: aprendizado adaptativo (2026-09-10)
- Quatro preferências de apresentação (Simplificar, Foco, Visual, Passo a passo) que o estudante escolhe e que passam a compor o prompt do Gemini via `buildAnalysisPrompt` — mesma chamada `POST /api/analyze`, sem preferência = prompt idêntico ao anterior. Guardrails no prompt: só muda a apresentação, nunca a verdade; proibido diagnosticar ou citar condição médica.
- Preferência **padrão** em `sv_db.learningPreferences`; preferência **de uma captura** é local da câmera. Onboarding pulável na 1ª abertura, edição pelo ⚙️, e passo "Sua captura" revisando as preferências antes da análise. Rastro opcional em `Content.learningPreferences`.
- `ContentBlocks` passa a renderizar o resumo com subtítulos / listas / etapas (contrato de marcadores com o prompt); resumo legado (parágrafo corrido) renderiza idêntico. Biblioteca, quiz, flashcards, revisões, evolução e Chama do Conhecimento inalterados.
- Suíte: de 149 para **175** cenários (`F10-1` a `F10-29`). Avaliação qualitativa real (mesma foto, 5 combinações, Gemini real) em `plans/AVALIACAO-FASE-10-INCLUSAO.md` — diferença perceptível e mensurável.

## 11. Análise — concluído vs. pendente

### 11.1 Concluído
- [x] Fluxo câmera → análise → resumo → biblioteca de ponta a ponta, com **câmera real** e **IA real (Gemini)**.
- [x] Backend serverless (`api/analyze.js`) com chave protegida, tratamento de erro amigável e sem timeout artificial.
- [x] Flashcards, perguntas e quiz gerados dinamicamente a partir do conteúdo real da foto.
- [x] Matérias dinâmicas na Biblioteca (não mais uma lista fixa de 5).
- [x] Revisão espaçada por desempenho real (uma pendente por conteúdo, reagendada por `REVIEW_INTERVALS`) e contador de pendências.
- [x] Dashboard de Evolução gratuito e completo (`EvolutionScreen` + `evolutionService`); Study Vision+ como tela de oferta com paywall só nos Insights.
- [x] Estado de plano real-simulado (`sv_subscription`): ativar/reiniciar teste de 7 dias com expiração real, features destravam de verdade quando `isPremium`.
- [x] Exportar Conteúdo em modal padronizado (Notion / PDF-DOCX / Copiar — mock).
- [x] Planejamento no Google Calendar (mock) com revisões automáticas.
- [x] Grade de matérias rolável na horizontal com navegação.
- [x] Responsividade básica (tela cheia ≤480px, moldura no desktop).
- [x] Arquitetura modularizada (scaffold Vite + backend serverless).
- [x] README com critérios de entrega + variáveis de ambiente + deploy na Vercel.
- [x] Notas do estudante, edição de título/resumo, múltiplas fotos por conteúdo e visualização ampliada (Fase 6).
- [x] Estados vazios reais em quiz/flashcards/perguntas/resumo, sem placar ou contagem fabricados (Fase 6).
- [x] Auditoria de segurança e de responsividade sem segredo exposto e sem overflow em 320–768px+desktop (Fase 6).

### 11.2 Pendente / mockado (candidatos aos próximos passos)
- [ ] Checkout / pagamento real do Study Vision+ (hoje é só toggle local).
- [ ] OCR dedicado (Tesseract.js) como fallback quando o Gemini não conseguir ler a imagem.
- [ ] Resolução de exercícios matemáticos (fórmulas, passo a passo) pela IA.
- [ ] Backend de dados + autenticação + sincronização entre dispositivos (biblioteca ainda é só `localStorage`).
- [ ] OAuth e API real do Notion (único mock restante do produto).
- [ ] Geração de PDF com quiz e flashcards inclusos (hoje só resumo/itens/perguntas); compartilhamento nativo Android.
- [ ] Teste de responsividade em orientação landscape.
- [x] Expiração real do teste de 7 dias — resolvido na Fase 5: `subscriptionService.getSubscription()` deriva `status: "expired"` a partir de `trialEndsAt` a cada leitura.
- [ ] Cache/retry mais sofisticado para instabilidade momentânea do Gemini (hoje é "tentar novamente" manual).

## 12. Próximos passos

Priorizados a partir da lista 11.2, por ordem de valor percebido para uma próxima fase de pitch (não implementar sem nova sessão de planejamento — fora do escopo da Fase 6):

1. **Checkout real do Study Vision+** — é o que falta para o modelo de negócio deixar de ser só uma simulação de estado local.
2. **OAuth real do Notion** — reduz de 1 para 0 o número de mocks restantes no produto.
3. **Backend de dados + contas de usuário** — pré-requisito para sincronização entre dispositivos e para qualquer forma de cobrança real.
4. **OCR de fallback (Tesseract.js)** — rede de segurança para quando o Gemini não conseguir interpretar a imagem.
5. **Resolução de exercícios passo a passo pela IA** — natural extensão do resumo/flashcards já existentes, maior esforço de prompt/validação.

## 13. Critério de "pronto" para o protótipo de pitch

- [x] Fluxo câmera → análise → resumo → biblioteca funcionando de ponta a ponta, com câmera e IA reais
- [x] Flashcards, perguntas e quiz gerados dinamicamente a partir da foto capturada
- [x] Revisão espaçada com cronograma e contador de pendências
- [x] Dashboard de evolução gratuito + tela de oferta Study Vision+ com teste de 7 dias (expiração real; ainda sem checkout)
- [x] Deploy publicado e acessível na Vercel, com backend de IA funcionando em produção
