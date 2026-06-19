import type { DayLog, Profile, Weights, WorkoutLog } from "../types";
import { addDays, daysBetween, dstr } from "./date";

/** Плановый вес на дату (линейная интерполяция от старта к цели). */
export function goalLineAt(profile: Profile, date: string): number {
  const total = daysBetween(profile.startDate, profile.goalDate);
  if (total <= 0) return profile.goalWeight;
  const passed = Math.min(Math.max(daysBetween(profile.startDate, date), 0), total);
  return profile.startWeight - (profile.startWeight - profile.goalWeight) * (passed / total);
}

/** Средний вес за `days` дней, заканчивая `endDate` включительно. */
export function weeklyAvg(weights: Weights, endDate: string, days = 7): number | null {
  const vals: number[] = [];
  const end = new Date(endDate + "T12:00:00");
  for (let i = 0; i < days; i++) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    const v = weights[dstr(d)];
    if (v) vals.push(v);
  }
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

/** Последний записанный вес (по дате). */
export function lastKnownWeight(weights: Weights): number | null {
  const keys = Object.keys(weights).sort();
  return keys.length ? weights[keys[keys.length - 1]] : null;
}

/**
 * Серия: сколько дней подряд записана еда. Если сегодня ещё пусто,
 * серия не сгорает — считается до вчера.
 */
export function foodStreak(days: Record<string, DayLog>, today: string): number {
  const logged = (d: string) => (days["day:" + d]?.foods.length ?? 0) > 0;
  let d = logged(today) ? today : addDays(today, -1);
  let n = 0;
  while (logged(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

/** Сумма калорий за день. */
export const dayKcal = (day: DayLog) => day.foods.reduce((s, f) => s + f.kcal, 0);

/** Тоннаж тренировки: Σ вес×повторы по незаписанным-как-пропуск подходам (упражнения на время = 0). */
export function workoutVolume(w: WorkoutLog): number {
  let v = 0;
  for (const e of w.entries) {
    if (e.skipped) continue;
    for (const s of e.sets) v += s.weight * s.reps;
  }
  return v;
}

/** Итог сводки за период. null там, где данных не хватает. */
export interface WeeklyReport {
  windowDays: number; // длина окна сводки, дней
  loggedDays: number; // дней с записанной едой за период
  avgKcal: number | null; // средние ккал/день по дням с записью
  kcalTarget: number;
  /** Среднее отклонение от цели в день: + перебор, − дефицит. */
  kcalDelta: number | null;
  /** Δ среднего веса за период (по 7-дневному сглаживанию): + набор, − сброс. */
  weightDelta: number | null;
  workouts: number; // тренировок за период
  volume: number; // тоннаж за период
  volumePrev: number; // тоннаж за предыдущий такой же период
}

/** Сводка за последние `windowDays` дней (включая `today`): еда, вес, зал. */
export function weeklyReport(
  days: Record<string, DayLog>,
  weights: Weights,
  workouts: Record<string, WorkoutLog>,
  profile: Profile,
  today: string,
  windowDays = 7,
): WeeklyReport {
  /* еда: окно из windowDays дат, считаем только дни с записями */
  let loggedDays = 0;
  let kcalSum = 0;
  for (let i = 0; i < windowDays; i++) {
    const d = days["day:" + addDays(today, -i)];
    if (d && d.foods.length > 0) {
      loggedDays++;
      kcalSum += dayKcal(d);
    }
  }
  const avgKcal = loggedDays ? kcalSum / loggedDays : null;

  /* вес: 7-дневное сглаживание на конце периода против такого же на начале */
  const avgNow = weeklyAvg(weights, today);
  const avgPrev = weeklyAvg(weights, addDays(today, -windowDays));
  const weightDelta = avgNow != null && avgPrev != null ? avgNow - avgPrev : null;

  /* зал: тоннаж и число сессий за текущее и предыдущее окно той же длины */
  const from = addDays(today, -(windowDays - 1)); // начало текущего окна
  const prevFrom = addDays(today, -(2 * windowDays - 1)); // начало предыдущего окна
  let cur = 0,
    prev = 0,
    sessions = 0;
  for (const w of Object.values(workouts)) {
    const vol = workoutVolume(w);
    if (w.date >= from && w.date <= today) {
      sessions++;
      cur += vol;
    } else if (w.date >= prevFrom && w.date < from) {
      prev += vol;
    }
  }

  return {
    windowDays,
    loggedDays,
    avgKcal,
    kcalTarget: profile.kcalTarget,
    kcalDelta: avgKcal != null ? avgKcal - profile.kcalTarget : null,
    weightDelta,
    workouts: sessions,
    volume: cur,
    volumePrev: prev,
  };
}

/** Контрольные точки 25/50/75/100% пути: [дата, подпись]. */
export function milestones(profile: Profile): Array<[string, string]> {
  const total = daysBetween(profile.startDate, profile.goalDate);
  if (total <= 0) return [[profile.goalDate, `${profile.goalWeight} кг — финиш`]];
  const pts: Array<[string, string]> = [0.25, 0.5, 0.75].map((f) => {
    const d = addDays(profile.startDate, Math.round(total * f));
    return [d, `≈ ${goalLineAt(profile, d).toFixed(1)} кг`];
  });
  return [...pts, [profile.goalDate, `${profile.goalWeight} кг — финиш`]];
}
