import type { ActiveProgram, WorkoutLog, WorkoutProgram, WorkoutSetLog } from "../types";
import { daysBetween, dayOfWeek, dstr } from "./date";

/** Понедельник недели, в которую попадает дата. */
export function mondayOf(date: string): string {
  const d = new Date(date + "T12:00:00");
  const shift = (d.getDay() + 6) % 7; // пн=0 … вс=6
  d.setDate(d.getDate() - shift);
  return dstr(d);
}

/** Неделя цикла программы (с 1) для даты, от якоря активной программы. */
export function programWeekFor(date: string, active: ActiveProgram, weeks: number): number {
  if (weeks <= 1) return 1;
  const diff = Math.round(daysBetween(active.anchor, mondayOf(date)) / 7);
  return ((diff % weeks) + weeks) % weeks + 1;
}

/** Тренировочный ли это день для набора weekday-дней программы. */
export const isGymDay = (date: string, weekdays: number[]) => weekdays.includes(dayOfWeek(date));

/** Ближайший тренировочный день недели (включая саму дату). */
export function nearestGymWeekday(date: string, weekdays: number[]): number {
  if (!weekdays.length) return dayOfWeek(date);
  const order = (d: number) => (d + 6) % 7; // пн=0 … вс=6
  const wd = order(dayOfWeek(date));
  const sorted = [...weekdays].sort((a, b) => order(a) - order(b));
  for (const g of sorted) if (order(g) >= wd) return g;
  return sorted[0];
}

/** Тренировки строго раньше даты, по убыванию даты (для поиска прошлых результатов). */
function priorWorkouts(workouts: Record<string, WorkoutLog>, beforeDate: string): WorkoutLog[] {
  return Object.values(workouts)
    .filter((w) => w.date < beforeDate)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.startedAt ?? "").localeCompare(a.startedAt ?? ""));
}

/** Последний записанный подход по упражнению среди прошлых тренировок (для подстановки веса). */
export function lastSetFor(workouts: Record<string, WorkoutLog>, exerciseId: string, beforeDate: string): WorkoutSetLog | null {
  for (const w of priorWorkouts(workouts, beforeDate)) {
    const entry = w.entries.find((e) => e.exerciseId === exerciseId && e.sets.length > 0);
    if (entry) return entry.sets[entry.sets.length - 1];
  }
  return null;
}

/** Подходы упражнения из самой свежей прошлой тренировки (для подсказки «прошлый раз»). */
export function lastWorkoutSetsFor(
  workouts: Record<string, WorkoutLog>,
  exerciseId: string,
  beforeDate: string
): WorkoutSetLog[] | null {
  for (const w of priorWorkouts(workouts, beforeDate)) {
    const entry = w.entries.find((e) => e.exerciseId === exerciseId && e.sets.length > 0);
    if (entry) return entry.sets;
  }
  return null;
}

/** Рабочий подход прошлой тренировки — самый тяжёлый (для подстановки в поля по умолчанию). */
export function workingSetFor(
  workouts: Record<string, WorkoutLog>,
  exerciseId: string,
  beforeDate: string
): WorkoutSetLog | null {
  const sets = lastWorkoutSetsFor(workouts, exerciseId, beforeDate);
  if (!sets || sets.length === 0) return null;
  return sets.reduce((a, b) => (b.weight > a.weight ? b : a));
}

/** Человеко-читаемая длительность: 45 → "45 сек", 900 → "15 мин". */
export const fmtSeconds = (s: number) => (s < 120 ? `${s} сек` : `${Math.round(s / 60)} мин`);

/** Цель слота по времени: "30–60 сек" / "10–20 мин". */
export function timeTarget(repsMin: number, repsMax: number): string {
  if (repsMin === repsMax) return fmtSeconds(repsMin);
  if (repsMax < 120) return `${repsMin}–${repsMax} сек`;
  return `${Math.round(repsMin / 60)}–${Math.round(repsMax / 60)} мин`;
}

/** Пустая заготовка своей программы. */
export function blankProgram(): WorkoutProgram {
  return {
    id: "custom-" + Date.now(),
    name: "",
    weeks: 1,
    days: [{ week: 1, weekday: 1, slots: [] }],
  };
}
