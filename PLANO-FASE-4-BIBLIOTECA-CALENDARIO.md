# Fase 4 — Biblioteca e Calendário reais (Study Vision)

## Contexto

As Fases 1–3 entregaram a camada de dados relacional (`sv_db` v2), os serviços de CRUD e o
sistema de aprendizado (tentativas, domínio, revisão espaçada). O que ficou para trás é a
**camada de organização**: a Biblioteca é uma lista plana que filtra por `subjectName` (string),
não existe nenhuma interface para criar/renomear/excluir matérias, e o calendário é uma seção
somente-leitura dentro da tela de Revisão que mistura revisões com compromissos acadêmicos.

Vários serviços já existem e **nunca são chamados pela UI**: `renameSubject`, `deleteSubject`,
`moveContentToSubject`, `updateEvent`, `deleteEvent`, `linkContentToEvent`,
`unlinkContentFromEvent`, `deleteContent`. A Fase 4 é majoritariamente **ligar o que já existe**
e corrigir as lacunas reais encontradas na auditoria, não reescrever arquitetura.

Resultado esperado ao final: o usuário captura um conteúdo, encontra-o na Biblioteca, organiza-o
em uma matéria (criando-a se preciso), busca por qualquer campo real, cria/edita/exclui
compromissos acadêmicos no calendário, vincula um compromisso a um conteúdo e navega nos dois
sentidos — tudo persistido, sem mocks e sem referência quebrada.

### Decisões tomadas com o usuário

1. **O calendário continua dentro da `ReviewScreen`** (não vira tela nova nem ganha item na bottom nav).
   O que muda: revisões saem do grid acadêmico e o calendário ganha CRUD.
2. **Haverá UI de exclusão de conteúdo**, com diálogo de confirmação.
3. **Commits assinados apenas pelo usuário** — sem linha `Co-Authored-By`.

---

## Auditoria — o que já existe (não recriar)

**Modelos** (`src/data/models/`): `content.js` (`createContent`, `createImage`, `createOpenQuestion`,
`createMastery`), `subject.js` (`createSubject`), `event.js` (`createEvent`, `EVENT_TYPES =
["exam","assignment","class","deadline","other"]`), `review.js`, `flashcard.js`, `quiz.js`,
`validate.js` (`validateContent`, `validateSubject`, `validateEvent`).

**Storage** (`src/data/storage/`): `db.js` (`DB_KEY="sv_db"`, `SCHEMA_VERSION=2`, `readDb`,
`writeDb` com poda por cota, `withDb`), `index.js` (API pública + `ensureMigrated`),
`migrations.js` (v1 → v2).

**Services** (`src/services/`): `contentService` (inclui `moveContentToSubject` e `deleteContent`
com cascata), `subjectService` (inclui `renameSubject` e `deleteSubject` com `reassignTo` +
`SubjectDeletionError`), `eventService` (CRUD completo + link/unlink), `calendarService`
(`scheduleCommitment`), `reviewService`, `studyService`, `performanceService`, `integrityService`
(`sweepOrphans`).

**Estado React**: `src/context/ContentStoreContext.jsx` — `useContentStore()` →
`{ contents, subjects, reviews, events, dueCount, reload, mutate }`. Fonte única.

**Navegação**: `src/hooks/useNavigation.js` (máquina de estado por string) + switch em
`src/App.jsx`. Sem react-router.

**Componentes reutilizáveis já prontos**: `ui/Modal` (bottom-sheet e `center`), `ui/Card`,
`ui/Button`, `ui/Badge`, `ui/SectionLabel`, `ui/Toast`, `ui/SubjectFolderGrid`.
Órfãos aproveitáveis: `ui/EmptyState`, `ui/FilterPills`, `ui/BackButton`, `layout/ScreenHeader`.

**Testes**: `scripts/test-data-layer.mjs` (runner próprio com `node:assert/strict`, shim de
`localStorage`), `npm run test:data` — hoje 42 cenários, todos passando.

### Bugs e lacunas confirmadas na auditoria (são o trabalho da fase)

| # | Problema | Onde |
|---|---|---|
| B1 | Filtro de matéria usa `subjectName` (string), não `subjectId` | `LibraryScreen.jsx:35,42` |
| B2 | Conteúdo sem matéria some de todo filtro (`.filter(Boolean)`) e não tem bucket próprio | `LibraryScreen.jsx:35` |
| B3 | Busca cobre só `title` e `subjectName` | `LibraryScreen.jsx:41` |
| B4 | Matéria criada por comparação de nome exato → "Química"/"quimica" duplicam | `SummaryScreen.jsx:37` |
| B5 | `validateContent` marca conteúdo sem matéria como inválido, mas o modelo permite | `validate.js` |
| B6 | **Evento sem conteúdo vinculado nunca aparece no calendário** (o loop itera `event.contentIds`) | `ReviewScreen.jsx:54-67` |
| B7 | `deadline` e `other` colapsam em "Trabalho" na UI | `legacyEventType.js` |
| B8 | Evento não tem `title` editável na UI, nem `notes`, nem `updatedAt` | `event.js`, `PlanningModal.jsx` |
| B9 | `validateEvent` não valida `type` nem `date` | `validate.js` |
| B10 | Calendário mistura revisões e eventos no mesmo grid | `ReviewScreen.jsx:69-81`, `CalendarMonth.jsx` |
| B11 | Sem editar/excluir evento em nenhuma tela | `DayEventsModal.jsx` |
| B12 | `ContentDetail` mostra só o **último** evento | `ContentDetailScreen.jsx:38` |
| B13 | `sweepOrphans` não limpa `contentIds` órfãos em eventos nem `subjectId` inexistente | `integrityService.js` |
| B14 | Calendário comunica tipo **só por cor/forma**, sem rótulo textual | `CalendarMonth.jsx` |
| B15 | Zero acessibilidade em modais (sem `role`, sem Esc, sem foco) | `ui/Modal.jsx` |

---

## Regras de execução (valem para todas as tarefas)

- **Uma tarefa por vez.** Só avançar depois de rodar a verificação da tarefa e ela passar.
  Se aparecer bug ou erro, corrigir **dentro da mesma tarefa** antes de commitar.
- Verificação mínima ao fim de **toda** tarefa que toca código:
  `npm run test:data` (deve continuar 100% verde) e `npm run build` (deve compilar).
- Um commit por tarefa, **Conventional Commits em português**, sem `Co-Authored-By`, sem
  `--no-verify`. Exemplo: `feat(biblioteca): filtra conteudos por subjectId`.
- Nada de dado sintético. Banco vazio → estado vazio real.
- Nada da Fase 5 (dashboard de evolução, gráficos temporais, gamificação, novas APIs).

---

## Tarefas

### T0 — Salvar o plano na raiz
Criar `PLANO-FASE-4-BIBLIOTECA-CALENDARIO.md` na raiz com o conteúdo deste plano (mesmo padrão dos
`PLANO-FASE-1/2/3`).
**Verificação:** arquivo existe na raiz e lista as 20 tarefas.
**Commit:** `docs(fase-4): documenta plano da biblioteca e do calendario`

---

## Bloco A — Modelo e serviços (fundação)

### T1 — Evento acadêmico completo no modelo
`src/data/models/event.js`: acrescentar `notes` (string, default `""`) e `updatedAt` a
`createEvent`; garantir `title` sempre string com trim; manter `contentIds[]` (N:N) — **não**
trocar por `contentId` singular, o modelo atual é superior e o briefing aceita equivalente.
Criar `EVENT_TYPE_META` (novo export em `event.js` ou em `src/constants.js`) mapeando cada tipo
canônico → `{ label, shortLabel, icon, shape }`: `exam`→"Prova", `assignment`→"Trabalho",
`class`→"Aula", `deadline`→"Entrega", `other`→"Outro". Corrige B7/B8.
`src/data/models/validate.js`: `validateEvent` passa a exigir `title` não vazio, `type` dentro de
`EVENT_TYPES` e `date` no formato `YYYY-MM-DD`. Corrige B9.
Manter `legacyEventType.js` **apenas** para a migração v1 (não usar mais em telas).
**Verificação:** novos casos no `test-data-layer.mjs` — evento com `deadline`/`other` sobrevive a
round-trip; `validateEvent` reprova título vazio, tipo inválido e data malformada; evento antigo
sem `notes` lido do db não quebra.
**Commit:** `feat(evento): completa modelo academico com observacao e validacao de tipo`

### T2 — Conteúdo sem matéria é estado válido
`validate.js`: `validateContent` deixa de exigir matéria; passa a exigir apenas que, **se**
`subjectId` existir, `subjectName` também exista (consistência do cache). Corrige B5.
Definir a constante `UNASSIGNED_SUBJECT_LABEL = "Sem matéria"` (em `src/constants.js`) usada por
toda a UI para o bucket de não organizados.
**Verificação:** teste — `createContent({ title })` sem matéria é válido; `subjectId` sem
`subjectName` é inválido.
**Commit:** `fix(conteudo): aceita conteudo sem materia como estado valido`

### T3 — subjectService à prova de duplicata
`src/services/subjectService.js`: adicionar `normalizeSubjectName(name)` (trim + colapso de
espaços), `findSubjectByName(name)` (comparação case/acento-insensitive via
`String.prototype.normalize("NFD")`) e `ensureSubject(name)` (retorna existente ou cria).
`createSubjectEntry` passa a rejeitar nome vazio (`null` ou erro tipado, coerente com
`SubjectDeletionError`) e a reaproveitar matéria equivalente.
`src/screens/SummaryScreen.jsx`: trocar o `find(s => s.name === ...)` por `ensureSubject`. Corrige B4.
**Verificação:** teste — criar "Química", " quimica " e "QUÍMICA" resulta em **uma** matéria;
nome vazio não cria nada; salvar duas capturas da mesma matéria não duplica.
**Commit:** `fix(materias): evita materias duplicadas por variacao de nome`

### T4 — eventService endurecido
`src/services/eventService.js`: `createEventEntry` valida via `validateEvent` e lança/retorna erro
claro; `updateEvent` preserva `id` e `createdAt` e grava `updatedAt`; `deleteEvent` retorna
`boolean`; `getEvents`/`getEvent` normalizam eventos antigos (campos novos com default).
`unlinkContentFromEvent` **não** apaga o evento vazio (evento pode existir sozinho — seção 14 do briefing).
**Verificação:** teste — update preserva `eventId` e não cria evento novo; delete de id inexistente
retorna `false`; unlink deixa evento com `contentIds: []` e ele continua legível.
**Commit:** `feat(calendario): reforca crud de eventos academicos no service`

### T5 — Integridade referencial ampliada
`src/services/integrityService.js`: `sweepOrphans` passa a (a) remover `contentIds` que apontam
para conteúdo inexistente **sem apagar o evento**, (b) zerar `subjectId`/`subjectName` de conteúdo
cuja matéria não existe mais. Retornar contadores novos. Corrige B13.
**Verificação:** teste — db com evento apontando para conteúdo removido fica com `contentIds`
limpo e o evento preservado; conteúdo com `subjectId` fantasma cai no bucket "Sem matéria";
`deleteContent` continua removendo reviews/tentativas e o evento que ficar sem nenhum conteúdo.
**Commit:** `fix(integridade): limpa referencias orfas de eventos e materias`

---

## Bloco B — Biblioteca

### T6 — Biblioteca por `subjectId` + bucket "Sem matéria"
`src/screens/LibraryScreen.jsx`: filtros passam a operar sobre `subjects` do store (id + nome +
contagem de conteúdos), com as opções `Todos`, cada matéria e `Sem matéria`
(`c.subjectId == null`). Corrige B1/B2. Reutilizar `SubjectFolderGrid` estendendo-o para receber
`{ id, label, count }` em vez de strings soltas.
**Verificação (browser, `npm run dev`):** conteúdo sem matéria aparece em "Todos" e em
"Sem matéria"; renomear matéria pelo service reflete no filtro; contagens conferem.
**Commit:** `feat(biblioteca): organiza conteudos por materia usando subjectId`

### T7 — Busca real multi-campo
`src/screens/LibraryScreen.jsx`: extrair `matchesQuery(content, query)` para
`src/utils/search.js` (novo) — normaliza acentos/caixa e procura em `title`, `subjectName`,
`topic`, `keyConcepts`, `keywords` e `extractedText`. Corrige B3.
**Verificação:** teste unitário de `matchesQuery` no script de dados (buscar "derivada" acha
conteúdo cujo termo só está em `keyConcepts`); no browser, busca sem resultado mostra estado vazio
específico ("Nada encontrado para X"), diferente da biblioteca vazia.
**Commit:** `feat(biblioteca): busca conteudos por topico conceitos e texto extraido`

### T8 — Filtros e ordenação enxutos
Na Biblioteca, além do filtro de matéria: chips de ordenação (`Mais recentes` | `Mais antigos` |
`Nome`) e filtro por status de domínio (`Todos` | `Dominado` | `Em progresso` | `Rever` |
`Não iniciado`, via `content.mastery.level` + `getMasteryMeta`). Reaproveitar o componente órfão
`src/components/ui/FilterPills.jsx`. Sem mais filtros que estes.
**Verificação (browser):** cada ordenação muda a lista de forma coerente; filtro de domínio
combina com busca e com matéria; combinação sem resultado mostra estado vazio.
**Commit:** `feat(biblioteca): adiciona ordenacao e filtro por dominio`

### T9 — Gerenciar matérias pela Biblioteca
Novo `src/components/study/SubjectManagerModal.jsx` (usa `ui/Modal`): criar matéria (input com
validação de vazio/duplicado usando T3), renomear (`renameSubject`) e excluir (`deleteSubject`).
Ao excluir matéria com conteúdos, capturar `SubjectDeletionError` e pedir a matéria de destino
(`reassignTo`), oferecendo também "Deixar sem matéria". Abrir por um botão no header da Biblioteca.
Todas as escritas via `mutate` do `useContentStore`.
**Verificação (browser):** criar "Banco de Dados" → aparece imediatamente no filtro; recarregar a
página → continua existindo; renomear reflete nos cards; excluir matéria com conteúdo exige destino
e move os conteúdos preservando os ids.
**Commit:** `feat(materias): permite criar renomear e excluir materias na biblioteca`

### T10 — Mover conteúdo entre matérias
Novo `src/components/study/SubjectPickerModal.jsx` reutilizando a lista de matérias + criação
inline. Botão "Alterar matéria" na `ContentDetailScreen` chamando `moveContentToSubject` via
`mutate`. Também disponível a partir do bucket "Sem matéria" da Biblioteca (organizar depois).
**Verificação (browser + teste):** mover "Introdução a Derivadas" de Matemática para Cálculo
mantém `content.id`, `images`, `flashcards`, `quizzes`, `notes`, tentativas, reviews e eventos
vinculados (teste automatizado compara o objeto antes/depois campo a campo).
**Commit:** `feat(conteudo): move conteudo entre materias preservando o mesmo id`

### T11 — Excluir conteúdo com confirmação
Novo `src/components/ui/ConfirmDialog.jsx` (modal `center`, botões cancelar/confirmar, foco inicial
no cancelar) — componente genérico reutilizado depois no calendário. Ação "Excluir conteúdo" na
`ContentDetailScreen`, chamando `deleteContent` via `mutate` e voltando para a Biblioteca.
O texto de confirmação deve dizer o que será removido junto (fotos, flashcards, quizzes,
tentativas, revisões) e que eventos vinculados a outros conteúdos **não** serão apagados.
**Verificação (browser + teste):** excluir conteúdo remove reviews e tentativas, tira o
`contentId` dos eventos, mantém evento que ainda tem outro conteúdo, e não sobra nada em
`sweepOrphans` na próxima abertura.
**Commit:** `feat(conteudo): exclui conteudo com confirmacao e cascata segura`

---

## Bloco C — Calendário

### T12 — Calendário acadêmico separado das revisões
`src/screens/ReviewScreen.jsx`: montar `eventsByDate` **direto de `events`** (uma entrada por
evento, não por `contentId`), de modo que evento sem conteúdo apareça — corrige B6. As revisões
saem do grid e permanecem apenas nas seções "PARA HOJE" e "PRÓXIMAS REVISÕES" — corrige B10.
Renomear o rótulo da seção para `CALENDÁRIO ACADÊMICO`.
`src/components/study/CalendarMonth.jsx`: passa a receber `eventsByDate`; cada dia com evento mostra
o **ícone do tipo** (de `EVENT_TYPE_META`) além do indicador de cor, com `title`/`aria-label`
descritivo ("12 de setembro — 1 Prova"). Adicionar legenda textual abaixo do grid
(● Prova ◆ Trabalho ▲ Aula ■ Entrega ○ Outro). Corrige B14.
**Verificação (browser):** criar evento sem conteúdo pelo service e ver o dia marcado; nenhuma
revisão aparece no grid; a legenda descreve todos os tipos presentes; dias sem evento continuam
não clicáveis.
**Commit:** `feat(calendario): separa eventos academicos das revisoes no grid mensal`

### T13 — CRUD de evento pelo calendário
Novo `src/components/study/EventFormModal.jsx` (substitui o `PlanningModal` para compromissos
acadêmicos): campos **título** (obrigatório), **tipo** (5 tipos canônicos com rótulo pt-BR),
**data** (obrigatória), **horário** (opcional), **observação** (opcional) e **conteúdo relacionado**
(opcional, seletor buscável sobre `contents`, permitindo nenhum). Serve para criar e editar
(recebe `event` opcional). Botão "Novo compromisso" no cabeçalho da seção do calendário.
Exclusão via `ConfirmDialog` (T11) chamando `deleteEvent`.
Manter o agendamento de **revisão manual** onde já está (`calendarService.scheduleCommitment` com
`"Revisão"`), fora deste modal — revisão não é evento.
**Verificação (browser):** criar um evento de cada tipo (Prova, Trabalho, Aula, Entrega);
recarregar → os quatro persistem; editar título/data/tipo preserva o `eventId` (conferir no
`localStorage`); excluir evento não apaga o conteúdo vinculado; título vazio ou data vazia bloqueia
o salvamento com mensagem clara.
**Commit:** `feat(calendario): cria edita e exclui compromissos academicos`

### T14 — Dia do calendário acionável
`src/components/study/DayEventsModal.jsx`: cada linha mostra ícone + rótulo do tipo + título +
horário + matéria do conteúdo vinculado (quando houver), e ações **Ver conteúdo**, **Editar**,
**Excluir**. `contentId` sem conteúdo correspondente renderiza "Conteúdo não disponível" e
desabilita "Ver conteúdo" — sem quebrar (seção 21 do briefing). Corrige B11.
**Verificação (browser):** abrir dia com 2 eventos e agir em cada um; remover o conteúdo pelo
console/serviço e reabrir o dia → aparece "Conteúdo não disponível" sem erro no console.
**Commit:** `feat(calendario): permite abrir editar e excluir evento pelo dia selecionado`

### T15 — Compromissos na página de conteúdo
`src/screens/ContentDetailScreen.jsx`: substituir a `PlanningSection` (que exibe só o último
evento) por uma seção **COMPROMISSOS** listando **todos** os eventos de `getEventsForContent`,
ordenados por data, cada um com tipo, data/hora e ações editar/desvincular. Corrige B12.
Botão "Adicionar compromisso" abre o `EventFormModal` já com o conteúdo pré-vinculado.
Manter separada a informação de revisão (card "Status de revisão" já existente).
Se `PlanningModal.jsx`/`PlanningSection.jsx` ficarem sem uso após T13/T15, remover os arquivos e o
`PLANNING_TYPES` correspondente.
**Verificação (browser):** conteúdo com 3 eventos lista os 3; desvincular remove da lista mas o
evento continua no calendário; a `SummaryScreen` (fluxo de captura) continua agendando corretamente.
**Commit:** `feat(conteudo): lista e gerencia compromissos academicos do conteudo`

### T16 — Navegação entre calendário e conteúdo
`src/App.jsx` + `src/hooks/useNavigation.js`: permitir abrir `detail` a partir da `ReviewScreen`
(setar `selectedContentId` e empilhar), com `goBack()` voltando ao calendário e não à Biblioteca;
ajustar `navActive` para que o item destacado continue coerente. Sem criar tela nova.
**Verificação (browser):** Calendário → evento → "Ver conteúdo" → detalhe → voltar retorna à
Revisão; Biblioteca → detalhe → voltar retorna à Biblioteca; a bottom nav destaca o item certo nos
dois caminhos.
**Commit:** `feat(navegacao): conecta calendario e pagina de conteudo nos dois sentidos`

---

## Bloco D — Qualidade

### T17 — Erros e estados vazios reais
Padronizar mensagens de erro nas escritas (`try/catch` + `showToast`) para salvar/editar/excluir de
matéria, conteúdo e evento; tratar `writeDb` retornando `{ ok: false, reason }` (cota) com aviso.
Estados vazios via `ui/EmptyState` (componente órfão) na Biblioteca (sem conteúdo × busca sem
resultado × matéria vazia) e no calendário (mês sem compromissos).
**Verificação (browser):** com `localStorage` limpo, todas as telas mostram estado vazio correto e
nenhuma quebra; forçar erro de escrita (encher a cota) mostra toast em vez de falha silenciosa.
**Commit:** `feat(ux): padroniza estados vazios e mensagens de erro`

### T18 — Acessibilidade e responsividade
`ui/Modal`: `role="dialog"`, `aria-modal`, `aria-label`, fechar com `Esc` e clique no backdrop,
foco inicial no primeiro controle e devolução do foco ao fechar. Corrige B15.
Botões de ícone com `aria-label`; `<label>` associado ao campo de busca; `:focus-visible` visível
nos controles; alvos de toque ≥ 44px nos dias do calendário e nos chips; tipo do evento sempre
acompanhado de ícone/rótulo, nunca só cor.
`src/styles/global.css`: além do `@media (max-width: 480px)` existente, garantir que Biblioteca e
calendário não gerem overflow horizontal em 320px e que o grid do calendário use `aspect-ratio`
sem estourar em telas largas.
**Verificação:** navegar Biblioteca e Calendário só pelo teclado (Tab/Enter/Esc); DevTools em
320px, 768px e 1280px sem scroll horizontal; conferir contraste dos rótulos de tipo.
**Commit:** `feat(acessibilidade): torna modais e calendario navegaveis e responsivos`

### T19 — Cobertura de testes da Fase 4
Ampliar `scripts/test-data-layer.mjs` com o bloco `F4-*` cobrindo os testes 1–23 do briefing que
são verificáveis na camada de dados: criar matéria e persistir após reload; criar conteúdo; mover
conteúdo preservando id/fotos/flashcards/quizzes/tentativas; criar evento de cada um dos 4 tipos e
persistir após reload; associar/desassociar evento e conteúdo; excluir evento sem excluir conteúdo;
excluir conteúdo sem deixar referência quebrada; busca por título/matéria/tópico/conceito; filtro
por matéria e bucket sem matéria; banco vazio → coleções vazias; revisões continuam separadas dos
eventos após todo o fluxo.
**Verificação:** `npm run test:data` verde com os 42 cenários antigos **mais** os novos; `npm run build` OK.
**Commit:** `test(fase-4): cobre biblioteca calendario e integridade de referencias`

### T20 — Documentação e limpeza final
Atualizar `MOCKS.md` (confirmar que Biblioteca e Calendário não usam nada sintético; o único mock
remanescente segue sendo `notionService`); atualizar a seção 6 do `PRD.md`, hoje descrevendo o
modelo v1 (`sv_items`), para o modelo v2 com Content/Subject/Event/Review; remover código morto
(`legacyEventType` no runtime da UI, `PlanningModal`/`PlanningSection` se substituídos,
`CANONICAL_TO_LEGACY_EVENT_TYPE` fora da migração). Marcar no plano da raiz o que ficou pronto
para a Fase 5 (histórico de `getQuizPerformance`, contagens por tipo de evento, mastery por matéria).
**Verificação:** `npm run test:data` + `npm run build`; grep confirma que nenhum arquivo removido
ainda é importado.
**Commit:** `docs(fase-4): atualiza mocks prd e remove codigo legado do calendario`

---

## Verificação final da fase (checklist do briefing)

Rodar em sequência, com `npm run dev` e `localStorage` limpo:

1. Abrir o app sem dados → Biblioteca e Calendário em estado vazio, sem erro no console.
2. Criar matéria "Banco de Dados" → aparece na hora; **F5** → continua.
3. Capturar/salvar um conteúdo → aparece na Biblioteca com a matéria certa.
4. Mover o conteúdo para outra matéria → `content.id` inalterado; fotos, flashcards, quizzes e
   tentativas intactos (conferir no `localStorage` → `sv_db`).
5. Criar quatro eventos (Prova, Trabalho, Aula, Entrega), um deles **sem** conteúdo vinculado →
   **F5** → os quatro persistem e o sem conteúdo aparece no grid.
6. Abrir evento → "Ver conteúdo" abre o Content correto; voltar retorna ao calendário.
7. Abrir conteúdo → lista todos os compromissos relacionados.
8. Excluir evento → conteúdo continua existindo.
9. Excluir conteúdo → nenhuma referência quebrada; `sweepOrphans` não encontra nada na abertura seguinte.
10. Buscar "derivada" (termo só em conceitos) → encontra; filtrar por matéria → funciona.
11. Revisões seguem apenas nas seções de revisão, nunca no grid acadêmico.
12. Responsividade em 320px / 768px / 1280px, sem overflow horizontal.
13. `npm run test:data` e `npm run build` verdes.

## Fora de escopo (Fase 5)

Dashboard de evolução, gráficos temporais, métricas avançadas, Study Vision+/paywall/assinatura,
recomendações adaptativas, gamificação, ranking, novo backend de IA e novas APIs externas.
A Fase 4 apenas **prepara os dados** para isso.
