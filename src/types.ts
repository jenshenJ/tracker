/** Тип тренировки в графике недели. */
export type Workout = "gym" | "foot";

/** График недели: 0 = вс … 6 = сб. */
export type Schedule = Record<number, Workout | null>;

export interface Profile {
  startDate: string; // YYYY-MM-DD
  startWeight: number;
  goalWeight: number;
  goalDate: string; // YYYY-MM-DD
  kcalTarget: number;
  proteinTarget: number;
  schedule: Schedule;
}

export type Meal = "Завтрак" | "Обед" | "Перекус" | "Ужин";

export interface FoodEntry {
  id: number;
  meal: Meal;
  name: string;
  grams: number;
  kcal: number;
  p: number;
  f: number;
  c: number;
}

export interface Activity {
  id: number;
  type: string;
  min: number;
}

/** Дневник одного дня. */
export interface DayLog {
  foods: FoodEntry[];
  acts: Activity[];
}

/** Вес по датам: { "2026-06-11": 114.0 }. */
export type Weights = Record<string, number>;

export interface Totals {
  kcal: number;
  p: number;
  f: number;
  c: number;
}

/** Результат AI-поиска продукта (на 100 г). */
export interface FoodSearchResult {
  name: string;
  kcal: number;
  p: number;
  f: number;
  c: number;
  portion?: number;
}

/** Идея блюда от AI-повара. */
export interface MealIdea {
  title: string;
  how: string;
  items: Array<{ name: string; grams: number; kcal: number; p: number; f: number; c: number }>;
  kcal: number;
  p: number;
  f: number;
  c: number;
}

/* ── Зал ── */

export type Intensity = "легкая" | "средняя" | "тяжелая";

/** Слот программы: упражнение + интенсивность + подходы × рекомендуемые повторы. */
export interface ProgramSlot {
  exerciseId: string;
  intensity: Intensity;
  sets: number;
  repsMin: number;
  repsMax: number;
}

/** Программный день: 1 | 2 — неделя цикла, weekday — 1=пн … 5=пт. */
export interface ProgramDay {
  week: 1 | 2;
  weekday: number;
  slots: ProgramSlot[];
}

export interface WorkoutSetLog {
  weight: number;
  reps: number;
}

export interface WorkoutExerciseLog {
  exerciseId: string;
  skipped: boolean;
  sets: WorkoutSetLog[];
}

/** Лог тренировки за дату. */
export interface WorkoutLog {
  date: string;
  week: 1 | 2;
  weekday: number;
  startedAt: string;
  finishedAt?: string;
  entries: WorkoutExerciseLog[];
}

/** Своё блюдо пользователя (КБЖУ на 100 г), хранится в базе устройства. */
export interface CustomFood {
  id: number;
  name: string;
  kcal: number;
  p: number;
  f: number;
  c: number;
}

/** Формат файла резервной копии. */
export interface BackupFile {
  app: "tracker95";
  exportedAt: string;
  profile: Profile;
  weights: Weights;
  pantry: string;
  days: Record<string, DayLog>;
  customFoods?: CustomFood[];
  workouts?: Record<string, WorkoutLog>;
}
