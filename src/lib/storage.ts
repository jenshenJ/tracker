import type { CustomFood, DayLog, Profile, Weights } from "../types";
import { DEFAULT_PROFILE } from "../constants";

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
  loadProfile(): Profile {
    const p = read<Partial<Profile>>("profile", DEFAULT_PROFILE);
    return { ...DEFAULT_PROFILE, ...p, schedule: { ...DEFAULT_PROFILE.schedule, ...(p.schedule ?? {}) } };
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
