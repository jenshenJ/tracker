import type { ProgramSlot, WorkoutProgram } from "../types";

const s = (
  exerciseId: string,
  intensity: ProgramSlot["intensity"],
  sets: number,
  repsMin: number,
  repsMax: number
): ProgramSlot => ({ exerciseId, intensity, sets, repsMin, repsMax });

/** Встроенные программы. Первая — исходная «3 дня без осевых» (недели 7–8 → цикл 1–2). */
export const BUILTIN_PROGRAMS: WorkoutProgram[] = [
  {
    id: "base-3d-no-axial",
    name: "3 дня без осевых",
    description: "Сплит пн/ср/пт без осевой нагрузки, цикл из двух недель",
    weeks: 2,
    builtin: true,
    days: [
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
    ],
  },
  {
    id: "fullbody-3d",
    name: "Фулбоди 3 дня",
    description: "Всё тело за тренировку, пн/ср/пт — для новичков и возвращения после перерыва",
    weeks: 1,
    builtin: true,
    days: [
      {
        week: 1,
        weekday: 1,
        slots: [
          s("squat", "средняя", 3, 8, 10),
          s("bench0", "средняя", 3, 8, 10),
          s("row", "средняя", 3, 8, 12),
          s("dbShoulderPress", "легкая", 3, 10, 12),
          s("plank", "средняя", 3, 30, 60),
        ],
      },
      {
        week: 1,
        weekday: 3,
        slots: [
          s("legpress", "средняя", 3, 10, 12),
          s("benchDb30", "средняя", 3, 10, 12),
          s("latpull", "средняя", 3, 8, 12),
          s("curl", "легкая", 3, 10, 12),
          s("crunches", "средняя", 3, 12, 20),
        ],
      },
      {
        week: 1,
        weekday: 5,
        slots: [
          s("rdl", "средняя", 3, 8, 10),
          s("pushups", "средняя", 3, 10, 15),
          s("dbRow", "средняя", 3, 8, 12),
          s("latraise", "легкая", 3, 12, 15),
          s("legRaises", "средняя", 3, 10, 15),
        ],
      },
    ],
  },
  {
    id: "upper-lower-4d",
    name: "Верх / Низ, 4 дня",
    description: "Классический сплит пн/вт/чт/пт: два дня на верх, два на низ",
    weeks: 1,
    builtin: true,
    days: [
      {
        week: 1,
        weekday: 1,
        slots: [
          s("bench0", "тяжелая", 4, 6, 8),
          s("barbellRow", "тяжелая", 4, 6, 10),
          s("ohp", "средняя", 3, 8, 10),
          s("latpull", "средняя", 3, 8, 12),
          s("curl", "легкая", 3, 10, 12),
          s("tripush", "легкая", 3, 10, 12),
        ],
      },
      {
        week: 1,
        weekday: 2,
        slots: [
          s("squat", "тяжелая", 4, 6, 8),
          s("rdl", "средняя", 3, 8, 10),
          s("legpress", "средняя", 3, 10, 12),
          s("calf", "средняя", 4, 12, 15),
          s("plank", "средняя", 3, 30, 60),
        ],
      },
      {
        week: 1,
        weekday: 4,
        slots: [
          s("benchDb30", "средняя", 4, 8, 12),
          s("pullups", "средняя", 4, 6, 10),
          s("latraise", "средняя", 4, 12, 15),
          s("facePull", "легкая", 3, 12, 15),
          s("hammerCurl", "средняя", 3, 10, 12),
          s("french", "средняя", 3, 10, 12),
        ],
      },
      {
        week: 1,
        weekday: 5,
        slots: [
          s("legpress", "тяжелая", 4, 10, 12),
          s("legCurl", "средняя", 3, 10, 12),
          s("lunges", "средняя", 3, 10, 12),
          s("hipThrust", "средняя", 3, 10, 12),
          s("seatedCalf", "средняя", 4, 12, 15),
        ],
      },
    ],
  },
  {
    id: "ppl-3d",
    name: "Пуш · Пул · Ноги",
    description: "Жимы, тяги и ноги по отдельным дням: пн/ср/пт",
    weeks: 1,
    builtin: true,
    days: [
      {
        week: 1,
        weekday: 1,
        slots: [
          s("bench0", "тяжелая", 4, 6, 10),
          s("dbShoulderPress", "средняя", 3, 8, 12),
          s("benchDb30", "средняя", 3, 8, 12),
          s("latraise", "средняя", 4, 12, 15),
          s("french", "средняя", 3, 10, 12),
          s("tripush", "легкая", 3, 10, 15),
        ],
      },
      {
        week: 1,
        weekday: 3,
        slots: [
          s("pullups", "тяжелая", 4, 6, 10),
          s("row", "средняя", 4, 8, 12),
          s("latpull", "средняя", 3, 8, 12),
          s("facePull", "легкая", 3, 12, 15),
          s("bbCurl", "средняя", 3, 8, 12),
          s("hammerCurl", "легкая", 3, 10, 12),
        ],
      },
      {
        week: 1,
        weekday: 5,
        slots: [
          s("squat", "тяжелая", 4, 6, 10),
          s("rdl", "средняя", 3, 8, 10),
          s("legpress", "средняя", 3, 10, 12),
          s("legCurl", "легкая", 3, 10, 12),
          s("calf", "средняя", 4, 12, 15),
          s("plank", "средняя", 3, 30, 60),
        ],
      },
    ],
  },
];

export const findBuiltin = (id: string) => BUILTIN_PROGRAMS.find((p) => p.id === id);

/** Тренировочные дни недели программы (уникальные, по порядку пн→вс). */
export const programWeekdays = (p: WorkoutProgram): number[] =>
  [...new Set(p.days.map((d) => d.weekday))].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));

export const findProgramDay = (p: WorkoutProgram, week: number, weekday: number) =>
  p.days.find((d) => d.week === week && d.weekday === weekday);
