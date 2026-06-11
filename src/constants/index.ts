import type { GoalMode, Meal, Profile, Workout } from "../types";

export const DEFAULT_PROFILE: Profile = {
  goal: "cut",
  startDate: "2026-06-11",
  startWeight: 114,
  goalWeight: 95,
  goalDate: "2026-11-03",
  kcalTarget: 2350,
  proteinTarget: 185,
  fatTarget: 75,
  carbTarget: 230,
  schedule: { 0: null, 1: "gym", 2: null, 3: "gym", 4: null, 5: "gym", 6: "foot" },
};

export const GOAL_LABEL: Record<GoalMode, string> = {
  cut: "Сброс",
  recomp: "Рекомпозиция",
  bulk: "Набор",
};

export const SCHED_LABEL: Record<Workout, string> = { gym: "Зал", foot: "Футбол" };

export const MEALS: Meal[] = ["Завтрак", "Обед", "Перекус", "Ужин"];

export const MIN_KCAL = 1200;
export const MAX_KCAL = 5000;
export const MIN_PROTEIN = 60;

export const ACT_TYPES = [
  { id: "gym", label: "Зал" },
  { id: "foot", label: "Футбол" },
  { id: "walk", label: "Ходьба" },
  { id: "other", label: "Другое" },
] as const;

export function defaultMeal(): Meal {
  const h = new Date().getHours();
  if (h < 11) return "Завтрак";
  if (h < 15) return "Обед";
  if (h < 18) return "Перекус";
  return "Ужин";
}
