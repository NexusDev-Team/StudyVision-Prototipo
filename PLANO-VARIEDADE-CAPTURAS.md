# Plano — Variedade de capturas (Física e Português) + pastas de matéria roláveis

## Contexto

Hoje a demo do Study Vision sempre mostra a mesma foto no viewfinder (`exemplo-foto1.png`) e o rodízio de capturas (`CAPTURE_POOL`) reaproveita os 3 itens de exemplo já existentes na biblioteca. Ao apresentar o app para bancas/testes, a experiência fica repetitiva e pouco convincente.

Foram enviados dois materiais reais:
- `src/assets/exemplo2_fisica.jpg` — mapa mental de **Física** (Leis de Ohm)
- `src/assets/exemplo3_portugues.jpg` — lousa manuscrita, matéria **Português**, tema Absolutismo

Resultado esperado: capturar a foto passa a alternar entre **3 conteúdos distintos com foto real** (Matemática, Física, Português), cada um percorrendo o fluxo completo (análise → resumo → flashcards → questões → quiz → revisões → biblioteca → exportação) sem erro. As matérias novas (**Física** e **Português**) precisam existir como pastas na Biblioteca, com ícone, cor e fundo próprios; e a fileira de pastas deve crescer **na horizontal com rolagem lateral**, nunca quebrando em novas linhas.

Decisões confirmadas com o usuário:
- `exemplo3` = matéria **Português** (pasta nova), tema/conteúdo sobre Absolutismo.
- Foto real aparece **tanto no viewfinder da câmera quanto no card de conteúdo capturado**.
- Rodízio de captura fica com **3 opções** (as 3 que possuem foto). História e Química continuam existindo na biblioteca, mas fora do rodízio.

---

## Arquivos a alterar

| Arquivo | Mudança |
|---|---|
| `src/constants.js` | `SUBJECT_META.Português`; `SUBJECT_FILTERS` ganha Física e Português |
| `src/data/sampleContent.js` | 2 itens novos + campo `photo` + rodízio de 3 + `peekCaptureTemplate()` |
| `src/components/ui/SubjectFolderGrid.jsx` | rolagem horizontal + ícone novo |
| `src/components/ui/SubjectFolderGrid.module.css` | **novo** — linha rolável sem scrollbar visível |
| `src/components/brand/CapturedPageVisual.jsx` | renderiza `item.photo` quando existir |
| `src/screens/CameraScreen.jsx` | viewfinder usa a foto da próxima captura |
| `src/App.jsx` | passa a foto da próxima captura ao `CameraScreen` |

---

## Etapa 1 — Metadados das matérias novas

**`src/constants.js`**

1. Adicionar em `SUBJECT_META`:
   ```js
   Português: { icon: "BookA", color: "#DB2777", bg: "#FDF2F8" },
   ```
   `Física` já existe (`Atom` / `#7C3AED` / `#EDE9FE`) — reaproveitar, não duplicar.
2. Expandir `SUBJECT_FILTERS`:
   ```js
   export const SUBJECT_FILTERS = ["Todos", "Matemática", "História", "Química", "Física", "Português"];
   ```

Cores escolhidas para não colidir com as já usadas (`#2563EB` Matemática, `#16A34A` História, `#EA580C` Química, `#7C3AED` Física).

---

## Etapa 2 — Pastas roláveis na horizontal

**`src/components/ui/SubjectFolderGrid.module.css`** (novo — segue o padrão de `FilterPills.module.css`)

```css
.row {
  display: flex;
  gap: 10px;
  margin-top: 10px;
  overflow-x: auto;
  /* aba da pasta desenhada em top:-6 não pode ser cortada pelo overflow */
  padding: 8px 0 4px;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.row::-webkit-scrollbar { display: none; }
.folder { flex-shrink: 0; }
```

**`SubjectFolderGrid.jsx`**
- Trocar o `style` inline do contêiner (`flexWrap: "wrap"`) pela classe `styles.row`.
- Importar `BookA` do `lucide-react` e registrá-lo no mapa `ICONS` (junto com `Atom` e `Code2`, que já estão importados mas ainda sem uso — passam a ser usados agora).
- Manter os estilos por matéria vindos de `SUBJECT_META` (nada hardcoded).

Atenção: o `overflow-x: auto` corta o "pé da aba" (`span` em `top: -6`). O `padding-top: 8px` no `.row` resolve — verificar visualmente.

---

## Etapa 3 — Conteúdos novos no `sampleContent.js`

Adicionar `photo` aos itens que possuem imagem real e criar dois itens novos seguindo **exatamente** a forma dos existentes (`id`, `subject`, `subjectIcon`, `subjectColor`, `subjectBg`, `topic`, `concept`, `time`, `summary`, `concepts[]`, `keywords[]`, `flashcards[]`, `questions[]`, `quiz[]`, `reviewSchedule`).

```js
import exemploFoto1 from "../assets/exemplo-foto1.png";
import exemploFisica from "../assets/exemplo2_fisica.jpg";
import exemploPortugues from "../assets/exemplo3_portugues.jpg";
```

- **s1 Matemática** — acrescentar `photo: exemploFoto1`.
- **s4 Física** — `subjectIcon: "⚛️"`, `subjectColor: "#7C3AED"`, `subjectBg: "#EDE9FE"`, `topic: "Eletrodinâmica"`, `concept: "Leis de Ohm"`, `photo: exemploFisica`, `time: "Há 1 dia"`.
  Conteúdo fiel ao mapa mental: 1ª Lei (`U = R · i`), 2ª Lei (`R = ρ · L / A`), resistividade, triângulo U/R/i, unidade SI ohm (Ω = V/A), tabela de resistividade (cobre `1,7×10⁻⁸`, alumínio `2,8×10⁻⁸`, ferro `1,0×10⁻⁷`, níquel-cromo `1,1×10⁻⁶` Ω·m).
  Mínimo: **5 flashcards, 3 questões, 4 itens de quiz** (mistura `mc` e `vf`).
- **s5 Português** — `subjectIcon: "📖"`, `subjectColor: "#DB2777"`, `subjectBg: "#FDF2F8"`, `topic: "Interpretação de Texto"`, `concept: "Absolutismo"`, `photo: exemploPortugues`, `time: "Há 3 dias"`.
  Conteúdo fiel à lousa: formação dos Estados modernos a partir do século XI, apoio da burguesia à centralização, interesse em moeda única e sistema de pesos e medidas, o rei como figura central, consolidação do poder no início da Idade Moderna.
  Mesmo mínimo de flashcards/questões/quiz.

`reviewSchedule` usa o helper existente `buildReviewSchedule(Date.now() - N * DAY_MS)` com alguns estágios `done: true`, igual aos itens atuais — assim os novos itens aparecem no fluxo de Revisões com estados diferentes entre si.

**Rodízio (3 opções, apenas itens com foto):**

```js
export const CAPTURE_POOL = SAMPLE_ITEMS.filter(i => i.photo);
let captureIndex = 0;
export function peekCaptureTemplate() {
  return CAPTURE_POOL[captureIndex % CAPTURE_POOL.length];
}
export function nextCaptureTemplate() {
  const template = peekCaptureTemplate();
  captureIndex += 1;
  return template;
}
```

`nextCaptureTemplate` mantém a assinatura atual — `App.jsx` continua funcionando. `peekCaptureTemplate` existe só para o viewfinder mostrar o que será capturado, sem avançar o índice.

⚠️ `getStoredItems()` (`src/services/storage.js`) deduplica por `concept`. Os `concept` novos ("Leis de Ohm", "Absolutismo") são únicos — nenhuma alteração necessária ali.

---

## Etapa 4 — Foto real no card de conteúdo capturado

**`src/components/brand/CapturedPageVisual.jsx`**

Mesma assinatura (`{ item, height = 140 }`) e mesmo invólucro (borda arredondada, sombra tingida com `item.subjectColor`, vinheta e cantos de enquadramento já existentes — reaproveitar `CORNER_STYLES` e a vinheta).

Regra única, aplicada a **todos** os itens (não só aos do rodízio de captura):

- **Com `item.photo`** (Matemática, Física, Português): trocar o miolo (a "folha" mockada com `LINE_WIDTHS`) por
  `<img src={item.photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />`,
  mantendo vinheta + cantos por cima. Vale em qualquer lugar que renderize `CapturedPageVisual` — tela de Resumo hoje, e qualquer uso futuro.
- **Sem `photo`** (itens sintéticos: História e Química): comportamento atual intacto, seguem com o mockup.

Ou seja, foto real é decidida pelo dado (`item.photo`), não pela tela — basta acrescentar `photo` a um item para ele passar a exibir a imagem real.

---

## Etapa 5 — Viewfinder da câmera acompanha a próxima captura

**`src/screens/CameraScreen.jsx`**
- Aceitar nova prop opcional `previewPhoto`; usar `backgroundImage: url(${previewPhoto ?? exemploFoto1})` no viewfinder. Fallback preserva o comportamento atual.

**`src/App.jsx`**
- Importar `peekCaptureTemplate` junto de `nextCaptureTemplate`.
- `<CameraScreen previewPhoto={peekCaptureTemplate().photo} ... />`.

Como `App` re-renderiza ao voltar para a tela `camera` (o `key={screen}` do `AnimatePresence` remonta a árvore), o viewfinder já exibe a próxima foto do rodízio a cada retorno.

---

## Etapa 6 — Verificação

1. `npm run build` — sem erros e sem regressão relevante de bundle (baseline atual ≈ 358 kB). As 2 imagens novas entram como assets; conferir o tamanho gerado.
2. `npm run dev` e percorrer no navegador:
   - **Rodízio**: capturar 4 vezes seguidas → viewfinder e resumo devem mostrar Matemática → Física → Português → Matemática, cada um com a foto correta.
   - **Fluxo completo** em Física e Português: Resumo → Salvar → Biblioteca → abrir item → Flashcards, Questões, Quiz, exportação (modal) e planejamento, sem tela vazia nem erro no console.
   - **Biblioteca**: 6 pastas (Todos, Matemática, História, Química, Física, Português) em **uma única linha rolável**; arrastar/rolar lateralmente alcança Português; filtrar por Física e por Português retorna só os itens da matéria; a aba superior da pasta não fica cortada.
   - **Busca**: digitar "ohm" e "absolutismo" encontra os itens novos.
   - **Revisões**: os itens novos aparecem com estágios diferentes; concluir uma revisão persiste.
   - `localStorage.clear()` e repetir a captura para confirmar o estado limpo.
3. Console do navegador sem erros/avisos novos.

---

## Commits (conventional commits, em português)

1. `feat(materias): adiciona metadados de Português e libera Física nos filtros`
2. `feat(biblioteca): torna a lista de pastas de matéria rolável na horizontal`
3. `feat(conteudo): adiciona exemplos de Física (Leis de Ohm) e Português (Absolutismo)`
4. `feat(captura): exibe a foto real do conteúdo no viewfinder e no resumo`

---

## Restrições

- Reaproveitar o que já existe: `SUBJECT_META`, `SubjectFolderGrid`, `CapturedPageVisual`, `ContentCard`, `buildReviewSchedule`, `saveItem`, `ExportSection`, `Modal`, `Button`.
- Nenhum novo componente além do `SubjectFolderGrid.module.css`.
- Nada de cor hardcoded em tela: cores de matéria só via `SUBJECT_META` / campos do item.
- Não mexer no escopo do Vision+, exportação ou calendário.
