// Modo Inclusão — medição de desempenho por NECESSIDADE de acessibilidade.
// Deriva tudo de ações reais (quizAttempts / flashcardAttempts) e do rastro
// Content.learningPreferences; NÃO persiste nada (mesma postura de
// evolutionService). Prepara a evolução do briefing sem construir um dashboard
// novo — é só a camada de leitura.
//
// Conteúdo gerado com o conjunto antigo (Fase 10: simplify/focus/visual/
// stepByStep) não tem nenhuma das chaves atuais ativa, então cai no balde
// `standard` — é histórico, não é reescrito nem remapeado.

import { readDb } from "../data/storage/index.js";
import { LEARNING_PREFERENCE_KEYS, LEARNING_PREFERENCE_META } from "../constants.js";

// Acurácia combinada (quiz + flashcards) sobre um conjunto de conteúdos.
// 1 questão de quiz e 1 flashcard valem 1 tentativa cada. accuracyRate é null
// enquanto não houver nenhuma tentativa.
function accuracyFor(contentIds, db) {
  const set = contentIds instanceof Set ? contentIds : new Set(contentIds);
  const quiz = db.quizAttempts.filter((a) => set.has(a.contentId));
  const flash = db.flashcardAttempts.filter((a) => set.has(a.contentId));

  const answered = quiz.reduce((s, a) => s + (a.totalQuestions || 0), 0) + flash.length;
  const correct = quiz.reduce((s, a) => s + (a.correctAnswers || 0), 0) + flash.filter((a) => a.correct).length;

  return {
    contents: set.size,
    quizAttempts: quiz.length,
    flashcardAttempts: flash.length,
    answered,
    correct,
    accuracyRate: answered > 0 ? Math.round((correct / answered) * 100) : null,
  };
}

// Desempenho por preferência de aprendizagem:
//  - byPreference: uma linha por chave (Simplificar/Foco/Visual/Passo a passo),
//    agregando conteúdos em que aquela preferência estava ativa.
//  - adaptive vs standard: conteúdos gerados COM o Modo Inclusão
//    (learningPreferences != null e alguma ativa) vs. SEM.
// Um mesmo conteúdo pode entrar em várias linhas de byPreference (preferências
// se combinam) — os totais não somam para o geral, por design.
export function getPerformanceByPreference() {
  const db = readDb();

  const adaptiveContents = db.contents.filter(
    (c) => c.learningPreferences && LEARNING_PREFERENCE_KEYS.some((k) => c.learningPreferences[k])
  );
  const standardContents = db.contents.filter(
    (c) => !c.learningPreferences || !LEARNING_PREFERENCE_KEYS.some((k) => c.learningPreferences[k])
  );

  const byPreference = LEARNING_PREFERENCE_KEYS.map((key) => {
    const ids = adaptiveContents.filter((c) => c.learningPreferences[key]).map((c) => c.id);
    return {
      key,
      label: LEARNING_PREFERENCE_META[key].label,
      emoji: LEARNING_PREFERENCE_META[key].emoji,
      ...accuracyFor(ids, db),
    };
  });

  const adaptive = accuracyFor(adaptiveContents.map((c) => c.id), db);
  const standard = accuracyFor(standardContents.map((c) => c.id), db);

  return {
    byPreference,
    adaptive,
    standard,
    // Só há o que mostrar quando existe pelo menos uma tentativa em conteúdo
    // adaptado — antes disso a comparação não tem base real.
    hasData: adaptive.answered > 0,
  };
}
