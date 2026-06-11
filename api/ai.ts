import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Прокси к LLM. Поддерживает два режима (env-переменные на Vercel):
 *
 * 1. Anthropic:            ANTHROPIC_API_KEY (+ опц. ANTHROPIC_MODEL)
 * 2. OpenAI-совместимый:   AI_API_KEY + AI_BASE_URL + AI_MODEL
 *    Примеры:
 *    — Google AI Studio (бесплатно): AI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
 *    — Groq (бесплатно):            AI_BASE_URL=https://api.groq.com/openai/v1
 *    — OpenRouter:                  AI_BASE_URL=https://openrouter.ai/api/v1
 *
 * Если заданы оба — приоритет у Anthropic.
 */

const MAX_PROMPT_LENGTH = 6000;
const MAX_TOKENS_LIMIT = 2000;

async function callAnthropic(apiKey: string, prompt: string, maxTokens: number): Promise<string> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
      max_tokens: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${await r.text().catch(() => "")}`);
  const data = (await r.json()) as { content?: Array<{ type: string; text?: string }> };
  return (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("\n");
}

async function callOpenAiCompatible(apiKey: string, prompt: string, maxTokens: number): Promise<string> {
  const base = (process.env.AI_BASE_URL ?? "https://openrouter.ai/api/v1").replace(/\/$/, "");
  const isGemini = base.includes("generativelanguage.googleapis.com");
  const body: Record<string, unknown> = {
    model: process.env.AI_MODEL ?? "gemini-3.5-flash",
    /* у «думающих» моделей reasoning-токены съедают max_tokens — даём запас */
    max_tokens: Math.max(maxTokens * 4, 6000),
    messages: [{ role: "user", content: prompt }],
  };
  /* для Gemini ограничиваем размышления, чтобы ответ не обрезался */
  if (isGemini) body.reasoning_effort = process.env.AI_REASONING_EFFORT ?? "low";

  const r = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${base} ${r.status}: ${await r.text().catch(() => "")}`);
  const data = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openAiKey = process.env.AI_API_KEY;
  if (!anthropicKey && !openAiKey) {
    return res.status(500).json({ error: "AI не настроен: добавьте ANTHROPIC_API_KEY или AI_API_KEY в переменные Vercel." });
  }

  const { prompt, maxTokens } = (req.body ?? {}) as { prompt?: unknown; maxTokens?: unknown };
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > MAX_PROMPT_LENGTH) {
    return res.status(400).json({ error: "Некорректный запрос." });
  }
  const tokens = Math.min(typeof maxTokens === "number" && maxTokens > 0 ? maxTokens : 1000, MAX_TOKENS_LIMIT);

  try {
    const text = anthropicKey
      ? await callAnthropic(anthropicKey, prompt, tokens)
      : await callOpenAiCompatible(openAiKey!, prompt, tokens);
    if (!text.trim()) throw new Error("empty response");
    return res.status(200).json({ text });
  } catch (e) {
    console.error("AI proxy error", e);
    return res.status(502).json({ error: "Сервис AI временно недоступен. Попробуйте ещё раз." });
  }
}
