import type { ProgramDay, ProgramSlot } from "../types";

/** Каталог упражнений программы. Иконки — в components/ExerciseIcons. */
export const EXERCISES: Record<string, string> = {
  bench0: "Жим лёжа 0°",
  bench30: "Жим лёжа 30°",
  latpull: "Тяга вертикальная",
  row: "Тяга горизонтальная",
  latraise: "Отведения гантелей",
  french: "Французский жим",
  legpress: "Жим ногами с упором",
  calf: "Подъём на носки",
  legext: "Разгибания ног",
  curl: "Сгибания с супинацией",
  tripush: "Разгибания рук",
};

const s = (exerciseId: string, intensity: ProgramSlot["intensity"], sets: number, repsMin: number, repsMax: number): ProgramSlot => ({
  exerciseId,
  intensity,
  sets,
  repsMin,
  repsMax,
});

/**
 * Программа «Муж ср 3д без осевых», недели 7–8 → цикл из двух недель (1 и 2).
 * Формат подходов: sets × repsMin–repsMax (рекомендуемые повторы).
 */
export const PROGRAM: ProgramDay[] = [
  /* неделя 1 (в исходнике — «неделя 7») */
  {
    week: 1,
    weekday: 1,
    slots: [
      s("bench0", "средняя", 4, 8, 12),
      s("latpull", "средняя", 4, 8, 12),
      s("latraise", "тяжелая", 5, 12, 15),
      s("french", "тяжелая", 5, 12, 15),
      s("legpress", "тяжелая", 6, 8, 12),
      s("calf", "средняя", 3, 12, 15),
    ],
  },
  {
    week: 1,
    weekday: 3,
    slots: [
      s("legpress", "средняя", 4, 8, 10),
      s("legext", "легкая", 3, 8, 12),
      s("bench30", "средняя", 5, 8, 12),
      s("row", "тяжелая", 6, 8, 12),
      s("tripush", "легкая", 3, 8, 12),
      s("curl", "средняя", 4, 8, 12),
      s("latraise", "средняя", 4, 12, 15),
    ],
  },
  {
    week: 1,
    weekday: 5,
    slots: [
      s("bench0", "легкая", 4, 4, 5),
      s("latpull", "легкая", 4, 6, 8),
      s("latraise", "средняя", 4, 12, 15),
      s("french", "средняя", 3, 12, 15),
      s("legpress", "средняя", 4, 8, 12),
      s("calf", "тяжелая", 4, 12, 15),
    ],
  },
  /* неделя 2 (в исходнике — «неделя 8») */
  {
    week: 2,
    weekday: 1,
    slots: [
      s("bench0", "средняя", 4, 8, 10),
      s("latpull", "тяжелая", 6, 8, 12),
      s("latraise", "тяжелая", 5, 8, 12),
      s("french", "средняя", 3, 12, 15),
      s("legpress", "легкая", 3, 6, 8),
      s("calf", "легкая", 2, 12, 15),
    ],
  },
  {
    week: 2,
    weekday: 3,
    slots: [
      s("legpress", "тяжелая", 6, 12, 15),
      s("legext", "средняя", 4, 8, 12),
      s("bench30", "тяжелая", 6, 8, 12),
      s("row", "легкая", 3, 8, 12),
      s("tripush", "средняя", 4, 8, 12),
      s("curl", "средняя", 4, 8, 12),
      s("latraise", "легкая", 3, 8, 12),
    ],
  },
  {
    week: 2,
    weekday: 5,
    slots: [
      s("bench0", "легкая", 4, 8, 12),
      s("latpull", "средняя", 4, 6, 8),
      s("latraise", "тяжелая", 5, 12, 15),
      s("french", "тяжелая", 5, 12, 15),
      s("legpress", "тяжелая", 6, 8, 12),
      s("calf", "тяжелая", 4, 12, 15),
    ],
  },
];

/** Дни недели, в которые есть программа. */
export const GYM_WEEKDAYS = [1, 3, 5];

export const findProgramDay = (week: 1 | 2, weekday: number): ProgramDay | undefined =>
  PROGRAM.find((d) => d.week === week && d.weekday === weekday);
