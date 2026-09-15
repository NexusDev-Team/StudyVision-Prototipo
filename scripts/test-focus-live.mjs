// Verificação MANUAL do Modo Foco com o Gemini de verdade — separada de
// test-data-layer.mjs de propósito: aquele precisa ser determinístico,
// offline e rodável sem chave de API; este chama a rede e custa dinheiro.
//
//   npm run test:focus            (importa lib/ direto, sem precisar do vite dev)
//   npm run test:focus -- --http  (bate em http://localhost:5173/api/focus —
//                                   requer `npm run dev` rodando; valida
//                                   também o plugin do Vite de ponta a ponta)
//
// Usa um payload fixo e versionado aqui para as três durações serem
// comparáveis entre execuções, e verifica que 2 < 5 < 10 em profundidade de
// verdade — não só na intenção do prompt.

import { FOCUS_DURATIONS, FOCUS_STEP_BOUNDS, FOCUS_STEP_TYPES } from "../lib/focusPrompts.js";

const useHttp = process.argv.includes("--http");

const PAYLOAD = {
  title: "Derivadas — regra da cadeia",
  subject: "Matemática",
  topic: "Cálculo diferencial",
  summary:
    "A derivada de uma função mede sua taxa de variação instantânea. A regra da cadeia permite " +
    "derivar funções compostas: se h(x) = f(g(x)), então h'(x) = f'(g(x)) · g'(x). Ou seja, " +
    "deriva-se a função externa mantendo a interna intacta, e multiplica-se pela derivada da interna.",
  keyConcepts: ["derivada", "taxa de variação", "função composta", "regra da cadeia"],
  keywords: ["f'(x)", "g'(x)", "h(x) = f(g(x))", "limite"],
  extractedText:
    "Definição: a derivada de f no ponto x é o limite de [f(x+h) - f(x)] / h quando h tende a 0. " +
    "Regra da cadeia: (f ∘ g)'(x) = f'(g(x)) · g'(x). Exemplo do quadro: h(x) = (3x + 1)^2, " +
    "com f(u) = u^2 e g(x) = 3x + 1, logo h'(x) = 2(3x+1) · 3 = 6(3x+1).",
  difficulty: "medium",
};

async function callViaLib(durationMinutes, preferences) {
  const { generateFocusPlan } = await import("../lib/gemini.js");
  const { buildFocusPrompt } = await import("../lib/focusPrompts.js");
  const prompt = buildFocusPrompt({ durationMinutes, preferences, payload: PAYLOAD });
  return generateFocusPlan({ prompt });
}

async function callViaHttp(durationMinutes, preferences) {
  const response = await fetch("http://localhost:5173/api/focus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload: PAYLOAD, durationMinutes, preferences }),
  });
  return response.json();
}

const call = useHttp ? callViaHttp : callViaLib;

function checkPlan(durationMinutes, plan) {
  const problems = [];
  const bound = FOCUS_STEP_BOUNDS[durationMinutes];

  if (plan?.success !== true) {
    problems.push(`success !== true (${JSON.stringify(plan?.error)})`);
    return { problems, steps: [] };
  }
  if (!Array.isArray(plan.steps)) {
    problems.push("steps não é array");
    return { problems, steps: [] };
  }
  if (plan.steps.length < bound.min || plan.steps.length > bound.max) {
    problems.push(`steps.length (${plan.steps.length}) fora da faixa ${bound.min}..${bound.max}`);
  }
  plan.steps.forEach((s, i) => {
    if (!s?.title || !String(s.title).trim()) problems.push(`steps[${i}] sem title`);
    if (!s?.content || !String(s.content).trim()) problems.push(`steps[${i}] sem content`);
    if (!FOCUS_STEP_TYPES.includes(s?.type)) problems.push(`steps[${i}].type "${s?.type}" fora de FOCUS_STEP_TYPES`);
    if (s?.id) console.warn(`  aviso: steps[${i}] veio com id ("${s.id}") — normalizeFocusPlan descarta, mas o modelo não deveria mandar`);
  });

  return { problems, steps: plan.steps };
}

function summarize(durationMinutes, steps) {
  const totalChars = steps.reduce((sum, s) => sum + (s.content?.length || 0), 0);
  return { count: steps.length, totalChars };
}

async function main() {
  console.log(`Modo Foco — verificação com Gemini real (${useHttp ? "via HTTP /api/focus" : "via lib/ direto"})\n`);

  let allOk = true;
  const results = {};

  for (const duration of FOCUS_DURATIONS) {
    process.stdout.write(`Duração ${duration}min... `);
    let plan;
    try {
      plan = await call(duration, {});
    } catch (err) {
      console.log("ERRO");
      console.error(`  ${err.message}`);
      allOk = false;
      continue;
    }
    const { problems, steps } = checkPlan(duration, plan);
    if (problems.length > 0) {
      console.log("FALHOU");
      problems.forEach((p) => console.log(`  - ${p}`));
      allOk = false;
    } else {
      const summary = summarize(duration, steps);
      results[duration] = summary;
      console.log(`ok (${summary.count} etapas, ${summary.totalChars} caracteres de conteúdo)`);
    }
  }

  // Profundidade: nem contagem de etapas nem volume de texto podem decrescer
  // de 2 -> 5 -> 10, e o total de 10min deveria ser bem maior que o de 2min.
  if (results[2] && results[5] && results[10]) {
    console.log("\nComparativo de profundidade:");
    console.log(`  2min:  ${results[2].count} etapas, ${results[2].totalChars} caracteres`);
    console.log(`  5min:  ${results[5].count} etapas, ${results[5].totalChars} caracteres`);
    console.log(`  10min: ${results[10].count} etapas, ${results[10].totalChars} caracteres`);

    if (results[5].totalChars < results[2].totalChars) {
      console.log("  FALHOU: 5min tem menos conteúdo que 2min");
      allOk = false;
    }
    if (results[10].totalChars < results[5].totalChars) {
      console.log("  FALHOU: 10min tem menos conteúdo que 5min");
      allOk = false;
    }
    if (results[10].totalChars < results[2].totalChars * 2) {
      console.log(`  FALHOU: 10min (${results[10].totalChars} chars) deveria ter pelo menos 2x o conteúdo de 2min (${results[2].totalChars} chars)`);
      allOk = false;
    }
  }

  // Segunda rodada: mesmo content + mesma duração (5min), preferências
  // diferentes — inspeção humana lado a lado, sem asserção automática (a
  // integração já é validada pelos testes offline com transporte fake).
  console.log("\nModo Inclusão — 5min com preferências diferentes (inspeção manual):");
  for (const [label, preferences] of [
    ["concentration + manySteps", { concentration: true, manySteps: true }],
    ["longText", { longText: true }],
  ]) {
    process.stdout.write(`  ${label}... `);
    try {
      const plan = await call(5, preferences);
      const { problems, steps } = checkPlan(5, plan);
      if (problems.length > 0) {
        console.log("FALHOU");
        problems.forEach((p) => console.log(`    - ${p}`));
        allOk = false;
      } else {
        console.log(`ok (${steps.length} etapas)`);
        steps.forEach((s, i) => console.log(`    [${i}] (${s.type}) ${s.title}`));
      }
    } catch (err) {
      console.log("ERRO");
      console.error(`    ${err.message}`);
      allOk = false;
    }
  }

  console.log("");
  if (allOk) {
    console.log("3/3 planos válidos — profundidade crescente OK");
    process.exit(0);
  } else {
    console.log("Falhas encontradas — ver acima.");
    process.exit(1);
  }
}

main();
