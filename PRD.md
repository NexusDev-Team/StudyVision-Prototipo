# PRD — Study Vision (JOVI Smartphones)

> Documento vivo. Atualizar sempre que uma decisão de escopo, fluxo ou regra de negócio mudar. Baseado no que está implementado em `src/StudyVision.jsx` em 2026-08-04.

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
1. **Câmera** (`CameraScreen`) — viewfinder simulado, quadro de foco central, botão de obturador, painel "Study Vision" com features ativas (OCR Avançado, Resumo Inteligente, Organização Automática, Biblioteca Inteligente).
2. **Análise** (`AnalysisScreen`) — loading com steps simulando processamento (texto identificado → legibilidade → qualidade → pronto).
3. **Resumo** (`SummaryScreen`) — mostra matéria/tópico/conceito identificado, resumo gerado, conceitos e palavras-chave. Ação: Salvar (persiste em `localStorage`) ou ir direto à Biblioteca.

### 5.2 Biblioteca e conteúdo salvo
- **Biblioteca** (`LibraryScreen`) — lista de conteúdos salvos, busca por texto, filtro por matéria, badge de "revisar hoje" quando aplicável.
- **Detalhe do conteúdo** (`ContentDetailScreen`) — resumo, conceitos, palavras-chave, status da próxima revisão (X/5 concluídas), acesso a Flashcards / Quiz / Perguntas.

### 5.3 Modos de estudo
- **Flashcards** (`FlashcardsScreen`) — cartão com flip 3D, avaliação "Lembrei" / "Não lembrei", limite de **5 flashcards grátis por conteúdo** (`FREE_FLASHCARD_LIMIT`), CTA de upsell para os cards bloqueados.
- **Perguntas** (`QuestionsScreen`) — lista de perguntas dissertativas geradas, ilimitado no plano grátis.
- **Quiz** (`QuizScreen`) — múltipla escolha / verdadeiro-falso, feedback imediato, placar final.

### 5.4 Revisão espaçada
- Cronograma fixo por conteúdo: **D+1, D+3, D+7, D+15, D+30** (`REVIEW_OFFSETS`).
- **Revisão** (`ReviewScreen`) — separa "Para hoje" (vencidas) de "Próximas revisões" (ordenadas por data).
- Revisar um conteúdo abre o modo Flashcards em `reviewMode`; ao concluir, marca o próximo estágio do cronograma como feito e volta para a tela de Revisão com toast de confirmação.
- Contador de pendências (`dueCount`) exibido como badge vermelho na nav inferior, no ícone "Revisão".

### 5.5 Monetização — Study Vision+ (upsell)
- **Vision+** (`VisionPlusScreen`) — tela de venda com 2 features bloqueadas no plano grátis: Flashcards Inteligentes (ilimitados) e Perguntas Inteligentes personalizadas por IA. Botão "Ativar Study Vision+" **ainda sem ação real** (não há fluxo de pagamento implementado).
- Regra de negócio atual: grátis = até 5 flashcards por conteúdo + perguntas dissertativas ilimitadas + quiz ilimitado. Vision+ = flashcards ilimitados (promessa na UI; lógica de desbloqueio real não implementada).

### 5.6 Navegação
- Nav inferior com 4 destinos: Câmera, Biblioteca, Revisão, Vision+.
- Histórico de navegação simples (`prevScreens`) para o botão "Voltar" dentro de fluxos (ex: Biblioteca → Detalhe → Flashcards).

### 5.7 Responsividade
- Em telas ≤480px de largura (celulares reais), a moldura decorativa de smartphone some e o app ocupa a tela inteira (100vw/100dvh, sem bezel/`border-radius`), como um app de verdade.
- Em telas maiores (desktop/tablet), mantém a moldura de smartphone 375×812 centralizada, com `max-width`/`max-height` para não estourar viewports menores que isso.
- Implementado via classes CSS (`.sv-outer`, `.sv-frame`) em `src/index.css` com media query, em vez de estilos inline fixos.

### 5.8 Imagem de conteúdo capturado
- `CapturedPageVisual` (em `src/StudyVision.jsx`) substitui o placeholder genérico (ícone + texto) por uma simulação visual da "foto tirada": uma página inclinada com linhas representando texto/anotações, ícone da matéria no canto, vinheta de câmera e cantos de enquadramento — usado na tela de Resumo e no Detalhe do conteúdo.
- Ainda é uma simulação (não é uma foto real nem gerada por IA) — mantém a linha de "tudo mockado" da seção 7, só melhora a fidelidade visual do protótipo.
- **Tela da Câmera**: o fundo do viewfinder usa uma foto real de exemplo (`src/assets/exemplo-foto1.png` — página de caderno manuscrita sobre "Derivada", com bloom no CamScanner), simulando a câmera apontada para um conteúdo de estudo real, com um degradê escuro por cima para manter os controles legíveis. Bate com o mock `SAMPLE_ITEMS[0]` (Matemática · Derivadas), que já era o primeiro item do ciclo de captura.

## 6. Modelo de dados (mock, `localStorage`)

Cada item de conteúdo (`SAMPLE_ITEMS` / itens salvos) tem: `id`, `subject`, `subjectIcon`, `subjectColor`, `subjectBg`, `topic`, `concept`, `time`, `summary`, `concepts[]`, `keywords[]`, `flashcards[]` (`front`/`back`), `questions[]`, `quiz[]` (`type: "mc"|"vf"`, `question`, `options?`, `answer`), `reviewSchedule[]` (`stage`, `label`, `dueAt`, `done`).

Persistência: `localStorage` chave `sv_items`. Sem backend, sem autenticação, sem sincronização entre dispositivos.

## 7. Limitações conhecidas do protótipo

- **Câmera é decorativa** — não usa a câmera real do dispositivo nem captura foto de verdade; ao tocar no obturador, o app apenas sorteia um dos 3 conteúdos pré-prontos (`CAPTURE_POOL`) em round-robin.
- **Sem OCR/IA reais** — resumo, conceitos, flashcards, perguntas e quiz são todos dados mockados fixos em `SAMPLE_ITEMS`, não gerados dinamicamente.
- **Sem backend/autenticação** — tudo roda local no navegador via `localStorage`; limpar dados do site apaga a biblioteca.
- **Botão "Ativar Study Vision+" não tem ação** — não há checkout, paywall real nem controle de plano do usuário.
- **Responsividade básica implementada** — em celulares reais (≤480px) o app ocupa a tela cheia sem a moldura decorativa; em telas maiores mantém a moldura de smartphone centralizada (ver 5.7). Ainda não testado em todos os tamanhos/orientações (ex: landscape).

## 8. Stack técnica

React 18 + Vite 5 + framer-motion (animações/transições) + lucide-react (ícones). Deploy estático via `gh-pages` para GitHub Pages.

## 9. Horizonte do projeto

Este PRD é para uso pessoal do autor (Isac), servindo de referência de contexto entre sessões — não é material para banca/avaliadores nem para um time técnico externo (ainda).

Fases previstas para o pitch:
1. **Fase atual** — protótipo clicável mockado (este repo), usado para apresentar o conceito.
2. **Se aprovado para próxima fase** — evoluir o protótipo para o mais próximo possível de um produto real e usável (ainda dentro do escopo de pitch/demo, mas reduzindo o quanto for mockado).
3. **Se selecionado na fase final** — o projeto entra em desenvolvimento oficial com a JOVI (produto real, presumivelmente com câmera nativa, OCR/IA real, backend, contas de usuário, pagamento etc.).

Sem prazo definido no momento.

## 10. Requisitos propostos / próximos passos (em aberto)

> Ainda não há novas funcionalidades específicas decididas além do que já está implementado (seção 5). Preencher conforme forem surgindo.

- [ ] *(a definir)*

## 11. Critério de "pronto" para o protótipo de pitch

- [x] Fluxo câmera → análise → resumo → biblioteca funcionando de ponta a ponta
- [x] Flashcards, perguntas e quiz funcionais com dados mockados
- [x] Revisão espaçada com cronograma e contador de pendências
- [x] Tela de upsell Vision+ (apenas apresentação, sem checkout)
- [ ] Deploy publicado e acessível via GitHub Pages (em andamento — ver histórico de deploy)
