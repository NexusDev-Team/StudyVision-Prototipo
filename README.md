# Study Vision — JOVI

Protótipo do **Study Vision**, feature nativa de câmera com IA desenvolvida para o desafio **FIAP × JOVI Smartphones**. A proposta transforma a câmera do celular na porta de entrada para um sistema de aprendizagem baseado em ciência cognitiva: captura inteligente, entendimento contextual do conteúdo, síntese em resumos e flashcards, aprendizado ativo (Active Recall) e revisão programada (Spaced Repetition), com biblioteca inteligente, integração com calendário e dashboard acadêmico.

Este repositório contém o protótipo completo — front-end React/Vite **e um backend serverless que usa a Gemini API real** para analisar a foto capturada pela câmera e gerar resumo, conceitos, flashcards e quiz. Contexto completo de negócio, pesquisa e roadmap em `PRD.md`.

**Deploy (Vercel):** https://study-vision-one.vercel.app
**Repositório:** https://github.com/NexusDev-Team/StudyVision-Prototipo

> **Sprint 4 — Front-End Design + Web Development.** Evolução do projeto da Sprint 3: a Landing Page (antes em HTML/CSS puro, repositório `StudyVision-LandingPage`) foi integrada ao React junto com o protótipo do app, com rotas públicas e privadas, autenticação de demonstração, Tailwind CSS e layout responsivo (mobile, tablet e desktop).

> **Atenção — chave da Gemini API:** para testar a análise de fotos em outra máquina é preciso uma `GEMINI_API_KEY` própria (gratuita em https://aistudio.google.com/apikey) no arquivo `.env.local`. Sem ela o app abre e dá para navegar por todas as telas (landing, login, biblioteca, revisão etc.), mas a análise de fotos mostra uma mensagem de erro. No deploy da Vercel a chave já está configurada.

## Tecnologias utilizadas

- **React 18** — componentização, props, hooks nativos (`useState`, `useEffect`, `useContext`, `useRef`, `useMemo`, `useCallback`, `useId`) e hooks customizados
- **React Router** — rotas públicas e privadas (`PrivateRoute` / `PublicOnlyRoute`)
- **Tailwind CSS 4** (`@tailwindcss/vite`) — estilização da landing, login/cadastro, layout, componentes base e telas principais; tokens do design system mapeados em `@theme` (`src/styles/global.css`)
- **Vite** — bundler e dev server (também serve as funções de `api/` em desenvolvimento)
- **Framer Motion** — animações e transições
- **Lucide React** — ícones
- **Gemini API** (`@google/genai`) — análise das fotos, via Serverless Functions em `api/`
- **jsPDF** — exportação de resumo em PDF
- **Vercel** — deploy (Git + Vercel) e Serverless Functions
- **localStorage** — persistência dos dados de uso e da sessão de demonstração

## Como instalar as dependências

Pré-requisito: **Node.js 20 ou superior** e npm.

```bash
git clone https://github.com/NexusDev-Team/StudyVision-Prototipo.git
cd StudyVision-Prototipo
npm install
```

Crie o arquivo `.env.local` a partir do modelo e informe a chave da Gemini API (veja "Variáveis de ambiente" abaixo):

```bash
cp .env.example .env.local     # Windows (PowerShell): Copy-Item .env.example .env.local
```

## Como executar o projeto

```bash
npm run dev
```

Abra `http://localhost:5173`. Esse único comando sobe o front-end **e** o back-end: o plugin do Vite (`vite.config.js`) executa as funções de `api/` em desenvolvimento, não é preciso iniciar outro servidor.

```bash
npm run build      # gera build de produção na pasta dist/
npm run preview    # serve a build de produção (apenas front-end)
npm run test:data  # testes da camada de dados e serviços (sem rede)
```

### Back-end (Serverless Functions)

O back-end são as funções de `api/` (`analyze`, `analyze-extras`, `extract-text`, `focus`, `rephrase`, `reading-help`, `contact`). Em produção a Vercel as executa direto; em desenvolvimento o `npm run dev` as serve. Sem `GEMINI_API_KEY`, o app abre normalmente, mas a análise de fotos retorna um erro amigável.

## Usuários e senhas para teste

A autenticação é uma **simulação de front-end** (sem servidor de contas): usuários e sessão ficam em `localStorage`, e a senha é guardada como hash SHA-256. O objetivo é demonstrar rotas privadas.

| Usuário | Senha |
|---|---|
| `demo@studyvision.com` | `jovi2026` |

Na tela de login, o botão **"Preencher com usuário demo"** já completa os campos. Também é possível criar uma conta própria em `/cadastro`.

## Rotas

| Rota | Acesso | Descrição |
|---|---|---|
| `/` | pública | Landing Page (solução, público-alvo, galeria, equipe, contato) |
| `/login`, `/cadastro` | pública (só visitantes) | Entrar / criar conta; usuário logado é redirecionado ao app |
| `/app/camera`, `/app/analise`, `/app/resumo` | privada | Captura com a câmera, análise por IA e resumo |
| `/app/biblioteca` | privada | Biblioteca por matéria (`?materia=` filtra) |
| `/app/conteudo/:id` e subrotas `flashcards`, `perguntas`, `quiz`, `foco`, `leitura`, `anexar` | privada | Detalhe do conteúdo e modos de estudo |
| `/app/revisao`, `/app/evolucao`, `/app/plus`, `/app/perfil` | privada | Revisão espaçada, evolução, Study Vision+ e perfil |
| `*` | pública | Página 404 |

Rotas privadas redirecionam para `/login` quando não há sessão e voltam à página pedida depois do login.

## Hooks customizados

Lógica separada da parte visual, em `src/hooks/`: `useAuth` (sessão), `useForm` / `useContactForm` (formulários), `useAppNavigation` (navegação), `useShell` (estado compartilhado do layout), `useAnalysis` / `useAnalysisExtras` (fluxo de análise por IA), `useSubscription`, `useFocusSession`, `useReadingSession`, `usePhotoTextExtraction`, `useSpeechSynthesis` e `useToast`.

## API consumida

API própria, em `api/` (Serverless Functions): `/api/analyze` e demais rotas de IA consomem a Gemini API; `/api/contact` recebe o formulário de contato da landing, valida os campos e registra a mensagem no log da função (não envia e-mail).

## Responsividade

Mobile (`< 768px`): tela cheia com barra de navegação inferior. Tablet e desktop (`>= 768px`): menu lateral e conteúdo centralizado. A landing page é fluida de 320px a telas largas, com menu hambúrguer no mobile.

## Variáveis de ambiente

Crie um `.env.local` na raiz (modelo em `.env.example`):

```bash
GEMINI_API_KEY=sua_chave_da_gemini_api   # https://aistudio.google.com/apikey
GEMINI_MODEL=gemini-flash-lite-latest    # opcional — usado por padrão se omitido
```

`GEMINI_API_KEY` é lida **apenas no backend** (`lib/gemini.js`) e nunca chega ao bundle do frontend. Na Vercel, configure a mesma variável em *Project Settings → Environment Variables*.

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

**No desenvolvimento**, usamos IA generativa (Claude Code) como apoio à programação, sempre com revisão e teste manual antes de cada commit. Na Sprint 4 ela ajudou a: migrar a navegação por estado para React Router com rotas públicas/privadas, escrever o serviço e os hooks de autenticação de demonstração, converter a Landing Page da Sprint 3 (HTML/CSS) em componentes React com Tailwind, migrar os componentes base para Tailwind, criar o layout responsivo e redigir esta documentação. No produto, a IA em execução é a Gemini API (descrita acima). As decisões de arquitetura e o conteúdo da landing foram definidos pela equipe.

## Estrutura

```
api/               # Serverless Functions (analyze, analyze-extras, extract-text, focus, rephrase, reading-help, contact)
lib/               # gemini.js, prompts e utilitários do backend
public/            # favicon e vídeo da galeria da landing
src/
├── components/
│   ├── landing/   # Header, Hero, InfoSection, FeatureCard, TeamCard, ContactSection
│   ├── auth/      # AuthLayout, AuthField
│   ├── layout/    # AppShell, SideNav, BottomNav, Screen, ScrollArea
│   ├── ui/        # Button, Card, Badge, Modal, Toast, EmptyState...
│   ├── brand/     # LogoSVG, CapturedPageVisual
│   ├── plus/      # Study Vision+ (paywall, comparativo de planos...)
│   └── study/     # componentes de conteúdo, flashcards, quiz, calendário...
├── pages/         # LandingPage, LoginPage, RegisterPage, ProfilePage, NotFoundPage
├── routes/        # AppRoutes, guards (PrivateRoute/PublicOnlyRoute), wrappers das telas
├── screens/       # telas do app (Camera, Library, Review, Evolution...)
├── context/       # AuthContext, ContentStoreContext
├── hooks/         # hooks customizados
├── services/      # authService, contactService, contentService, studyVisionService...
├── data/          # models, storage (sv_db versionado), dados da landing
├── styles/        # global.css (Tailwind + @theme), tokens.css, motion.js
├── App.jsx
└── main.jsx
```

## Como funciona a persistência

Tudo fica em `localStorage`, sem backend de dados nem conta de usuário — limpar os dados do site apaga a biblioteca e o plano. Chaves por domínio, que nunca se misturam:

- `sv_db` — todo o dado acadêmico: matérias, conteúdos (com fotos, notas, resumo, flashcards, quiz, questões abertas), tentativas, revisões e eventos do calendário. Único ponto de acesso: `src/data/storage/` (`readDb`/`writeDb`/`withDb`) — nenhum outro módulo do app toca `localStorage` diretamente para esse dado. Se a cota do navegador estourar (fotos em base64 pesam), os conteúdos mais antigos são podados automaticamente antes de perder a escrita.
- `sv_users` / `sv_session` — usuários e sessão do login de demonstração (`src/services/authService.js`).
- `sv_subscription` — só o estado do plano (free/trial/premium), lido e escrito exclusivamente por `src/services/subscriptionService.js`. Trocar de plano nunca apaga ou altera `sv_db`.

## Modelo de negócio — Study Vision+

Plano gratuito entrega o produto inteiro: captura com IA, biblioteca, resumos, flashcards (limite de 5 por conteúdo), quiz, perguntas, revisão espaçada completa e o dashboard de Evolução inteiro. **Study Vision+** soma flashcards e quizzes ilimitados, personalização avançada e a seção de Insights da Evolução — nunca esconde o produto por trás de paywall, só aprofunda. Preço: **R$ 9,90/mês**, com **7 dias de teste grátis** (`startTrial()`); o teste expira sozinho quando `trialEndsAt` passa, sem precisar de nenhuma ação manual. Ainda não há checkout nem gateway de pagamento reais — é só o estado local (`sv_subscription`) que destrava as features.

Para reiniciar a demonstração — voltar ao estado Free durante uma apresentação — segure (long-press, ~1s) o selo **PLUS** no topo da tela Study Vision+.

## Limitações do protótipo

- Sem OCR dedicado — a leitura de texto na imagem é feita pelo próprio Gemini multimodal.
- Sem backend de dados, autenticação ou sincronização entre dispositivos — tudo vive em `localStorage` do navegador.
- Study Vision+ sem cobrança real — o trial e o plano premium são só um toggle local.
- Exportar para o Notion continua mockado (`src/services/notionService.js`) — resolve uma URL falsa após um pequeno atraso simulado; é a única simulação que resta no produto, mantida deliberadamente para a demonstração. PDF, cópia de texto e o calendário acadêmico já são reais.
- Autenticação apenas simulada (localStorage) — não protege dados de verdade.
- A migração para Tailwind cobre landing, login/cadastro, layout, componentes base (`ui/`, `layout/`) e as telas Biblioteca, Revisão e Resumo; as demais telas ainda usam estilos inline herdados da Sprint 3, com os mesmos tokens de cor.
