// Prompts centralizados para o motor de inteligência do Study Vision.
// Mantidos separados de api/analyze.js para não deixar o endpoint gigante.

export const SYSTEM_INSTRUCTION = `Você é o motor de inteligência do Study Vision, um produto que transforma
a câmera do smartphone em uma ferramenta de aprendizado. Você recebe uma foto tirada por um estudante
(lousa, slide, página de livro ou exercício) e deve transformá-la em material de estudo estruturado.

Responda sempre em português do Brasil, em JSON válido, seguindo exatamente o schema fornecido.
Nunca inclua texto fora do JSON.`;

export const ANALYSIS_PROMPT = `Analise a imagem enviada e faça o seguinte, nesta ordem:

1. Identifique o que aparece na imagem.
2. Determine se existe conteúdo educacional legível (texto de aula, lousa, slide, livro, exercício, anotação de estudo).
3. Se NÃO houver conteúdo educacional legível com segurança (imagem borrada, vazia, ilegível, ou sem relação
   com estudo), retorne success=false e um campo error com uma frase curta e amigável explicando o motivo.
   Não invente conteúdo nesse caso.
4. Se houver conteúdo educacional legível, identifique a matéria (ex: Matemática, História, Química, Física,
   Português, Biologia, Geografia, Filosofia, Sociologia, Inglês, Programação — use a matéria mais específica
   e correta possível), o assunto/tópico específico, e um título curto e adequado para o conteúdo.
5. Extraia o texto relevante presente na imagem (extractedText) — não precisa ser literal palavra por palavra,
   mas deve refletir fielmente o conteúdo real capturado.
6. Escreva um resumo didático objetivo, entre 1 e 3 parágrafos, baseado exclusivamente no conteúdo da imagem.
7. Liste de 3 a 6 conceitos principais (keyConcepts) presentes no conteúdo.
8. Liste algumas palavras-chave técnicas (keywords) — termos, fórmulas ou nomes exatos que aparecem na imagem.
9. Gere aproximadamente 5 flashcards (pergunta curta + resposta objetiva) cobrindo os pontos principais.
10. Gere aproximadamente 4 questões abertas (openQuestions) para reflexão/estudo sobre o conteúdo.
11. Gere aproximadamente 5 questões de múltipla escolha (quiz), cada uma com exatamente 4 alternativas
    plausíveis, o índice (0 a 3) da alternativa correta, e uma explicação curta da resposta.
12. Classifique a dificuldade aproximada do conteúdo em "easy", "medium" ou "hard".

Regras muito importantes:
- Baseie-se exclusivamente no que está presente ou é claramente inferível da imagem.
- NUNCA invente textos, fórmulas, nomes, datas ou conceitos que não estejam relacionados ao conteúdo capturado.
- NUNCA crie questões sobre informações que não aparecem e não podem ser inferidas com segurança da imagem.
- Se houver pouco conteúdo na imagem, não force uma quantidade artificial de flashcards/questões — gere menos,
  mas nunca invente para completar.
- Se a imagem estiver ilegível ou sem conteúdo educacional, retorne apenas success=false e error, sem os
  demais campos de conteúdo.

Responda EXATAMENTE no formato JSON abaixo, com estas chaves e estes tipos — nada a mais, nada a menos
(especialmente: "openQuestions" é um array de strings simples, SEM resposta; e cada item de "quiz" usa a
chave "answer" para o índice da alternativa correta, nunca "correct"):

{
  "success": true,
  "subject": "string",
  "topic": "string",
  "title": "string",
  "extractedText": "string",
  "summary": "string",
  "keyConcepts": ["string", "..."],
  "keywords": ["string", "..."],
  "flashcards": [{ "question": "string", "answer": "string" }],
  "openQuestions": ["string", "..."],
  "quiz": [{ "question": "string", "options": ["string", "string", "string", "string"], "answer": 0, "explanation": "string" }],
  "difficulty": "easy" | "medium" | "hard"
}

Se success for false, retorne apenas { "success": false, "error": "string" }.`;

// responseSchema para a Gemini API — força saída estruturada (sem texto fora do JSON).
export const ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    success: { type: "boolean" },
    error: { type: "string" },
    subject: { type: "string" },
    topic: { type: "string" },
    title: { type: "string" },
    extractedText: { type: "string" },
    summary: { type: "string" },
    keyConcepts: { type: "array", items: { type: "string" } },
    keywords: { type: "array", items: { type: "string" } },
    flashcards: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
        },
        required: ["question", "answer"],
      },
    },
    openQuestions: { type: "array", items: { type: "string" } },
    quiz: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          options: { type: "array", items: { type: "string" } },
          answer: { type: "integer" },
          explanation: { type: "string" },
        },
        required: ["question", "options", "answer", "explanation"],
      },
    },
    difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
  },
  required: ["success"],
};
