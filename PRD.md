# PRD — Study Vision (JOVI Smartphones)

> Documento vivo. Atualizar sempre que uma decisão de escopo, fluxo ou regra de negócio mudar. Baseado no que está implementado em `src/` (scaffold Vite) em **2026-08-28**.

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

### 5.1 Fluxo principal (câmera → resumo)
1. **Câmera** (`CameraScreen`) — viewfinder simulado, quadro de foco central, botão de obturador, painel "Study Vision" com features ativas (OCR Avançado, Resumo Inteligente, Organização Automática, Biblioteca Inteligente). O fundo do viewfinder mostra a foto real do **próximo** conteúdo do ciclo de captura (`previewPhoto` = `peekCaptureTemplate().photo`), com degradê escuro por cima para manter os controles legíveis.
2. **Análise** (`AnalysisScreen`) — loading com steps simulando processamento (texto identificado → legibilidade → qualidade → pronto).
3. **Resumo** (`SummaryScreen`) — mostra matéria/tópico/conceito identificado, resumo gerado, conceitos e palavras-chave. Ação: Salvar (persiste em `localStorage`) ou ir direto à Biblioteca.

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
- `CapturedPageVisual` (`src/components/brand/`) — renderização **data-driven**: se o item tem `photo`, mostra a foto real; senão cai na simulação visual (página inclinada com linhas de texto, ícone da matéria no canto, vinheta de câmera, cantos de enquadramento). Usado na tela de Resumo e no Detalhe do conteúdo.
- **Ciclo de captura data-driven**: `CAPTURE_POOL = SAMPLE_ITEMS.filter(i => i.photo)` — só entram no round-robin do obturador os itens que têm foto real. Hoje: Matemática (`exemplo-foto1.png`, "Derivada"), Física (`exemplo2_fisica.jpg`, "Leis de Ohm"), Português (`exemplo3_portugues.jpg`, "Absolutismo"). `nextCaptureTemplate()` avança o índice; `peekCaptureTemplate()` espia o próximo pro preview da câmera.

### 5.10 Conteúdos de exemplo e matérias
- `SAMPLE_ITEMS` (`src/data/sampleContent.js`) tem **5 matérias** com material educacional completo: Matemática (Derivadas), História (Segunda Guerra Mundial), Química (Ligações Químicas), Física (Leis de Ohm), Português (Absolutismo).
- `SUBJECT_FILTERS` = `["Todos", "Matemática", "História", "Química", "Física", "Português"]`.
- `SUBJECT_META` mapeia ícone/cor/fundo por matéria (inclui `Programação` reservado, ainda sem conteúdo).

## 6. Modelo de dados (mock, `localStorage`)

Cada item de conteúdo (`SAMPLE_ITEMS` / itens salvos) tem: `id`, `subject`, `subjectIcon`, `subjectColor`, `subjectBg`, `topic`, `concept`, `time`, `summary`, `concepts[]`, `keywords[]`, `photo?` (import de asset — presente só nos itens do `CAPTURE_POOL`), `flashcards[]` (`front`/`back`), `questions[]`, `quiz[]` (`type: "mc"|"vf"`, `question`, `options?`, `answer`), `reviewSchedule[]` (`stage`, `label`, `dueAt`, `done`), `calendarEvent?` (`id`, `type`, `date`, `time`, `createdAt`, `reminders[]` — opcional, ver 5.8).

Persistência:
- `localStorage` chave `sv_items` — biblioteca de conteúdos.
- `localStorage` chave `sv_subscription` — estado do plano (`status`, `trialStartedAt`), ver 5.5.

Sem backend, sem autenticação, sem sincronização entre dispositivos.

## 7. Limitações conhecidas do protótipo

- **Câmera é decorativa** — não usa a câmera real do dispositivo nem captura foto de verdade; ao tocar no obturador, o app avança o `CAPTURE_POOL` (itens com foto real) em round-robin.
- **Sem OCR/IA reais** — resumo, conceitos, flashcards, perguntas e quiz são todos dados mockados fixos em `SAMPLE_ITEMS`, não gerados dinamicamente.
- **Sem backend/autenticação** — tudo roda local no navegador via `localStorage`; limpar dados do site apaga a biblioteca e o estado de plano.
- **Study Vision+ sem cobrança** — `startTrial()` só faz o toggle local de plano (`sv_subscription`); não há checkout, gateway de pagamento, paywall real com cartão, nem conta de usuário. A trava/destrava das features funciona, o dinheiro não existe.
- **Responsividade básica implementada** — em celulares reais (≤480px) o app ocupa a tela cheia sem a moldura; em telas maiores mantém a moldura centralizada (ver 5.7). Ainda não testado em todos os tamanhos/orientações (ex: landscape).
- **Integrações Notion/Google Calendar são mockadas** (ver 5.8) — sem OAuth real, sem chamada de API real, sem geração real de PDF/DOCX; tudo simula latência com `setTimeout` e retorna dados fake.

## 8. Stack técnica

React 18 + Vite 5 + framer-motion (animações/transições) + lucide-react (ícones) + CSS Modules. Código organizado em scaffold: `src/screens`, `src/components` (`brand`, `layout`, `plus`, `study`, `ui`), `src/hooks`, `src/services`, `src/data`, `src/styles`. Build para `docs/` (`vite.config` com `base: "./"`, `outDir: "docs"`); deploy estático via GitHub Pages a partir de `docs/`.

Deploy publicado: https://nexusdev-team.github.io/StudyVision-Prototipo/

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

### 10.6 Documentação e deploy (2026-08-21+)
- `README.md` expandido pros critérios mínimos de entrega: tecnologias, instalação, execução, credenciais de teste (sem auth — mockado), explicação do uso de IA, link de deploy.
- `integrantes.txt` adicionado; ícone da página HTML configurado.
- Builds de `docs/` publicados no GitHub Pages (várias atualizações até 2026-08-28).

## 11. Análise — concluído vs. pendente

### 11.1 Concluído
- [x] Fluxo câmera → análise → resumo → biblioteca de ponta a ponta.
- [x] Flashcards, perguntas e quiz funcionais com dados mockados.
- [x] Revisão espaçada com cronograma (D+1/3/7/15/30) e contador de pendências.
- [x] Study Vision+ como dashboard de analytics com paywall visual.
- [x] Estado de plano real-simulado (`sv_subscription`): ativar/reiniciar teste de 7 dias, features destravam de verdade quando `isPlus`.
- [x] Exportar Conteúdo em modal padronizado (Notion / PDF-DOCX / Copiar — mock).
- [x] Planejamento no Google Calendar (mock) com revisões automáticas.
- [x] 5 matérias com conteúdo real + 3 fotos reais no ciclo de captura.
- [x] Grade de matérias rolável na horizontal com navegação.
- [x] Responsividade básica (tela cheia ≤480px, moldura no desktop).
- [x] Arquitetura modularizada (scaffold Vite).
- [x] README com critérios de entrega + deploy no GitHub Pages.

### 11.2 Pendente / mockado (candidatos aos próximos passos)
- [ ] Checkout / pagamento real do Study Vision+ (hoje é só toggle local).
- [ ] Câmera nativa real + captura de foto do dispositivo.
- [ ] OCR real + geração de resumo/flashcards/perguntas/quiz por IA.
- [ ] Backend + autenticação + sincronização entre dispositivos.
- [ ] OAuth e APIs reais de Notion e Google Calendar.
- [ ] Geração real de PDF/DOCX e compartilhamento nativo Android.
- [ ] Teste de responsividade em mais tamanhos/orientações (landscape).
- [ ] Conteúdo para a matéria `Programação` (metadado já existe, sem itens).
- [ ] Expiração real do teste de 7 dias (hoje o contador zera mas não trava sozinho ao chegar a 0).

## 12. Próximos passos

> A definir em conjunto na próxima sessão de planejamento. Preencher com as funcionalidades priorizadas a partir da lista 11.2.

- [ ] *(a definir)*

## 13. Critério de "pronto" para o protótipo de pitch

- [x] Fluxo câmera → análise → resumo → biblioteca funcionando de ponta a ponta
- [x] Flashcards, perguntas e quiz funcionais com dados mockados
- [x] Revisão espaçada com cronograma e contador de pendências
- [x] Tela de upsell Vision+ (evoluída para dashboard + ativação simulada de teste; ainda sem checkout)
- [x] Deploy publicado e acessível via GitHub Pages
