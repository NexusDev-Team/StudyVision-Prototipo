import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Serve as Serverless Functions de api/ dentro do próprio `vite dev`, já que o
// dev server não as executa nativamente. Em produção a Vercel usa os mesmos
// arquivos direto. Tabela de rotas com match EXATO (nunca startsWith) — uma
// rota nova aqui não pode afetar nenhuma outra rota existente nem cair no
// index.html por engano.
const API_ROUTES = {
  "/api/analyze": "/api/analyze.js",
  "/api/focus": "/api/focus.js",
  "/api/rephrase": "/api/rephrase.js",
  "/api/reading-help": "/api/reading-help.js",
};

function apiPlugin(env) {
  return {
    name: "study-vision-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const modulePath = API_ROUTES[req.url];
        if (!modulePath) return next();

        Object.assign(process.env, env);

        try {
          const chunks = [];
          for await (const chunk of req) chunks.push(chunk);
          const raw = Buffer.concat(chunks).toString("utf-8");
          req.body = raw ? JSON.parse(raw) : {};
        } catch {
          res.statusCode = 400;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, error: "Corpo da requisição inválido." }));
          return;
        }

        const shimRes = {
          statusCode: 200,
          status(code) { this.statusCode = code; return this; },
          json(payload) {
            res.statusCode = this.statusCode;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(payload));
          },
        };

        try {
          const mod = await server.ssrLoadModule(modulePath);
          await mod.default(req, shimRes);
        } catch (err) {
          console.error(`[dev api] erro ao executar ${modulePath}:`, err);
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ success: false, error: "Erro interno ao processar a imagem." }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), apiPlugin(env)],
    base: "./",
  };
});
