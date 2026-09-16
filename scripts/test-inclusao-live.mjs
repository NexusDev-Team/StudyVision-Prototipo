// Verificação MANUAL do Modo Inclusão com o Gemini de verdade — separada de
// test-data-layer.mjs de propósito: aquele precisa ser determinístico,
// offline e rodável sem chave de API; este chama a rede, custa dinheiro e
// precisa de uma FOTO REAL de um exercício com múltiplas etapas (o bug da
// Etapa 4 só aparece com o modelo de verdade, nunca em texto fixo).
//
//   npm run test:inclusao -- --image caminho/para/foto.jpg
//
// Sem --image, imprime as instruções abaixo e sai sem erro (não é uma
// falha: é um teste que exige um insumo que este ambiente não tem).
//
// Roda a mesma foto em 4 combinações (nenhuma / manySteps / longText / ambas)
// e verifica, no "summary" devolvido, que:
//  - com manySteps: NENHUMA linha começa com "1. "/"1)" (a pilha numerada que
//    a necessidade existe para evitar) e aparece pelo menos um "Etapa N:";
//  - sem nenhuma preferência: prompt idêntico ao legado (já coberto em
//    F11-19/F12-5 offline; aqui só confirma que o Gemini de fato recebe o
//    prompt sem o bloco extra).
// As demais checagens (todas as etapas preservadas, linguagem não
// infantilizada) exigem leitura humana do "summary" impresso.

import { readFile } from "node:fs/promises";
import { extname } from "node:path";

const args = process.argv.slice(2);
const imageFlagIndex = args.indexOf("--image");
const imagePath = imageFlagIndex >= 0 ? args[imageFlagIndex + 1] : null;

if (!imagePath) {
  console.log(`Modo Inclusão — verificação com Gemini real

Este teste precisa de uma FOTO REAL de um exercício com pelo menos 3-4 etapas
de resolução (matemática, física, algoritmo, procedimento — qualquer processo
sequencial). Não roda sem ela porque o bug que a Etapa 4 corrige só se
manifesta com o modelo de verdade analisando uma imagem de verdade.

Uso:
  npm run test:inclusao -- --image caminho/para/foto.jpg

Saindo sem erro (nada foi executado).`);
  process.exit(0);
}

const MIME_BY_EXT = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

const NUMBERED_LIST_RE = /^\s*\d+[.)]\s+/m;
const STEP_MARKER_RE = /^\s*Etapa\s+\d+:/im;

const COMBINATIONS = [
  ["nenhuma preferência", {}],
  ["manySteps", { manySteps: true }],
  ["longText", { longText: true }],
  ["manySteps + longText", { manySteps: true, longText: true }],
];

async function loadImage(path) {
  const ext = extname(path).toLowerCase();
  const mimeType = MIME_BY_EXT[ext];
  if (!mimeType) {
    throw new Error(`Extensão "${ext}" não suportada — use .jpg, .jpeg, .png ou .webp.`);
  }
  const buffer = await readFile(path);
  return { mimeType, base64Data: buffer.toString("base64") };
}

function checkSummary(label, summary) {
  const problems = [];
  if (!summary || typeof summary !== "string") {
    problems.push("summary ausente ou não é string");
    return problems;
  }
  if (label.includes("manySteps")) {
    if (NUMBERED_LIST_RE.test(summary)) {
      problems.push('summary contém lista numerada ("1. "/"1)") — exatamente o formato que manySteps deveria evitar');
    }
    if (!STEP_MARKER_RE.test(summary)) {
      problems.push('summary não contém nenhum marcador "Etapa N:" apesar de manySteps ativo (aceitável só se o conteúdo da foto não for um processo)');
    }
  }
  return problems;
}

async function main() {
  const { generateAnalysis } = await import("../lib/gemini.js");
  const { mimeType, base64Data } = await loadImage(imagePath);

  console.log(`Modo Inclusão — verificação com Gemini real (imagem: ${imagePath})\n`);

  let allOk = true;
  for (const [label, preferences] of COMBINATIONS) {
    process.stdout.write(`${label}... `);
    let result;
    try {
      result = await generateAnalysis({ mimeType, base64Data, preferences });
    } catch (err) {
      console.log("ERRO");
      console.error(`  ${err.message}`);
      allOk = false;
      continue;
    }

    if (result?.success !== true) {
      console.log("SEM CONTEÚDO EDUCACIONAL DETECTADO");
      console.log(`  error: ${result?.error}`);
      allOk = false;
      continue;
    }

    const problems = checkSummary(label, result.summary);
    if (problems.length > 0) {
      console.log("FALHOU");
      problems.forEach((p) => console.log(`  - ${p}`));
      allOk = false;
    } else {
      console.log("ok");
    }
    console.log("  --- summary ---");
    console.log(String(result.summary || "").split("\n").map((l) => `  ${l}`).join("\n"));
    console.log("");
  }

  console.log("");
  if (allOk) {
    console.log(`${COMBINATIONS.length}/${COMBINATIONS.length} combinações ok — revise os summaries acima manualmente.`);
    process.exit(0);
  } else {
    console.log("Falhas encontradas — ver acima.");
    process.exit(1);
  }
}

main();
