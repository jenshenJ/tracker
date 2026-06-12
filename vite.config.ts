import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { MAX_PROMPT_LENGTH, MAX_TOKENS_LIMIT, aiConfigured, runAi, type AiEnv } from "./api/_core";

/**
 * Dev-аналог Vercel-функции /api/ai: тот же код провайдеров (api/_core),
 * ключи берутся из .env.local (AI_API_KEY и т.д.).
 */
function devAiProxy(env: AiEnv): Plugin {
  return {
    name: "dev-ai-proxy",
    configureServer(server) {
      server.middlewares.use("/api/ai", (req, res) => {
        res.setHeader("Content-Type", "application/json");
        if (req.method !== "POST") {
          res.statusCode = 405;
          res.end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }
        if (!aiConfigured(env)) {
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "AI не настроен: добавьте AI_API_KEY (или ANTHROPIC_API_KEY) в .env.local." }));
          return;
        }
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
          void (async () => {
            try {
              const { prompt, maxTokens } = JSON.parse(body || "{}") as { prompt?: unknown; maxTokens?: unknown };
              if (typeof prompt !== "string" || !prompt.trim() || prompt.length > MAX_PROMPT_LENGTH) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Некорректный запрос." }));
                return;
              }
              const tokens = Math.min(typeof maxTokens === "number" && maxTokens > 0 ? maxTokens : 1000, MAX_TOKENS_LIMIT);
              const text = await runAi(env, prompt, tokens);
              res.end(JSON.stringify({ text }));
            } catch (e) {
              console.error("[dev-ai-proxy]", e);
              res.statusCode = 502;
              res.end(JSON.stringify({ error: "Сервис AI временно недоступен. Попробуйте ещё раз." }));
            }
          })();
        });
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "") as AiEnv;
  return {
    plugins: [react(), tailwindcss(), devAiProxy(env)],
  };
});
