import type { VercelRequest, VercelResponse } from "@vercel/node";
import { MAX_PROMPT_LENGTH, MAX_TOKENS_LIMIT, aiConfigured, parseImage, runAi } from "./_core.js";

/**
 * Прокси к LLM. Провайдер настраивается env-переменными на Vercel:
 *
 * 1. Anthropic:            ANTHROPIC_API_KEY (+ опц. ANTHROPIC_MODEL)
 * 2. OpenAI-совместимый:   AI_API_KEY + AI_BASE_URL + AI_MODEL
 *    — Google AI Studio (бесплатно): AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
 *    — Groq (бесплатно):            AI_BASE_URL=https://api.groq.com/openai/v1
 *    — OpenRouter:                  AI_BASE_URL=https://openrouter.ai/api/v1
 *
 * Если заданы оба — приоритет у Anthropic.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  if (!aiConfigured(process.env)) {
    return res.status(500).json({ error: "AI не настроен: добавьте ANTHROPIC_API_KEY или AI_API_KEY в переменные Vercel." });
  }

  const { prompt, maxTokens, fast, image } = (req.body ?? {}) as {
    prompt?: unknown;
    maxTokens?: unknown;
    fast?: unknown;
    image?: unknown;
  };
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > MAX_PROMPT_LENGTH) {
    return res.status(400).json({ error: "Некорректный запрос." });
  }
  const tokens = Math.min(typeof maxTokens === "number" && maxTokens > 0 ? maxTokens : 1000, MAX_TOKENS_LIMIT);

  try {
    const text = await runAi(process.env, prompt, tokens, fast === true, parseImage(image) ?? undefined);
    return res.status(200).json({ text });
  } catch (e) {
    console.error("AI proxy error", e);
    return res.status(502).json({ error: "Сервис AI временно недоступен. Попробуйте ещё раз." });
  }
}
