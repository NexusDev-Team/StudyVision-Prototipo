# Study Vision — JOVI

Protótipo do Study Vision, feature de câmera com IA para a linha JOVI Smartphones. Front-end React/Vite, 100% mocado (sem backend) — ver `PRD.md` para o contexto completo do produto.

## Estrutura

```
src/
├── components/
│   ├── layout/    # PhoneFrame, StatusBar, BottomNav, Screen, ScreenHeader, ScrollArea
│   ├── ui/        # Button, Card, Badge, SectionLabel, FilterPills, Modal, Toast...
│   ├── brand/     # LogoSVG, CapturedPageVisual
│   └── study/     # ContentBlocks, Flashcard, QuizQuestion, ReviewCard...
├── screens/       # As 10 telas do app (Camera, Library, Flashcards, Review...)
├── data/          # Conteúdo de exemplo (SAMPLE_ITEMS)
├── services/      # storage (localStorage), reviewEngine (repetição espaçada),
│                  # calendarService/exportService/notionService (mocks)
├── hooks/         # useNavigation, useToast, useStudyItems
├── styles/        # tokens.css (design tokens), global.css, motion.js
├── constants.js
├── App.jsx        # componente raiz
└── main.jsx
```

## Rodando localmente

```bash
npm install
npm run dev
```

## Build e publicação (GitHub Pages)

O deploy é manual, direto da branch `main`. Não existe mais branch `gh-pages` nem script `deploy`.

```bash
npm run build      # gera a pasta docs/ (outDir configurado no vite.config.js)
git add docs
git commit -m "build: atualiza docs/ para publicação"
git push
```

No GitHub: **Settings → Pages → Source: Deploy from a branch → Branch `main` / pasta `/docs`**.

## Planejamento

Planos de trabalho ficam em `plans/`.

## Demonstração do Study Vision+

O estado de assinatura (`sv_subscription` no localStorage) persiste entre sessões.
Para reiniciar a demonstração — voltar ao estado Free durante uma apresentação —
segure (long-press, ~1s) o selo **PLUS** no topo da aba Study Vision+.
