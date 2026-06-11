import type { GoalMode, Meal, Schedule, Workout } from "../types";

/** Структурный дефолт расписания: силовые пн/ср/пт. Весов тела в коде нет — их задаёт онбординг. */
export const DEFAULT_SCHEDULE: Schedule = { 0: null, 1: "gym", 2: null, 3: "gym", 4: null, 5: "gym", 6: null };

/** Горизонт цели по умолчанию, дней (~16 недель). */
export const DEFAULT_GOAL_HORIZON_DAYS = 112;

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
