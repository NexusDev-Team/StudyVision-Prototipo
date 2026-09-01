# Study Vision — JOVI

Protótipo do **Study Vision**, feature nativa de câmera com IA desenvolvida para o desafio **FIAP × JOVI Smartphones**. A proposta transforma a câmera do celular na porta de entrada para um sistema de aprendizagem baseado em ciência cognitiva: captura inteligente, entendimento contextual do conteúdo, síntese em resumos e flashcards, aprendizado ativo (Active Recall) e revisão programada (Spaced Repetition), com biblioteca inteligente, integração com calendário e dashboard acadêmico.

Este repositório contém o protótipo completo — front-end React/Vite **e um backend serverless que usa a Gemini API real** para analisar a foto capturada pela câmera e gerar resumo, conceitos, flashcards e quiz. Contexto completo de negócio, pesquisa e roadmap em `PRD.md` e `contexto-studyvision.md`.

**Deploy:** https://study-vision-one.vercel.app

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
npm run build      # gera build de produção na pasta dist/
npm run preview    # serve a build de produção localmente
```

## Usuários e senhas para teste

Não há autenticação no projeto. O protótipo abre direto na tela da câmera, sem login; conteúdos, flashcards, revisões e assinatura ficam em `localStorage`, sem necessidade de credenciais.

## Variáveis de ambiente

Crie um `.env.local` na raiz (veja `.env.example`) com:

```bash
GEMINI_API_KEY=sua_chave_da_gemini_api   # https://aistudio.google.com/apikey
GEMINI_MODEL=gemini-flash-lite-latest    # opcional — usado por padrão se omitido
```

`GEMINI_API_KEY` é lida **apenas no backend** (`api/analyze.js` / `lib/gemini.js`) e nunca chega ao bundle do frontend — sem chave configurada, a captura continua funcionando mas a análise retorna um erro amigável.

## Uso de Inteligência Artificial no projeto

A IA é usada em duas frentes. **No produto**, a foto capturada pela câmera (`src/screens/CameraScreen.jsx`, com acesso real via `getUserMedia`) é enviada para `POST /api/analyze`, uma Serverless Function que chama a **Gemini API** (`lib/gemini.js` + `lib/prompts.js`) com a imagem real: o Gemini identifica matéria e assunto, extrai o texto relevante e gera resumo, conceitos-chave, flashcards e quiz — tudo em uma única chamada, com saída estruturada em JSON (`responseSchema`). Fotos diferentes produzem resultados diferentes; imagens ilegíveis ou sem conteúdo educacional retornam um aviso em vez de conteúdo inventado. O resultado alimenta as telas já existentes (resumo, biblioteca, flashcards, quiz, revisão espaçada). **No desenvolvimento**, ferramentas de IA generativa (Claude/Claude Code) foram utilizadas como apoio à programação: geração e refatoração de componentes, integração do backend Gemini, ajuste de estilos/animações e escrita de commits, sempre com revisão manual antes de cada commit.

## Estrutura

```
api/
└── analyze.js     # POST /api/analyze — Serverless Function (Vercel/Node)

lib/
├── gemini.js      # configuração e chamada à Gemini API (lê GEMINI_API_KEY)
└── prompts.js     # prompt de análise + schema de saída estruturada

src/
├── components/
│   ├── layout/    # PhoneFrame, StatusBar, BottomNav, Screen, ScreenHeader, ScrollArea
│   ├── ui/        # Button, Card, Badge, SectionLabel, FilterPills, Modal, Toast...
│   ├── brand/     # LogoSVG, CapturedPageVisual
│   ├── plus/      # Componentes da aba Study Vision+ (paywall, métricas, cards)
│   └── study/     # ContentBlocks, Flashcard, QuizQuestion, ReviewCard...
├── screens/       # As telas do app (Camera, Library, Flashcards, Review, Vision+...)
├── data/          # Conteúdo de exemplo (SAMPLE_ITEMS, métricas Plus) — seeds da biblioteca
├── services/      # studyVisionService (fala com /api/analyze), storage (localStorage),
│                  # reviewEngine (repetição espaçada), calendarService/exportService/
│                  # notionService (mocks), subscription
├── hooks/         # useNavigation, useToast, useStudyItems, useSubscription, useAnalysis
├── utils/         # image.js (captura de frame da câmera, geração de miniatura)
├── styles/        # tokens.css (design tokens), global.css, motion.js
├── constants.js
├── App.jsx        # componente raiz
└── main.jsx
```

## Demonstração do Study Vision+

O estado de assinatura (`sv_subscription` no localStorage) persiste entre sessões.
Para reiniciar a demonstração — voltar ao estado Free durante uma apresentação —
segure (long-press, ~1s) o selo **PLUS** no topo da aba Study Vision+.
