import type { Meal, Profile, Workout } from "../types";

export const DEFAULT_PROFILE: Profile = {
  startDate: "2026-06-11",
  startWeight: 114,
  goalWeight: 95,
  goalDate: "2026-11-03",
  kcalTarget: 2350,
  proteinTarget: 185,
  schedule: { 0: null, 1: "gym", 2: null, 3: "gym", 4: null, 5: "gym", 6: "foot" },
};

export const SCHED_LABEL: Record<Workout, string> = { gym: "Зал", foot: "Футбол" };

export const MEALS: Meal[] = ["Завтрак", "Обед", "Перекус", "Ужин"];

export const FAT_TARGET = 75;
export const CARB_TARGET = 230;
export const MIN_KCAL = 1900;
export const MAX_KCAL = 4000;
export const MIN_PROTEIN = 80;

export const ACT_TYPES = [
  { id: "gym", label: "Зал" },
  { id: "foot", label: "Футбол" },
  { id: "walk", label: "Ходьба" },
  { id: "other", label: "Другое" },
] as const;

/** Контрольные точки на пути к цели: [дата, подпись]. */
export const MILESTONES: Array<[string, string]> = [
  ["2026-07-15", "≈ 108.5 кг"],
  ["2026-08-15", "≈ 103 кг"],
  ["2026-09-30", "≈ 99 кг"],
];

export function defaultMeal(): Meal {
  const h = new Date().getHours();
  if (h < 11) return "Завтрак";
  if (h < 15) return "Обед";
  if (h < 18) return "Перекус";
  return "Ужин";
}
