# Ajustes na tela de Evolução e na tela de Conteúdo

Data: 2026-09-05

## Contexto

Depois das Fases 1–6, a tela de Evolução (`EvolutionScreen`) acumulou seções
que se sobrepõem em significado ("Distribuição de domínio", "Precisa de
atenção", "Evolução por matéria", "Insights") e a tela de Conteúdo
(`ContentDetailScreen`) tem duas interações de exclusão com estética fraca
(o "x" vermelho sobre a miniatura da foto; ausência de exclusão total do
compromisso). Este documento descreve seis ajustes pontuais, sem refatoração
ampla.

## Escopo

Seis mudanças, agrupadas por tela.

### Tela de Evolução

**1. Remover "Distribuição de domínio" e pôr no lugar "Matérias para rever".**

- Remove o uso de `PerformanceChart` em `EvolutionScreen` (a seção
  "Distribuição de domínio" com as barras por nível de domínio).
  O componente `PerformanceChart.jsx` deixa de ser importado; se nenhum
  outro consumidor existir, o arquivo é apagado.
- No lugar exato onde a seção estava (logo após "Desempenho", antes de
  "Evolução por matéria"), entra uma nova seção **"Matérias para rever"**:
  - Lista apenas matérias que precisam de revisão — matéria com pelo menos
    um conteúdo de acerto real abaixo de `WEAK_THRESHOLD` (60%) **ou** com
    revisão pendente atrasada.
  - Cada linha: nome da matéria + motivo curto ("acerto baixo" /
    "revisão atrasada" / "acerto baixo e revisão atrasada") + contagem de
    conteúdos afetados.
  - Tocar a linha chama `onOpenLibrary(subjectId)` (mesma navegação que
    "Evolução por matéria" já usa) para abrir a Biblioteca filtrada.
  - Sem nenhuma matéria a rever: estado vazio curto ("Nenhuma matéria
    precisando de revisão agora."), nunca um card em branco.
- Novo componente `src/components/plus/ReviewNeededCard.jsx` (nome em inglês
  para casar com os vizinhos `AttentionCard`, `StrengthsCard`), gratuito,
  sem paywall.
- Nova função em `evolutionService.js`: `getSubjectsToReview({ limit } = {})`.
  Deriva de `getContents` + `calculateContentPerformance` + `getOverdueReviews`
  agrupando por `subjectId`; não persiste nada; matéria sem `subjectId`
  agrupa sob o rótulo de "sem matéria" já usado no app. Ordena por número de
  conteúdos afetados, desc.

**2. Remover "Precisa de atenção".**

- Remove o uso de `AttentionCard` em `EvolutionScreen`. O motivo é
  redundância: "conteúdos com acerto < 60% ou revisão atrasada" agora é
  coberto, no nível de matéria, por "Matérias para rever", e no nível de
  conteúdo pela seção "Reviews" e pelos Insights.
- `AttentionCard.jsx` e `getWeakContents` **permanecem** no código:
  `getWeakContents` ainda alimenta `getRecommendations` e passará a alimentar
  os Insights (item 3). Só a seção visual dedicada some.

**3. Insights mais completos: pontos fortes, pontos fracos agora, dicas.**

- A seção "Insights" (que continua **atrás do `PlusPaywall`**, como hoje)
  passa de "delta + lista de recomendações" para um bloco estruturado com
  três grupos rotulados, nesta ordem:
  1. **Pontos fortes** — matérias com acerto real ≥ `STRONG_THRESHOLD`
     (80%), de `getStrongSubjects`. Vazio: linha "Alcance 80% de acerto
     numa matéria para ela aparecer aqui."
  2. **Pontos fracos agora** — conteúdos de `getWeakContents` (acerto < 60%
     ou revisão atrasada), cada um tocável chamando `onOpenContent`.
     Vazio: "Nenhum conteúdo em dificuldade no momento."
  3. **Dicas** — `getRecommendations` (texto já determinístico, sem IA).
     Vazio: "Continue estudando para desbloquear dicas."
- A linha de delta ("+N p.p. nas últimas semanas") continua, como cabeçalho
  do grupo "Pontos fortes" ou logo acima dos três grupos.
- `StrengthsCard` deixa de ser renderizado como card verde solto em
  `EvolutionScreen` — seu conteúdo (pontos fortes) passa a viver dentro dos
  Insights. `StrengthsCard.jsx` é removido se não houver outro consumidor.
  Trade-off aceito: pontos fortes deixam de aparecer para o usuário free
  (ficam atrás do paywall junto com o resto dos Insights).
- Novo componente `src/components/plus/InsightsPanel.jsx` recebe
  `{ delta, strongSubjects, weakContents, recommendations, onOpenContent }`
  e renderiza os três grupos. `EvolutionScreen` monta os dados via os
  `useMemo` já existentes.

**4. "Evolução" vira gráfico de acompanhamento, dentro do paywall Plus.**

- A seção "Evolução" (hoje: `SparkChart` escondido com `aria-hidden` + uma
  `<ul>` textual com uma linha por semana) passa a ter o `SparkChart`
  **visível** como gráfico principal de acompanhamento da taxa de acerto ao
  longo das semanas (`getProgressHistory({ weeks: 8 })`), com:
  - rótulos de semana no eixo X (já suportado por `SparkChart`);
  - rótulos de valor mínimo/máximo (%) nas extremidades verticais;
  - a lista textual semana-a-semana mantida abaixo, agora como detalhamento
    acessível (não mais a apresentação principal).
- A seção inteira passa a ficar **atrás do `PlusPaywall`** (hoje é
  gratuita). Usuário free vê o paywall compacto ("Acompanhe sua evolução
  ao longo do tempo") com CTA de trial; Plus vê o gráfico.
- Estado com menos de 2 semanas de dado: mensagem atual ("Responda questões
  para acompanhar sua evolução ao longo do tempo."), dentro do paywall.
- Sem componente novo: ajuste em `EvolutionScreen` +, se necessário,
  pequenos rótulos de eixo Y em `SparkChart` via nova prop opcional
  `yLabels` (não quebra os outros usos).

**Ordem final das seções em `EvolutionScreen`:** Resumo → Desempenho →
Matérias para rever → Evolução por matéria → Evolução (gráfico, Plus) →
Reviews → Insights (Plus) → CTA final (free).

### Tela de Conteúdo

**5. Excluir foto pelo visualizador ampliado, não pela miniatura.**

- Em `PhotosSection.jsx`: remover o botão circular vermelho com "x" no canto
  da miniatura. A miniatura fica só com o toque que abre o visualizador.
  O `ConfirmDialog` de remoção e o estado `pendingRemove` saem de
  `PhotosSection` (passam para o visualizador).
- Em `PhotoViewerModal.jsx`: adicionar, no canto superior da moldura da
  imagem ampliada, um botão com ícone de lixeira (`Trash2`), alinhado à
  esquerda e o botão de fechar à direita, na mesma linha de cima — mesma
  altura/tamanho de alvo (44px) para simetria. Tocar a lixeira abre um
  `ConfirmDialog` ("Remover esta foto?"); confirmar chama
  `onRemoveImage(image.id)`.
- Após remover: se ainda houver fotos, o visualizador ajusta o índice
  (clamp) e continua aberto na foto seguinte; se era a última, fecha.
- Fluxo de dados: `PhotoViewerModal` passa a receber `onRemoveImage`.
  Em `App.jsx`, `photoViewer` guarda `{ contentId, index }` (não mais um
  array congelado de imagens); as imagens são derivadas do store
  (`contents.find(...).images` ordenadas) a cada render, para a exclusão
  refletir na hora. O handler de exclusão em `App.jsx` faz
  `mutate(() => removeImageFromContent(contentId, imageId))` e
  `showToast("✓ Foto removida")` — mesma operação que
  `ContentDetailScreen.handleRemovePhoto` fazia. `ContentDetailScreen`
  para de passar `onRemovePhoto` para `PhotosSection` (a prop e
  `handleRemovePhoto` são removidos de lá).

**6. Excluir o compromisso inteiro na tela de Conteúdo.**

- Em `CommitmentsSection.jsx`: ao lado do botão "desvincular" (`Link2Off`),
  adicionar um botão com ícone de lixeira (`Trash2`) rotulado
  "Excluir compromisso". Ordem dos ícones na linha: editar (`Pencil`) →
  desvincular (`Link2Off`) → excluir (`Trash2`).
- Semântica, deixada explícita no `ConfirmDialog`:
  - **Desvincular** = o evento continua no calendário, só deixa de
    referenciar este conteúdo (comportamento atual, inalterado).
  - **Excluir compromisso** = o evento é apagado do calendário para sempre,
    afetando qualquer outro conteúdo vinculado a ele.
- Tocar a lixeira abre `ConfirmDialog` ("Excluir este compromisso?",
  descrição deixando claro que some do calendário e de todos os conteúdos);
  confirmar chama um novo `onDelete(event)`.
- `CommitmentsSection` passa a receber `onDelete`. Em
  `ContentDetailScreen`, novo `handleDeleteEvent(event)`:
  `mutate(() => deleteEvent(event.id))` (`deleteEvent` já existe em
  `eventService.js`), `onToast("✓ Compromisso excluído")`, com o mesmo
  `try/catch` dos outros handlers de evento. Importar `deleteEvent` de
  `../services/eventService`.

## O que NÃO muda

- Nenhuma alteração na camada de dados/persistência além da nova função de
  leitura `getSubjectsToReview` (pura, derivada).
- `getWeakContents`, `getRecommendations`, `getStrongSubjects`,
  `getProgressHistory`, `getAccuracyDelta` permanecem como estão.
- Navegação, rotas e `BottomNav` inalterados.
- `AttentionCard.jsx` permanece no repositório (ainda referenciado
  conceitualmente pelos Insights via `getWeakContents`); só sai da árvore
  de render da Evolução. Se preferirmos apagar de vez, decidir no plano.

## Testes

- `evolutionService`: novo teste para `getSubjectsToReview` — matéria com
  conteúdo < 60% aparece; matéria com revisão atrasada aparece; matéria
  saudável não aparece; agrupamento por `subjectId`; ordenação; `limit`.
- Ajustar ou remover asserts de testes que hoje verificam a presença das
  seções "Distribuição de domínio" / "Precisa de atenção" na Evolução, se
  existirem.
- `PhotoViewerModal`: teste de que a lixeira dispara o confirm e o
  `onRemoveImage`; que fechar após remover a última foto funciona.
- `CommitmentsSection`: teste de que a lixeira dispara o confirm e o
  `onDelete`; que "desvincular" continua chamando `onUnlink`.
- Build (`npm run build`) e suíte (`npm test`) verdes.
- Verificação manual no navegador das duas telas.

## Commits

Convencionais, em português, escopo `fase-7` (ou `ajustes` se o plano
preferir), pequenos e verificáveis — um por item, subdivididos se um item
tocar serviço + UI + teste.
