# PRD — Study Vision (JOVI Smartphones)

> Documento vivo. Atualizar sempre que uma decisão de escopo, fluxo ou regra de negócio mudar. Baseado no que está implementado em `src/` + `api/` + `lib/` em **2026-09-01**.

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
- **Detalhe do conteúdo** (`ContentDetailScreen`) — resumo, conceitos, palavras-chave, status da próxima revisão (X/5 concluídas), acesso a Flashcards / Quiz / Perguntas.

### 5.3 Modos de estudo
- **Flashcards** (`FlashcardsScreen`) — cartão com flip 3D, avaliação "Lembrei" / "Não lembrei". Plano grátis: limite de **5 flashcards por conteúdo** (`FREE_FLASHCARD_LIMIT`) + CTA de upsell nos cards bloqueados. Com **Study Vision+ ativo** (`isPlus`): libera todos os cards do item + cards extras (`extraCards`), sem bloqueio.
- **Perguntas** (`QuestionsScreen`) — perguntas dissertativas geradas. Ilimitado no grátis; conteúdo adicional/personalizado é diferenciado quando `isPlus`.
- **Quiz** (`QuizScreen`) — múltipla escolha / verdadeiro-falso, feedback imediato, placar final. Recebe `isPlus`.

### 5.4 Revisão espaçada
- Cronograma fixo por conteúdo: **D+1, D+3, D+7, D+15, D+30** (`REVIEW_OFFSETS`).
- **Revisão** (`ReviewScreen`) — separa "Para hoje" (vencidas) de "Próximas revisões" (ordenadas por data).
- Revisar um conteúdo abre o modo Flashcards em `reviewMode`; ao concluir, marca o próximo estágio do cronograma como feito e volta para a tela de Revisão com toast de confirmação.
- Contador de pendências (`dueCount`) exibido como badge vermelho na nav inferior, no ícone "Revisão".

### 5.5 Monetização — Study Vision+ (upsell)
- **Vision+** (`VisionPlusScreen`) foi reconstruída de uma tela de venda simples para um **dashboard de analytics com paywall**. Composição (ordem na tela):
  - `PlusHeader` — cabeçalho; long-press no selo dispara `onResetToFree` (reset de demonstração).
  - `PlusHero` (quando grátis) **ou** `PlusActiveStatus` com contador de dias restantes do teste (quando `isPlus`).
  - `MetricCards` — cards de métricas do dashboard (sempre visíveis).
  - `SubjectProgress` — evolução por matéria (bloqueada quando grátis).
  - `PerformanceChart` — desempenho semana a semana (bloqueada quando grátis, wrapper `PlusPaywall` com blur + degradê).
  - `StrengthsCard` — pontos fortes (visível).
  - `AttentionCard` — pontos de atenção (`hideNames` quando grátis).
  - `InsightCard` — insight da semana (bloqueado quando grátis).
  - `PlanComparison` — comparativo Free vs Plus (só aparece quando grátis).
  - `PlusFinalCta` — 4º ponto de conversão (só quando grátis).
- **Estado de assinatura real (simulado)** — `services/subscription.js` + hook `useSubscription` (fonte única, chamado 1x em `App.jsx`, propagado via prop `isPlus`).
  - `localStorage` chave `sv_subscription` = `{ status: "free" | "plus", trialStartedAt: ISO | null }`.
  - Botão "Ativar Study Vision+" **agora tem ação**: `startTrial()` grava `status: "plus"` + `trialStartedAt` (teste de 7 dias, `TRIAL_DAYS`), toast `"✓ Study Vision+ ativado"`, scroll pro topo.
  - `trialDaysRemaining()` calcula a contagem regressiva; `resetToFree()` volta ao grátis (long-press no selo, toast `"Demonstração reiniciada"`).
  - **Ainda não há checkout/pagamento real** — não cobra R$ 9,90/mês, sem gateway, sem conta de usuário. É só o toggle de plano local que destrava/trava as features.
- Regra de negócio atual: grátis = até 5 flashcards por conteúdo + perguntas dissertativas ilimitadas + quiz ilimitado + seções de profundidade do Vision+ bloqueadas. Plus = flashcards ilimitados + seções de analytics desbloqueadas.

### 5.6 Navegação
- Nav inferior com 4 destinos: Câmera, Biblioteca, Revisão, Vision+.
- Histórico de navegação simples (`useNavigation` / `prevScreens`) para o botão "Voltar" dentro de fluxos (ex: Biblioteca → Detalhe → Flashcards).

### 5.7 Responsividade
- Em telas ≤480px de largura (celulares reais), a moldura decorativa de smartphone some e o app ocupa a tela inteira (100vw/100dvh, sem bezel/`border-radius`), como um app de verdade.
- Em telas maiores (desktop/tablet), mantém a moldura de smartphone 375×812 centralizada, com `max-width`/`max-height` para não estourar viewports menores que isso.
- Implementado via CSS (`PhoneFrame.module.css` / `src/styles`) com media query, em vez de estilos inline fixos.

### 5.8 Integrações — Notion e Google Calendar (mock)
- **Exportar Conteúdo** (`ExportSection`, na tela de Resumo, antes de "Salvar na Biblioteca") — **refatorado para modal dialog** (padrão `Modal` + `Button` do design system) em vez de botões inline. 3 opções: Notion (`notionService.exportToNotion`), Documento PDF/DOCX (`exportService.exportDocument`), Copiar Conteúdo (`exportService.copyContent`, usa `navigator.clipboard`). Cada uma simula latência de rede e mostra toast de sucesso. Estrutura exportada: título, data, imagem, resumo, conceitos-chave, flashcards, perguntas.
- **Planejamento** (`PlanningSection` + `PlanningModal`, abaixo de Exportar Conteúdo) — modal com Tipo (Prova/Trabalho/Apresentação/Revisão), Data, Horário e checkboxes de revisões automáticas (7 dias, 3 dias, 1 dia, no dia). Botão "Salvar no Google Calendar" chama `calendarService.createEvent` + `calendarService.scheduleReviews` (mock) e mostra toasts `"✓ Evento criado com sucesso"` seguido de `"✓ Revisões adicionadas automaticamente"`. O evento fica anexado ao item (`item.calendarEvent`) quando ele é salvo na Biblioteca.
- **Biblioteca** — item com `calendarEvent` mostra badge de calendário (ícone) na listagem.
- **Revisão** (`ReviewScreen`) — botão "Agendar Revisão" (ícone `CalendarPlus`) em cada item pendente/próximo sem evento associado; dispara os mesmos mocks de `calendarService` e persiste `calendarEvent` no item.
- Arquitetura: `src/services/notionService.js`, `src/services/exportService.js`, `src/services/calendarService.js` — todos mockados com `setTimeout`/Promise, sem chamadas de rede reais. Preparados para trocar por Notion API, Google Calendar API, geração real de PDF/DOCX e compartilhamento Android no futuro.

### 5.9 Imagem de conteúdo capturado
- `CapturedPageVisual` (`src/components/brand/`) — renderização **data-driven**: se o item tem `photo`, mostra a foto real (agora a miniatura da foto capturada pela câmera, gerada em `src/utils/image.js`); senão cai na simulação visual (página inclinada com linhas de texto, ícone da matéria no canto, vinheta de câmera, cantos de enquadramento) — usado só pelos itens semente sem foto. Usado na tela de Resumo e no Detalhe do conteúdo.
- O ciclo fixo de captura (`CAPTURE_POOL`/`nextCaptureTemplate`) foi **removido** junto com a câmera simulada — cada captura agora gera um item novo a partir da análise real da IA.

### 5.10 Conteúdos de exemplo e matérias
- `SAMPLE_ITEMS` (`src/data/sampleContent.js`) continua como **semente da biblioteca** (conteúdo de demonstração, visível mesmo sem nunca ter usado a câmera): 5 matérias com material completo — Matemática (Derivadas), História (Segunda Guerra Mundial), Química (Ligações Químicas), Física (Leis de Ohm), Português (Absolutismo).
- **Matérias agora são dinâmicas**: o filtro da Biblioteca (`LibraryScreen`) é derivado das matérias realmente presentes nos itens salvos, não de uma lista fixa — uma matéria nova identificada pela IA (Biologia, Filosofia, Geografia, Sociologia, Inglês, Artes, Redação, entre outras) aparece automaticamente no filtro.
- `SUBJECT_META` (`src/constants.js`) tem entradas para as matérias mais comuns; `getSubjectMeta(nome)` gera um fallback de cor/ícone determinístico (hash do nome) para qualquer matéria fora da lista, então nada fica sem cor/ícone.

## 6. Modelo de dados (`localStorage`, alimentado por IA real)

Cada item de conteúdo (`SAMPLE_ITEMS` semente / itens salvos a partir da câmera) tem: `id`, `subject`, `subjectIcon`, `subjectColor`, `subjectBg`, `topic`, `concept`, `time`, `summary`, `concepts[]`, `keywords[]`, `extractedText?`, `difficulty?` (`easy`/`medium`/`hard`), `photo?` (miniatura JPEG comprimida gerada da foto real, ou import de asset nos itens semente), `flashcards[]` (`front`/`back`), `questions[]`, `quiz[]` (`type: "mc"|"vf"`, `question`, `options?`, `answer` — índice da alternativa correta, `explanation?`), `reviewSchedule[]` (`stage`, `label`, `dueAt`, `done`), `calendarEvent?` (`id`, `type`, `date`, `time`, `createdAt`, `reminders[]` — opcional, ver 5.8).

Persistência:
- `localStorage` chave `sv_items` — biblioteca de conteúdos. Itens salvos são deduplicados por `id` (não mais por `concept`, já que a IA pode gerar conceitos parecidos para conteúdos diferentes); se a cota do `localStorage` estourar (fotos reais em base64 pesam mais que os mocks antigos), os itens mais antigos são podados automaticamente, e em último caso o item é salvo sem a foto.
- `localStorage` chave `sv_subscription` — estado do plano (`status`, `trialStartedAt`), ver 5.5.

Backend serverless (Vercel) para a análise de imagem via Gemini (ver 5.1); sem banco de dados, sem autenticação, sem sincronização entre dispositivos.

## 7. Limitações conhecidas do protótipo

- **Sem OCR dedicado** — a leitura de texto na imagem é feita pelo próprio Gemini multimodal (não usa Tesseract.js); previsto como possível camada de fallback futura (ver 12).
- **Sem backend de dados/autenticação** — a IA roda em backend real (Serverless Function), mas a biblioteca continua em `localStorage`, local ao navegador; limpar dados do site apaga a biblioteca e o estado de plano.
- **Study Vision+ sem cobrança** — `startTrial()` só faz o toggle local de plano (`sv_subscription`); não há checkout, gateway de pagamento, paywall real com cartão, nem conta de usuário. A trava/destrava das features funciona, o dinheiro não existe.
- **Responsividade básica implementada** — em celulares reais (≤480px) o app ocupa a tela cheia sem a moldura; em telas maiores mantém a moldura centralizada (ver 5.7). Ainda não testado em todos os tamanhos/orientações (ex: landscape).
- **Integrações Notion/Google Calendar são mockadas** (ver 5.8) — sem OAuth real, sem chamada de API real, sem geração real de PDF/DOCX; tudo simula latência com `setTimeout` e retorna dados fake.
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

## 11. Análise — concluído vs. pendente

### 11.1 Concluído
- [x] Fluxo câmera → análise → resumo → biblioteca de ponta a ponta, com **câmera real** e **IA real (Gemini)**.
- [x] Backend serverless (`api/analyze.js`) com chave protegida, tratamento de erro amigável e sem timeout artificial.
- [x] Flashcards, perguntas e quiz gerados dinamicamente a partir do conteúdo real da foto.
- [x] Matérias dinâmicas na Biblioteca (não mais uma lista fixa de 5).
- [x] Revisão espaçada com cronograma (D+1/3/7/15/30) e contador de pendências.
- [x] Study Vision+ como dashboard de analytics com paywall visual.
- [x] Estado de plano real-simulado (`sv_subscription`): ativar/reiniciar teste de 7 dias, features destravam de verdade quando `isPlus`.
- [x] Exportar Conteúdo em modal padronizado (Notion / PDF-DOCX / Copiar — mock).
- [x] Planejamento no Google Calendar (mock) com revisões automáticas.
- [x] Grade de matérias rolável na horizontal com navegação.
- [x] Responsividade básica (tela cheia ≤480px, moldura no desktop).
- [x] Arquitetura modularizada (scaffold Vite + backend serverless).
- [x] README com critérios de entrega + variáveis de ambiente + deploy na Vercel.

### 11.2 Pendente / mockado (candidatos aos próximos passos)
- [ ] Checkout / pagamento real do Study Vision+ (hoje é só toggle local).
- [ ] OCR dedicado (Tesseract.js) como fallback quando o Gemini não conseguir ler a imagem.
- [ ] Resolução de exercícios matemáticos (fórmulas, passo a passo) pela IA.
- [ ] Backend de dados + autenticação + sincronização entre dispositivos (biblioteca ainda é só `localStorage`).
- [ ] OAuth e APIs reais de Notion e Google Calendar.
- [ ] Geração real de PDF/DOCX e compartilhamento nativo Android.
- [ ] Teste de responsividade em mais tamanhos/orientações (landscape).
- [ ] Expiração real do teste de 7 dias (hoje o contador zera mas não trava sozinho ao chegar a 0).
- [ ] Cache/retry mais sofisticado para instabilidade momentânea do Gemini (hoje é "tentar novamente" manual).

## 12. Próximos passos

> A definir em conjunto na próxima sessão de planejamento. Preencher com as funcionalidades priorizadas a partir da lista 11.2.

- [ ] *(a definir)*

## 13. Critério de "pronto" para o protótipo de pitch

- [x] Fluxo câmera → análise → resumo → biblioteca funcionando de ponta a ponta, com câmera e IA reais
- [x] Flashcards, perguntas e quiz gerados dinamicamente a partir da foto capturada
- [x] Revisão espaçada com cronograma e contador de pendências
- [x] Tela de upsell Vision+ (evoluída para dashboard + ativação simulada de teste; ainda sem checkout)
- [x] Deploy publicado e acessível na Vercel, com backend de IA funcionando em produção
