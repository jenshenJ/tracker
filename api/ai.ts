import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Прокси к Anthropic Messages API.
 * Ключ берётся из env-переменной ANTHROPIC_API_KEY (Vercel → Settings → Environment Variables)
 * и никогда не попадает в браузер.
 */

const MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";
const MAX_PROMPT_LENGTH = 6000;
const MAX_TOKENS_LIMIT = 2000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "AI не настроен: добавьте ANTHROPIC_API_KEY в переменные окружения Vercel." });
  }

  const { prompt, maxTokens } = (req.body ?? {}) as { prompt?: unknown; maxTokens?: unknown };
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > MAX_PROMPT_LENGTH) {
    return res.status(400).json({ error: "Некорректный запрос." });
  }
  const tokens = Math.min(typeof maxTokens === "number" && maxTokens > 0 ? maxTokens : 1000, MAX_TOKENS_LIMIT);

  try {
    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: tokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error("Anthropic API error", upstream.status, detail);
      return res.status(502).json({ error: "Сервис AI временно недоступен. Попробуйте ещё раз." });
    }

    const data = (await upstream.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text")
      .map((b) => b.text ?? "")
      .join("\n");

    return res.status(200).json({ text });
  } catch (e) {
    console.error("AI proxy error", e);
    return res.status(502).json({ error: "Сервис AI временно недоступен. Попробуйте ещё раз." });
  }
}
