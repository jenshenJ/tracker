/** Клиент serverless-прокси /api/ai (ключ Anthropic живёт на сервере). */

export class AiError extends Error {}

export async function askAi(prompt: string, maxTokens = 1000): Promise<string> {
  let res: Response;
  try {
    res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, maxTokens }),
    });
  } catch {
    throw new AiError("Нет соединения с сервером. AI-функции работают только онлайн.");
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new AiError(body?.error ?? `Ошибка сервера (${res.status}). Попробуйте ещё раз.`);
  }
  const { text } = (await res.json()) as { text: string };
  return text;
}

/** Достаёт JSON-массив из ответа модели (срезает ```json-обёртки). */
export function parseJsonArray<T>(text: string): T[] {
  const clean = text.replace(/```json|```/g, "").trim();
  const arr = JSON.parse(clean) as unknown;
  if (!Array.isArray(arr) || arr.length === 0) throw new AiError("Пустой ответ");
  return arr as T[];
}
