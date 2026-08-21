# Study Vision — JOVI

Protótipo do **Study Vision**, feature nativa de câmera com IA desenvolvida para o desafio **FIAP × JOVI Smartphones**. A proposta transforma a câmera do celular na porta de entrada para um sistema de aprendizagem baseado em ciência cognitiva: captura inteligente, entendimento contextual do conteúdo, síntese em resumos e flashcards, aprendizado ativo (Active Recall) e revisão programada (Spaced Repetition), com biblioteca inteligente, integração com calendário e dashboard acadêmico.

Este repositório contém o **front-end do protótipo**, 100% mocado (sem backend/API real) — construído para validar experiência e fluxo de produto. Contexto completo de negócio, pesquisa e roadmap em `PRD.md` e `contexto-studyvision.md`.

**Deploy:** https://nexusdev-team.github.io/StudyVision-Prototipo/

## Tecnologias utilizadas

- **React 18** — biblioteca de UI
- **Vite** — bundler e dev server
- **Framer Motion** — animações e transições
- **Lucide React** — ícones
- **CSS Modules** — estilização por componente, com design tokens (`src/styles/tokens.css`)
- **localStorage** — persistência local dos dados mocados (sem backend)

## Como instalar as dependências

Pré-requisito: Node.js instalado.

```bash
npm install
```

## Como executar o projeto

```bash
npm run dev
```

O Vite abrirá o servidor local (padrão `http://localhost:5173`).

Outros comandos disponíveis:

```bash
npm run build      # gera build de produção na pasta docs/
npm run preview    # serve a build de produção localmente
```

## Usuários e senhas para teste

Não há autenticação no projeto. O protótipo é 100% mocado e abre direto na tela inicial (câmera), sem tela de login — todos os dados (conteúdos, flashcards, revisões, assinatura) são simulados via `localStorage`, sem necessidade de credenciais.

## Uso de Inteligência Artificial no projeto

A IA foi utilizada em duas frentes neste projeto. **No produto**, o Study Vision simula (via mocks) funcionalidades de IA que fariam parte da solução real: reconhecimento contextual do conteúdo fotografado (disciplina, tema, subtema), geração automática de resumos e pontos-chave, criação de flashcards e quizzes a partir do material capturado, e sugestão de eventos de estudo/revisão — tudo hoje simulado com dados de exemplo, já que o protótipo não possui backend ou IA real integrada. **No desenvolvimento**, ferramentas de IA generativa (Claude/Claude Code) foram utilizadas como apoio à programação: geração e refatoração de componentes React, ajuste de estilos e animações, organização da estrutura de pastas e escrita de commits — sempre com revisão e ajustes manuais do time antes de cada commit.

## Estrutura

```
src/
├── components/
│   ├── layout/    # PhoneFrame, StatusBar, BottomNav, Screen, ScreenHeader, ScrollArea
│   ├── ui/        # Button, Card, Badge, SectionLabel, FilterPills, Modal, Toast...
│   ├── brand/     # LogoSVG, CapturedPageVisual
│   ├── plus/      # Componentes da aba Study Vision+ (paywall, métricas, cards)
│   └── study/     # ContentBlocks, Flashcard, QuizQuestion, ReviewCard...
├── screens/       # As telas do app (Camera, Library, Flashcards, Review, Vision+...)
├── data/          # Conteúdo de exemplo (SAMPLE_ITEMS, métricas Plus)
├── services/      # storage (localStorage), reviewEngine (repetição espaçada),
│                  # calendarService/exportService/notionService (mocks), subscription
├── hooks/         # useNavigation, useToast, useStudyItems, useSubscription
├── styles/        # tokens.css (design tokens), global.css, motion.js
├── constants.js
├── App.jsx        # componente raiz
└── main.jsx
```

## Demonstração do Study Vision+

O estado de assinatura (`sv_subscription` no localStorage) persiste entre sessões.
Para reiniciar a demonstração — voltar ao estado Free durante uma apresentação —
segure (long-press, ~1s) o selo **PLUS** no topo da aba Study Vision+.
