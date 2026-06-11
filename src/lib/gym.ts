import type { WorkoutLog, WorkoutSetLog } from "../types";
import { daysBetween, dayOfWeek, dstr } from "./date";
import { GYM_WEEKDAYS } from "../constants/program";

/**
 * Якорь чередования недель: понедельник 2026-06-08 — начало недели «8»
 * (второй недели цикла). От него считаем чётность для любой даты.
 */
const WEEK2_MONDAY = "2026-06-08";

/** Понедельник недели, в которую попадает дата. */
export function mondayOf(date: string): string {
  const d = new Date(date + "T12:00:00");
  const shift = (d.getDay() + 6) % 7; // пн=0 … вс=6
  d.setDate(d.getDate() - shift);
  return dstr(d);
}

/** Какая неделя цикла (1 | 2) идёт в дату. */
export function programWeek(date: string): 1 | 2 {
  const weeks = Math.round(daysBetween(WEEK2_MONDAY, mondayOf(date)) / 7);
  return ((weeks % 2) + 2) % 2 === 0 ? 2 : 1;
}

/** Тренировочный ли это день программы (пн/ср/пт). */
export const isGymDay = (date: string) => GYM_WEEKDAYS.includes(dayOfWeek(date));

/** Ближайший тренировочный день недели для даты (включая саму дату). */
export function nearestGymWeekday(date: string): number {
  const wd = dayOfWeek(date);
  for (const g of GYM_WEEKDAYS) if (g >= wd) return g;
  return GYM_WEEKDAYS[0];
}

/** Последний записанный подход по упражнению среди прошлых тренировок (для подстановки веса). */
export function lastSetFor(workouts: Record<string, WorkoutLog>, exerciseId: string, beforeDate: string): WorkoutSetLog | null {
  const dates = Object.keys(workouts)
    .filter((d) => d < beforeDate)
    .sort()
    .reverse();
  for (const d of dates) {
    const entry = workouts[d].entries.find((e) => e.exerciseId === exerciseId && e.sets.length > 0);
    if (entry) return entry.sets[entry.sets.length - 1];
  }
  return null;
}
