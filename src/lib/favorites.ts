import type { CustomFoodItem, FavoriteMeal, FoodEntry, Meal, Totals } from "../types";
import { nextId } from "./id";

/** Сумма КБЖУ приёма пищи по его пунктам (за их текущую граммовку). */
export function favTotals(items: CustomFoodItem[]): Totals {
  return items.reduce(
    (s, it) => ({ kcal: s.kcal + it.kcal, p: s.p + it.p, f: s.f + it.f, c: s.c + it.c }),
    { kcal: 0, p: 0, f: 0, c: 0 },
  );
}

/** Создать избранный приём пищи из записей дневника (берём состав без id/приёма каждой записи). */
export function favoriteFromEntries(name: string, meal: Meal, entries: FoodEntry[]): FavoriteMeal {
  return {
    id: nextId(),
    name: name.trim(),
    meal,
    items: entries.map((e) => ({ name: e.name, grams: e.grams, kcal: e.kcal, p: e.p, f: e.f, c: e.c })),
  };
}

/** Создать избранное из одного продукта (КБЖУ за указанную граммовку). */
export function favoriteSingle(name: string, meal: Meal, item: CustomFoodItem): FavoriteMeal {
  return { id: nextId(), name: name.trim(), meal, items: [item] };
}

/** Масштабировать пункт под новую граммовку (КБЖУ пропорционально). */
export function scaleItem(it: CustomFoodItem, grams: number): CustomFoodItem {
  if (!it.grams) return { ...it, grams };
  const k = grams / it.grams;
  return { name: it.name, grams, kcal: it.kcal * k, p: it.p * k, f: it.f * k, c: it.c * k };
}

/** Развернуть избранное в записи дневника: по записи на пункт с указанным приёмом пищи. */
export function favoriteToEntries(items: CustomFoodItem[], meal: Meal): FoodEntry[] {
  return items
    .filter((it) => it.grams > 0)
    .map((it) => ({ id: nextId(), meal, name: it.name, grams: it.grams, kcal: it.kcal, p: it.p, f: it.f, c: it.c }));
}
