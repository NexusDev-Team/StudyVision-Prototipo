# Adequação do StudyVision aos requisitos de entrega

## Contexto

O projeto será entregue como avaliação (React + prototipagem + documentação). Uma auditoria do repositório contra a lista de requisitos mostrou que a maior parte já está cumprida, mas quatro itens reprovam ou ficam em zona de risco na correção. O objetivo deste plano é fechar exatamente esses quatro pontos, sem refatorar o que já está aprovado.

## Auditoria — situação atual

| Requisito | Situação | Evidência |
|---|---|---|
| React, componentes funcionais | OK | Todos os componentes em `src/` são funções; nenhuma classe |
| Estrutura cabeçalho / corpo / footer | OK | `src/components/layout/ScreenHeader.jsx`, `Screen.jsx`, `BottomNav.jsx` |
| Hierarquia pai → filho | OK | `src/App.jsx` passa props para as screens; screens passam para `components/ui` e `components/study` |
| localStorage | OK | `src/services/storage.js` (`sv_items`), `src/services/subscription.js` (`sv_subscription`) |
| Math — arredondamento / operações | OK | `Math.round` em `reviewEngine.js:44`, `Math.floor` em `subscription.js:31`, `Math.max/min` em `ProgressBar.jsx:5`, `Math.PI` em `ProgressRing.jsx:7` |
| **Math — randomização** | **FALTA** | `Math.random` não aparece em nenhum arquivo de `src/` |
| Protótipo fiel, imagens/tipografia | OK | 3 fotos reais em `src/assets/`, tokens em `src/styles/tokens.css` |
| Versionado no GitHub | OK | repo git, branch `main`, 40+ commits |
| README — tecnologias / instalar / executar / credenciais / parágrafo de IA | OK | `README.md` |
| **README — link do deploy na Vercel** | **FALTA** | README aponta para GitHub Pages (`nexusdev-team.github.io/...`), não para a Vercel |
| **INTEGRANTES.TXT** | **PARCIAL** | arquivo é `integrantes.txt` (minúsculo) e traz só o primeiro nome; o requisito pede **nome completo** e RM |
| **Build da Vercel reproduzível** | **RISCO** | `vite.config.js` usa `outDir: "docs"`; a Vercel detecta Vite e procura `dist` por padrão. O deploy atual só funciona se a pasta de saída foi ajustada manualmente no painel — nada no repositório garante isso |
| Entrega em .ZIP | Ação manual do time | fora do escopo de código |

## Mudanças planejadas

### 1. Corrigir INTEGRANTES.TXT

- Renomear via git (`git mv integrantes.txt INTEGRANTES.TXT`) para bater com o nome exigido. No Windows o rename direto pode não registrar a troca de caixa — usar rename em dois passos se necessário (`integrantes.txt` → `_tmp` → `INTEGRANTES.TXT`).
- Preencher o **nome completo** de cada integrante mantendo os RMs atuais (573282, 570206, 573291, 570959, 572940). **Os sobrenomes precisam ser informados pelo time** — não estão em nenhum lugar do repositório.
- Formato: uma linha por integrante, `Nome Completo — RM 000000`.

### 2. Trocar o link de deploy no README para a Vercel

- Em `README.md`, substituir a linha `**Deploy:** https://nexusdev-team.github.io/StudyVision-Prototipo/` por `**Deploy (Vercel):** https://study-vision-prototipo-as1a.vercel.app`.
- Manter o link do GitHub Pages como referência secundária (opcional) e adicionar o link do repositório Git, já que a entrega pede os dois links explicitamente.

### 3. Garantir o build da Vercel pelo repositório

- Criar `vercel.json` na raiz declarando `outputDirectory: "docs"` e `buildCommand: "npm run build"`, para que o deploy funcione a partir de um clone limpo sem depender de configuração de painel.
- Não alterar `outDir` no `vite.config.js`: o GitHub Pages depende de `docs/`, e `base: "./"` já é compatível com ambos.

### 4. Introduzir randomização com `Math.random`

O requisito cita "randomizações" explicitamente. Duas inserções pequenas e funcionais, sem inventar tela nova:

- **Embaralhar flashcards** em `src/screens/FlashcardsScreen.jsx`: novo helper `shuffle(array)` usando Fisher–Yates com `Math.random()`, aplicado ao entrar em modo revisão. Guardar o resultado em `useState(() => shuffle(cards))` para não reembaralhar a cada render. A contagem gratuita (`FREE_FLASHCARD_LIMIT`) e a lógica de `lockedCount` na linha 16 continuam iguais — o corte segue sendo por quantidade.
- **Alternar as questões geradas** em `src/screens/QuizScreen.jsx`: `generateQuizQuestion` hoje é determinística (`n % concepts.length`) e devolve sempre `answer: true`. Passar a sortear o conceito com `Math.random()` e sortear se a afirmação será verdadeira ou falsa (quando falsa, usar um conceito de outra matéria em `SAMPLE_ITEMS` como distrator), de forma que o botão "gerar mais" produza questões variadas.

O helper `shuffle` fica em `src/services/reviewEngine.js` — módulo que já concentra a lógica de estudo — e é importado pelas duas telas, evitando duplicação.

## Verificação

1. `npm run build` — deve concluir sem erro e regravar `docs/`.
2. `npm run dev` e, no navegador:
   - Biblioteca → abrir um conteúdo → **Flashcards**: a ordem dos cards muda entre entradas na tela.
   - Biblioteca → abrir um conteúdo → **Mini Quiz** → responder tudo → "gerar mais": as questões novas variam de conceito e alternam verdadeiro/falso.
   - Salvar uma captura e recarregar a página: o item persiste (localStorage intacto).
3. `git ls-files | grep -i integrantes` — deve retornar `INTEGRANTES.TXT` em maiúsculas.
4. Após o push, confirmar que a Vercel refaz o deploy e que https://study-vision-prototipo-as1a.vercel.app continua abrindo o app.
5. Ler o README de ponta a ponta simulando o professor: instalar, rodar, achar os dois links.

## Fora deste plano

- Gerar o .ZIP da entrega (ação manual do time, após o merge).
- Qualquer trabalho de "de-mock" (OCR real, câmera nativa, OAuth do Notion/Calendar) — não é exigido pelos requisitos de entrega.
