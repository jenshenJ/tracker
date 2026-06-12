/**
 * Общая логика AI-прокси: используется и Vercel-функцией (api/ai.ts),
 * и dev-middleware Vite (vite.config.ts). Файлы с "_" Vercel не публикует как роуты.
 */

export interface AiEnv {
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  AI_API_KEY?: string;
  AI_BASE_URL?: string;
  AI_MODEL?: string;
  AI_REASONING_EFFORT?: string;
}

export const MAX_PROMPT_LENGTH = 6000;
export const MAX_TOKENS_LIMIT = 2000;

async function callAnthropic(env: AiEnv, prompt: string, maxTokens: number): Promise<string> {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514",
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

async function callOpenAiCompatible(env: AiEnv, prompt: string, maxTokens: number): Promise<string> {
  const base = (env.AI_BASE_URL ?? "https://openrouter.ai/api/v1").replace(/\/$/, "");
  const isGemini = base.includes("generativelanguage.googleapis.com");
  const body: Record<string, unknown> = {
    model: env.AI_MODEL ?? "gemini-3.5-flash",
    /* у «думающих» моделей reasoning-токены съедают max_tokens — даём запас */
    max_tokens: Math.max(maxTokens * 4, 6000),
    messages: [{ role: "user", content: prompt }],
  };
  if (isGemini) body.reasoning_effort = env.AI_REASONING_EFFORT ?? "low";

  const r = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.AI_API_KEY}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${base} ${r.status}: ${await r.text().catch(() => "")}`);
  const data = (await r.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

/** true, если хоть один провайдер настроен. */
export const aiConfigured = (env: AiEnv) => !!(env.ANTHROPIC_API_KEY || env.AI_API_KEY);

/** Прогоняет промпт через настроенный провайдер. Бросает Error при сбое. */
export async function runAi(env: AiEnv, prompt: string, maxTokens: number): Promise<string> {
  const text = env.ANTHROPIC_API_KEY
    ? await callAnthropic(env, prompt, maxTokens)
    : await callOpenAiCompatible(env, prompt, maxTokens);
  if (!text.trim()) throw new Error("empty response");
  return text;
}
