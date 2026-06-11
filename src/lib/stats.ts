import type { Profile, Weights } from "../types";
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
