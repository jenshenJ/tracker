/**
 * Общая логика AI-прокси: используется и Vercel-функцией (api/ai.ts),
 * и dev-middleware Vite (vite.config.ts). Файлы с "_" Vercel не публикует как роуты.
 */

export interface AiEnv {
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  /** Быстрая/дешёвая модель для простых задач (поиск продукта). По умолчанию Haiku. */
  ANTHROPIC_FAST_MODEL?: string;
  AI_API_KEY?: string;
  AI_BASE_URL?: string;
  AI_MODEL?: string;
  /** Быстрая/дешёвая модель для простых задач (поиск продукта). */
  AI_FAST_MODEL?: string;
  /** Модель для запросов с картинкой (vision). */
  AI_VISION_MODEL?: string;
  AI_REASONING_EFFORT?: string;
}

export const MAX_PROMPT_LENGTH = 6000;
export const MAX_TOKENS_LIMIT = 2000;
/** Лимит на base64-картинку (~3 МБ данных) — клиент шлёт уменьшенный JPEG. */
export const MAX_IMAGE_BYTES = 3_000_000;

/** Картинка для мультимодального запроса: base64 без data-URL-префикса. */
export interface AiImage {
  mediaType: string; // image/jpeg, image/png, image/webp
  data: string; // base64
}

async function callAnthropic(env: AiEnv, prompt: string, maxTokens: number, fast: boolean, image?: AiImage): Promise<string> {
  const model = fast
    ? env.ANTHROPIC_FAST_MODEL ?? "claude-3-5-haiku-20241022"
    : env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514";
  const content = image
    ? [
        { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
        { type: "text", text: prompt },
      ]
    : prompt;
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      messages: [{ role: "user", content }],
    }),
  });
  if (!r.ok) throw new Error(`anthropic ${r.status}: ${await r.text().catch(() => "")}`);
  const data = (await r.json()) as { content?: Array<{ type: string; text?: string }> };
  return (data.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("\n");
}

async function callOpenAiCompatible(env: AiEnv, prompt: string, maxTokens: number, fast: boolean, image?: AiImage): Promise<string> {
  const base = (env.AI_BASE_URL ?? "https://openrouter.ai/api/v1").replace(/\/$/, "");
  const isGemini = base.includes("generativelanguage.googleapis.com");
  /* выбор модели: картинка → vision-модель; fast → дешёвая; иначе основная */
  const model = image
    ? env.AI_VISION_MODEL ?? env.AI_MODEL ?? "gemini-3.5-flash"
    : fast
      ? env.AI_FAST_MODEL ?? env.AI_MODEL ?? "gemini-3.5-flash"
      : env.AI_MODEL ?? "gemini-3.5-flash";
  const content = image
    ? [
        { type: "text", text: prompt },
        { type: "image_url", image_url: { url: `data:${image.mediaType};base64,${image.data}` } },
      ]
    : prompt;
  const body: Record<string, unknown> = {
    model,
    /* у «думающих» моделей (Gemini) reasoning-токены съедают бюджет — даём запас;
       для остальных (Groq и т.п.) берём запрошенный лимит, иначе упираемся в TPM */
    max_tokens: isGemini ? Math.max(maxTokens * 4, 6000) : maxTokens,
    messages: [{ role: "user", content }],
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

/** Прогоняет промпт через настроенный провайдер. fast — быстрая модель. image — мультимодальный ввод. Бросает Error при сбое. */
export async function runAi(env: AiEnv, prompt: string, maxTokens: number, fast = false, image?: AiImage): Promise<string> {
  const text = env.ANTHROPIC_API_KEY
    ? await callAnthropic(env, prompt, maxTokens, fast, image)
    : await callOpenAiCompatible(env, prompt, maxTokens, fast, image);
  if (!text.trim()) throw new Error("empty response");
  return text;
}

/** Валидация картинки из тела запроса. Возвращает AiImage или null (если картинки нет/некорректна). */
export function parseImage(raw: unknown): AiImage | null {
  if (!raw || typeof raw !== "object") return null;
  const img = raw as { mediaType?: unknown; data?: unknown };
  if (typeof img.mediaType !== "string" || typeof img.data !== "string") return null;
  if (!/^image\/(jpeg|png|webp)$/.test(img.mediaType)) return null;
  if (!img.data || img.data.length > MAX_IMAGE_BYTES) return null;
  return { mediaType: img.mediaType, data: img.data };
}
