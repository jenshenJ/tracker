import type { CustomFood, DayLog, Profile, Weights, WorkoutLog } from "../types";
import { DEFAULT_GOAL_HORIZON_DAYS, DEFAULT_SCHEDULE } from "../constants";
import { addDays, todayStr } from "./date";
import { recommendTargets } from "./targets";

const PREFIX = "t95:";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error("storage write failed", e);
  }
}

const EMPTY_DAY: DayLog = { foods: [], acts: [] };

export const storage = {
  /** null — профиль ещё не создан (первый запуск → онбординг). */
  loadProfile(): Profile | null {
    const p = read<Partial<Profile> | null>("profile", null);
    if (!p || typeof p.startWeight !== "number" || typeof p.goalWeight !== "number") return null;
    /* back-compat: недостающие поля выводим из веса, без хардкод-значений */
    const goal = p.goal ?? "cut";
    const rec = recommendTargets(p.startWeight, goal);
    return {
      goal,
      startDate: p.startDate ?? todayStr(),
      startWeight: p.startWeight,
      goalWeight: p.goalWeight,
      goalDate: p.goalDate ?? addDays(todayStr(), DEFAULT_GOAL_HORIZON_DAYS),
      kcalTarget: p.kcalTarget ?? rec.kcal,
      proteinTarget: p.proteinTarget ?? rec.protein,
      fatTarget: p.fatTarget ?? rec.fat,
      carbTarget: p.carbTarget ?? rec.carbs,
      schedule: { ...DEFAULT_SCHEDULE, ...(p.schedule ?? {}) },
    };
  },
  saveProfile: (p: Profile) => write("profile", p),

  loadWeights: (): Weights => read<Weights>("weights", {}),
  saveWeights: (w: Weights) => write("weights", w),

  loadDay: (date: string): DayLog => read<DayLog>("day:" + date, EMPTY_DAY),
  saveDay: (date: string, day: DayLog) => write("day:" + date, day),

  loadPantry: (): string => read<string>("pantry", ""),
  savePantry: (p: string) => write("pantry", p),

  loadCustomFoods: (): CustomFood[] => read<CustomFood[]>("customFoods", []),
  saveCustomFoods: (foods: CustomFood[]) => write("customFoods", foods),

  loadWorkouts: (): Record<string, WorkoutLog> => read<Record<string, WorkoutLog>>("workouts", {}),
  saveWorkouts: (w: Record<string, WorkoutLog>) => write("workouts", w),

  /** Все сохранённые дни дневника: { "day:YYYY-MM-DD": DayLog }. */
  allDays(): Record<string, DayLog> {
    const out: Record<string, DayLog> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(PREFIX + "day:")) {
        const day = read<DayLog | null>(k.slice(PREFIX.length), null);
        if (day) out[k.slice(PREFIX.length)] = day;
      }
    }
    return out;
  },

  saveDayRaw: (key: string, day: DayLog) => write(key, day),
};
