import type { CustomFood } from "../types";
import { FOOD_DB } from "../constants/foodDb";

/** Унифицированный результат локального поиска (КБЖУ на 100 г). */
export interface FoodHit {
  id: number | null; // id своего блюда; null — встроенный продукт
  name: string;
  kcal: number;
  p: number;
  f: number;
  c: number;
  portion?: number;
  own: boolean;
  score: number;
}

/** Нормализация: нижний регистр, ё→е, только буквы/цифры, схлопнутые пробелы. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/gi, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const tokenize = (s: string): string[] => normalize(s).split(" ").filter(Boolean);

/* окончания для лёгкого стемминга — от длинных к коротким */
const SUFFIXES = [
  "ами", "ями", "ого", "его", "ыми", "ими", "ому", "ему",
  "ая", "яя", "ое", "ее", "ой", "ый", "ий", "ую", "юю", "ом", "ем", "ах", "ях", "ам", "ям", "ов", "ев", "ие", "ые",
  "а", "я", "ы", "и", "о", "е", "у", "ю", "ь", "й",
];

/** Грубый стем: срезаем самое длинное окончание, оставляя ≥3 символов. */
function stem(t: string): string {
  if (t.length < 4) return t;
  for (const suf of SUFFIXES) {
    if (t.length - suf.length >= 3 && t.endsWith(suf)) return t.slice(0, -suf.length);
  }
  return t;
}

/** Расстояние Левенштейна ≤1 (быстрая проверка опечатки). */
function within1(a: string, b: string): boolean {
  const la = a.length;
  const lb = b.length;
  if (Math.abs(la - lb) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < la && j < lb) {
    if (a[i] === b[j]) {
      i++;
      j++;
    } else {
      if (++edits > 1) return false;
      if (la > lb) i++;
      else if (lb > la) j++;
      else {
        i++;
        j++;
      }
    }
  }
  if (i < la || j < lb) edits++;
  return edits <= 1;
}

/** Совпадение одного слова запроса с одним словом названия (0..1). */
function pairScore(q: string, n: string): number {
  if (n === q) return 1;
  if (n.startsWith(q)) return 0.85;
  if (n.length >= 4 && q.startsWith(n)) return 0.7;
  const sq = stem(q);
  const sn = stem(n);
  if (sq.length >= 3 && sn.length >= 3 && (sn.startsWith(sq) || sq.startsWith(sn))) return 0.65;
  if (q.length >= 3 && n.includes(q)) return 0.55;
  if (q.length >= 4 && within1(q, n)) return 0.5;
  return 0;
}

/** Оценка названия против запроса. 0 — не подходит. */
function scoreName(queryTokens: string[], name: string): number {
  const nameTokens = tokenize(name);
  if (nameTokens.length === 0) return 0;
  let sum = 0;
  for (const q of queryTokens) {
    let best = 0;
    for (const n of nameTokens) {
      const s = pairScore(q, n);
      if (s > best) best = s;
      if (best === 1) break;
    }
    if (best === 0) return 0; // каждое слово запроса должно где-то совпасть
    sum += best;
  }
  let score = sum / queryTokens.length;
  if (nameTokens[0].startsWith(queryTokens[0])) score += 0.1; // бонус за совпадение с началом
  return score;
}

/**
 * Локальный поиск по своим блюдам + встроенной базе.
 * Нечёткое совпадение, лёгкий стемминг, ранжирование; свои блюда чуть выше.
 */
export function searchFoods(query: string, customFoods: CustomFood[], limit = 8): FoodHit[] {
  const qTokens = tokenize(query);
  if (qTokens.length === 0 || query.trim().length < 2) return [];

  const hits: FoodHit[] = [];

  for (const x of customFoods) {
    const score = scoreName(qTokens, x.name);
    if (score > 0)
      hits.push({ id: x.id, name: x.name, kcal: x.kcal, p: x.p, f: x.f, c: x.c, portion: x.portion, own: true, score: score + 0.15 });
  }
  for (const [name, kcal, p, f, c] of FOOD_DB) {
    const score = scoreName(qTokens, name);
    if (score > 0) hits.push({ id: null, name, kcal, p, f, c, portion: undefined, own: false, score });
  }

  hits.sort((a, b) => b.score - a.score || a.name.length - b.name.length);
  return hits.slice(0, limit);
}
