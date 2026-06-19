/** Тип тренировки в графике недели. */
export type Workout = "gym" | "foot";

/** График недели: 0 = вс … 6 = сб. */
export type Schedule = Record<number, Workout | null>;

/** Режим цели: сброс веса, рекомпозиция, набор массы. */
export type GoalMode = "cut" | "recomp" | "bulk";

export interface Profile {
  goal: GoalMode;
  startDate: string; // YYYY-MM-DD
  startWeight: number;
  goalWeight: number;
  goalDate: string; // YYYY-MM-DD
  kcalTarget: number;
  proteinTarget: number;
  fatTarget: number;
  carbTarget: number;
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

/** Вес по датам, ключ — "YYYY-MM-DD". */
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

export type MuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "legs"
  | "glutes"
  | "calves"
  | "core"
  | "cardio";

/** Как измеряется упражнение: повторы с весом или время. */
export type Measure = "reps" | "time";

/** Упражнение каталога. */
export interface Exercise {
  id: string;
  name: string;
  group: MuscleGroup;
  /** по умолчанию "reps"; для time repsMin/repsMax слота — секунды */
  measure?: Measure;
}

/** Слот программы: упражнение + интенсивность + подходы × рекомендуемые повторы. */
export interface ProgramSlot {
  exerciseId: string;
  intensity: Intensity;
  sets: number;
  repsMin: number;
  repsMax: number;
}

/** Программный день: week — неделя цикла (с 1), weekday — 0=вс … 6=сб. */
export interface ProgramDay {
  week: number;
  weekday: number;
  slots: ProgramSlot[];
}

/** Программа тренировок: цикл из 1–2 недель. */
export interface WorkoutProgram {
  id: string;
  name: string;
  description?: string;
  weeks: number;
  days: ProgramDay[];
  builtin?: boolean;
}

/** Активная программа: id + понедельник первой недели цикла (для чётности). */
export interface ActiveProgram {
  id: string;
  anchor: string; // YYYY-MM-DD, понедельник
}

export interface WorkoutSetLog {
  weight: number;
  reps: number;
  /** для упражнений по времени: длительность подхода, сек (weight/reps = 0) */
  seconds?: number;
}

export interface WorkoutExerciseLog {
  exerciseId: string;
  skipped: boolean;
  sets: WorkoutSetLog[];
}

/** Лог тренировки за дату. */
export interface WorkoutLog {
  /** Уникальный id тренировки — в один день их может быть несколько. */
  id: string;
  date: string;
  week: number;
  weekday: number;
  startedAt: string;
  finishedAt?: string;
  entries: WorkoutExerciseLog[];
  /** Слепок плана сессии (после правок перед стартом). Старые логи — без него. */
  slots?: ProgramSlot[];
  /** Начало текущего отдыха, epoch мс. Переживает переключение вкладок. */
  restStartedAt?: number;
  /** Начало текущего подхода по времени, epoch мс. */
  setStartedAt?: number;
}

/** Ингредиент составного блюда: продукт + его граммовка и КБЖУ за эти граммы. */
export interface CustomFoodItem {
  name: string;
  grams: number;
  kcal: number;
  p: number;
  f: number;
  c: number;
}

/** Своё блюдо пользователя (КБЖУ на 100 г), хранится в базе устройства. */
export interface CustomFood {
  id: number;
  name: string;
  kcal: number;
  p: number;
  f: number;
  c: number;
  /** Порция по умолчанию в граммах (для блюд из ингредиентов — суммарный вес). */
  portion?: number;
  /** Состав блюда, если оно собрано из нескольких продуктов. */
  items?: CustomFoodItem[];
}

/** Формат файла резервной копии. */
export interface BackupFile {
  app: "legko" | "tracker95";
  exportedAt: string;
  profile: Profile;
  weights: Weights;
  pantry: string;
  days: Record<string, DayLog>;
  customFoods?: CustomFood[];
  workouts?: Record<string, WorkoutLog>;
  customPrograms?: WorkoutProgram[];
  activeProgram?: ActiveProgram;
}
