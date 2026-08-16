# Calendário na tela Revisão — design

## Contexto

Hoje a tela `ReviewScreen.jsx` tem um bloco "COMPROMISSOS · CALENDÁRIO" que lista
compromissos (`item.calendarEvent`) em linha, um `CommitmentCard` por item, sem
noção de data/mês real. Vira um calendário mensal de verdade.

## Escopo

Troca **só** o bloco de compromissos (linhas 71-83 de `ReviewScreen.jsx`), mantendo
"PARA HOJE" e "PRÓXIMAS REVISÕES" como estão.

## Dados

Fonte: `items` de `useStudyItems()`, já carregados na tela. Filtra quem tem
`item.calendarEvent`, agrupa por `item.calendarEvent.date` (string `YYYY-MM-DD`).
Cor por matéria = `item.subjectColor` (já existe em cada item de `sampleContent.js`).
Nenhum novo estado global, nenhuma persistência nova — usa o que já existe.

## Componentes

### `src/components/study/CalendarMonth.jsx`
- Grid mensal (dom–sáb), navegação de mês com setas ‹ › e label "Agosto 2026".
- Estado local: mês/ano exibido (`useState`, inicia no mês atual).
- Dia atual: contorno azul sutil.
- Dia sem compromisso: não clicável, só número.
- Dia com compromisso(s): bolinha de contorno do número preenchida com a cor da matéria.
  - 1 matéria → bolinha (contorno do número) cor sólida (`item.subjectColor`).
  - 2+ matérias → bolinha (contorno do número) com `conic-gradient` em fatias
    iguais, uma cor por matéria distinta presente naquele dia (matéria repetida
    não duplica fatia).
- Clique em dia com compromisso → abre `DayEventsModal` com a lista daquele dia.
- Props: `commitmentsByDate` (map `date -> item[]`), `onSelectDate(date)`.

### `src/components/study/DayEventsModal.jsx`
- Popup centralizado (usa `<Modal center>` — variante nova no `Modal.jsx` existente).
- Header: data formatada + botão X (fecha).
- Lista de compromissos do dia: bolinha da matéria, nome do conteúdo (`item.concept`),
  tag do tipo (`item.calendarEvent.type`), horário (`item.calendarEvent.time`).
  Sem resumo, sem detalhes extra — só isso.
- Props: `date`, `items`, `onClose`.

### `src/components/ui/Modal.jsx`
- Adiciona prop opcional `center` (default `false` = comportamento atual,
  bottom-sheet). `center=true` → alinha o card no meio da tela em vez de
  `flex-end`, cantos arredondados nos 4 lados em vez de só em cima.
- `PlanningModal` não muda (continua sem passar `center`, mantém bottom-sheet).

## Mudança em `ReviewScreen.jsx`

- Header do bloco vira só **"Calendário"** (remove "COMPROMISSOS ·" e o
  subtítulo "Data de provas, listas...").
- Substitui a lista de `CommitmentCard` por `<CalendarMonth />`.
- Novo estado local `selectedDate` (`useState(null)`) controla se
  `DayEventsModal` está aberto.
- `CommitmentCard.jsx` fica sem uso após a troca — remove o arquivo.

## Fora de escopo

- Sem edição/criação de compromisso pelo calendário (isso já existe via
  "Salvar Compromisso" no resumo).
- Sem swipe entre meses, só os botões de seta.
- Sem indicador de "revisões pendentes" (isso é o bloco "PARA HOJE" já existente).
