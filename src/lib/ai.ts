/** Клиент serverless-прокси /api/ai (ключ Anthropic живёт на сервере). */

import type { FoodSearchResult } from "../types";
import { normalize } from "./search";

export class AiError extends Error {}

/** Картинка для мультимодального запроса: base64 без data-URL-префикса. */
export interface AiImage {
  mediaType: string;
  data: string;
}

/**
 * opts.fast — быстрая модель (Haiku) для простых задач (поиск продукта).
 * opts.image — картинка для распознавания (еда по фото); идёт на основную модель.
 */
export async function askAi(
  prompt: string,
  maxTokens = 1000,
  opts?: { fast?: boolean; image?: AiImage },
): Promise<string> {
  let res: Response;
  try {
    res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, maxTokens, fast: opts?.fast === true, image: opts?.image }),
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

/* ── Кэш AI-поиска продуктов: одинаковые запросы отдаём мгновенно, без обращения к модели ── */

const FOOD_CACHE_KEY = "t95:aiFoodCache";
const FOOD_CACHE_MAX = 300;

function readFoodCache(): Record<string, FoodSearchResult[]> {
  try {
    return JSON.parse(localStorage.getItem(FOOD_CACHE_KEY) ?? "{}") as Record<string, FoodSearchResult[]>;
  } catch {
    return {};
  }
}

/** Результаты AI-поиска для запроса (нормализованного) или null. */
export function cachedFoodSearch(query: string): FoodSearchResult[] | null {
  const hit = readFoodCache()[normalize(query)];
  return hit && hit.length ? hit : null;
}

/** Сохранить результаты AI-поиска по запросу (с ограничением размера кэша). */
export function cacheFoodSearch(query: string, results: FoodSearchResult[]): void {
  if (!results.length) return;
  try {
    const cache = readFoodCache();
    cache[normalize(query)] = results;
    const keys = Object.keys(cache);
    if (keys.length > FOOD_CACHE_MAX) for (const k of keys.slice(0, keys.length - FOOD_CACHE_MAX)) delete cache[k];
    localStorage.setItem(FOOD_CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error("food cache write failed", e);
  }
}

/** Достаёт JSON-массив из ответа модели (срезает ```json-обёртки, чинит обрезанный хвост). */
export function parseJsonArray<T>(text: string): T[] {
  const clean = text.replace(/```json|```/g, "").trim();
  let arr: unknown;
  try {
    arr = JSON.parse(clean);
  } catch {
    /* ответ обрезан — пробуем спасти целые объекты до последней закрывающей скобки */
    const cut = clean.lastIndexOf("}");
    if (cut === -1) throw new AiError("Пустой ответ");
    arr = JSON.parse(clean.slice(0, cut + 1) + "]");
  }
  if (!Array.isArray(arr) || arr.length === 0) throw new AiError("Пустой ответ");
  return arr as T[];
}
