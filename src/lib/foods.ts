import type { CustomFood, DayLog, FoodEntry } from "../types";
import { FOOD_DB } from "../constants/foodDb";

/** Нормализация названия для сравнения/дедупликации. */
export const normName = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/** Названия встроенной базы — чтобы не дублировать их в «своих» блюдах. */
const BUILTIN = new Set(FOOD_DB.map(([name]) => normName(name)));

/** КБЖУ на 100 г из записи дневника (по её граммовке). */
function per100(e: FoodEntry) {
  const k = 100 / e.grams;
  return { kcal: e.kcal * k, p: e.p * k, f: e.f * k, c: e.c * k };
}

/**
 * Автосохранение записанной еды в локальную базу «своих» блюд.
 * Всё, что попадает в дневник, оседает в базе и доступно в обычном поиске.
 * Встроенные продукты не дублируем. Возвращает новый список (front = свежее).
 */
export function upsertLoggedFoods(entries: FoodEntry[], current: CustomFood[]): CustomFood[] {
  let next = current;
  let changed = false;

  for (const e of entries) {
    if (!e.grams || e.grams <= 0) continue;
    const key = normName(e.name);
    if (BUILTIN.has(key)) continue; // уже есть во встроенной базе

    const v = per100(e);
    const food: CustomFood = {
      id: next.find((x) => normName(x.name) === key)?.id ?? e.id,
      name: e.name.trim(),
      kcal: Math.round(v.kcal),
      p: round1(v.p),
      f: round1(v.f),
      c: round1(v.c),
    };
    // дедуп по названию: убираем старую запись, кладём свежую в начало
    next = [food, ...next.filter((x) => normName(x.name) !== key)];
    changed = true;
  }

  return changed ? next : current;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Быстрый продукт для повторной записи: запоминаем точную граммовку и КБЖУ. */
export interface QuickFood {
  name: string;
  meal: FoodEntry["meal"];
  grams: number;
  kcal: number;
  p: number;
  f: number;
  c: number;
  count: number;
}

/** Все записи дневника, отсортированные по убыванию id (свежие первыми). */
function allEntries(days: Record<string, DayLog>): FoodEntry[] {
  const out: FoodEntry[] = [];
  for (const day of Object.values(days)) out.push(...day.foods);
  return out.sort((a, b) => b.id - a.id);
}

function toQuick(e: FoodEntry, count: number): QuickFood {
  return { name: e.name, meal: e.meal, grams: e.grams, kcal: e.kcal, p: e.p, f: e.f, c: e.c, count };
}

/** Недавно записанное: последние позиции, по одной на название. */
export function recentFoods(days: Record<string, DayLog>, limit = 8): QuickFood[] {
  const entries = allEntries(days);
  const seen = new Set<string>();
  const out: QuickFood[] = [];
  for (const e of entries) {
    const key = normName(e.name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(toQuick(e, 1));
    if (out.length >= limit) break;
  }
  return out;
}

/** Часто записываемое: по числу записей (минимум 2), свежая граммовка как образец. */
export function frequentFoods(days: Record<string, DayLog>, limit = 8): QuickFood[] {
  const entries = allEntries(days); // уже свежие первыми
  const map = new Map<string, QuickFood>();
  for (const e of entries) {
    const key = normName(e.name);
    const ex = map.get(key);
    if (ex) ex.count += 1;
    else map.set(key, toQuick(e, 1)); // первая встреча = самая свежая
  }
  return [...map.values()]
    .filter((q) => q.count >= 2)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
