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
- **localStorage** — persistência local dos dados reais de uso (sem backend de dados)

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

A IA é usada em duas frentes.

**No produto**, o fluxo é sempre este, numa única chamada por captura:

```
CameraScreen (getUserMedia + captureFrame)
  → useAnalysis.run(foto)
    → studyVisionService.analyzeImage()  — POST /api/analyze
      → api/analyze.js (Serverless Function)
        → lib/gemini.js — generateAnalysis()
          → Gemini API (@google/genai)
        ← JSON estruturado (subject, topic, summary, keyConcepts, keywords,
          flashcards, openQuestions, quiz, difficulty | success:false + error)
    → normalizeAnalysisResult(resultado, miniatura)
  → Content (modelo interno, ainda não salvo)
→ SummaryScreen → "Salvar" → contentService.createContentEntry()
→ Content persistido em sv_db, aparece na Biblioteca
```

O Gemini recebe a imagem real capturada pela câmera (`src/screens/CameraScreen.jsx`, `getUserMedia`) e identifica matéria e assunto, extrai o texto relevante e gera resumo, conceitos-chave, palavras-chave, flashcards, perguntas abertas e quiz — tudo em uma única chamada multimodal (ver "Custo e uma chamada por captura" abaixo). A resposta bruta nunca é salva direto: `normalizeAnalysisResult` (`src/services/studyVisionService.js`) traduz cada campo para o modelo interno (`Content`), gera os IDs e aplica defaults para campos ausentes, isolando o resto do app de qualquer mudança de formato na resposta da IA. Imagens ilegíveis ou sem conteúdo educacional voltam `success:false` com uma mensagem curta da própria IA — o frontend distingue essa resposta ("Essa imagem não parece conter um conteúdo de estudo") de uma falha técnica de rede/servidor, e nenhum Content é criado nos dois casos.

**Custo e uma chamada por captura:** cada foto gera exatamente uma chamada ao Gemini. Abrir a Biblioteca, um Content já salvo, a Evolução, o Calendário ou o Vision+ nunca chama `/api/analyze` — essas telas só leem dados já persistidos em `localStorage`. Anexar uma foto extra a um Content existente (`addImageToContent`) também não dispara análise nova.

**No desenvolvimento**, ferramentas de IA generativa (Claude/Claude Code) foram utilizadas como apoio à programação: geração e refatoração de componentes, integração do backend Gemini, ajuste de estilos/animações e escrita de commits, sempre com revisão manual antes de cada commit.

## Estrutura

```
api/
└── analyze.js     # POST /api/analyze — Serverless Function (Vercel/Node)

lib/
├── gemini.js      # configuração e chamada à Gemini API (lê GEMINI_API_KEY)
└── prompts.js     # prompt de análise (formato de saída descrito no próprio prompt)

src/
├── components/
│   ├── layout/    # PhoneFrame, StatusBar, BottomNav, Screen, ScrollArea
│   ├── ui/        # Button, Card, Badge, SectionLabel, Modal, Toast, EmptyState...
│   ├── brand/     # LogoSVG, CapturedPageVisual
│   ├── plus/      # Study Vision+ (paywall, comparativo de planos, cards, VisionPlusButton)
│   └── study/     # ContentBlocks, PhotosSection, NotesSection, PhotoViewerModal, Flashcard, QuizQuestion...
├── screens/       # As telas do app (Camera, Library, Review, Evolution, VisionPlus...)
├── data/          # models/ (Content, Subject, Review, Event...), storage/ (sv_db versionado), adapters/
├── services/      # contentService, subjectService, studyService, reviewService, eventService,
│                  # performanceService, evolutionService (dashboard de evolução), integrityService,
│                  # subscriptionService (free/trial/premium), exportService, notionService (mock),
│                  # studyVisionService (fala com /api/analyze)
├── hooks/         # useNavigation, useToast, useSubscription, useAnalysis
├── utils/         # image.js (captura de frame da câmera, geração de miniatura)
├── styles/        # tokens.css (design tokens), global.css, motion.js
├── constants.js
├── App.jsx        # componente raiz
└── main.jsx
```

## Como funciona a persistência

Tudo fica em `localStorage`, sem backend de dados nem conta de usuário — limpar os dados do site apaga a biblioteca e o plano. Duas chaves, dois domínios que nunca se misturam:

- `sv_db` — todo o dado acadêmico: matérias, conteúdos (com fotos, notas, resumo, flashcards, quiz, questões abertas), tentativas, revisões e eventos do calendário. Único ponto de acesso: `src/data/storage/` (`readDb`/`writeDb`/`withDb`) — nenhum outro módulo do app toca `localStorage` diretamente para esse dado. Se a cota do navegador estourar (fotos em base64 pesam), os conteúdos mais antigos são podados automaticamente antes de perder a escrita.
- `sv_subscription` — só o estado do plano (free/trial/premium), lido e escrito exclusivamente por `src/services/subscriptionService.js`. Trocar de plano nunca apaga ou altera `sv_db`.

## Modelo de negócio — Study Vision+

Plano gratuito entrega o produto inteiro: captura com IA, biblioteca, resumos, flashcards (limite de 5 por conteúdo), quiz, perguntas, revisão espaçada completa e o dashboard de Evolução inteiro. **Study Vision+** soma flashcards e quizzes ilimitados, personalização avançada e a seção de Insights da Evolução — nunca esconde o produto por trás de paywall, só aprofunda. Preço: **R$ 9,90/mês**, com **7 dias de teste grátis** (`startTrial()`); o teste expira sozinho quando `trialEndsAt` passa, sem precisar de nenhuma ação manual. Ainda não há checkout nem gateway de pagamento reais — é só o estado local (`sv_subscription`) que destrava as features.

Para reiniciar a demonstração — voltar ao estado Free durante uma apresentação — segure (long-press, ~1s) o selo **PLUS** no topo da tela Study Vision+.

## Limitações do protótipo

- Sem OCR dedicado — a leitura de texto na imagem é feita pelo próprio Gemini multimodal.
- Sem backend de dados, autenticação ou sincronização entre dispositivos — tudo vive em `localStorage` do navegador.
- Study Vision+ sem cobrança real — o trial e o plano premium são só um toggle local.
- Exportar para o Notion continua mockado (`src/services/notionService.js`) — resolve uma URL falsa após um pequeno atraso simulado; é a única simulação que resta no produto, mantida deliberadamente para a demonstração. PDF, cópia de texto e o calendário acadêmico já são reais.
- Responsividade testada em 320/375/430/768px e desktop, sempre dentro da moldura de smartphone do protótipo — não há layout fluido de desktop.
