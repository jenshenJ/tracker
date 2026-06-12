import type { Exercise, MuscleGroup } from "../types";

export const GROUP_LABEL: Record<MuscleGroup, string> = {
  chest: "Грудь",
  back: "Спина",
  shoulders: "Плечи",
  biceps: "Бицепс",
  triceps: "Трицепс",
  legs: "Ноги",
  glutes: "Ягодицы",
  calves: "Икры",
  core: "Пресс",
  cardio: "Кардио",
};

const e = (id: string, name: string, group: MuscleGroup): Exercise => ({ id, name, group });

/**
 * Каталог упражнений. Ид-шники первых одиннадцати исторические —
 * на них ссылаются старые логи тренировок, не менять.
 */
export const EXERCISE_CATALOG: Exercise[] = [
  /* грудь */
  e("bench0", "Жим лёжа 0°", "chest"),
  e("bench30", "Жим лёжа 30°", "chest"),
  e("benchDb", "Жим гантелей лёжа", "chest"),
  e("benchDb30", "Жим гантелей 30°", "chest"),
  e("dips", "Брусья", "chest"),
  e("pushups", "Отжимания", "chest"),
  e("flyes", "Разводка гантелей", "chest"),
  e("pecdeck", "Бабочка (пек-дек)", "chest"),
  e("cableCross", "Кроссовер", "chest"),
  /* спина */
  e("latpull", "Тяга вертикальная", "back"),
  e("row", "Тяга горизонтальная", "back"),
  e("pullups", "Подтягивания", "back"),
  e("dbRow", "Тяга гантели в наклоне", "back"),
  e("barbellRow", "Тяга штанги в наклоне", "back"),
  e("tbarRow", "Т-гриф", "back"),
  e("pullover", "Пуловер", "back"),
  e("hyper", "Гиперэкстензия", "back"),
  e("deadlift", "Становая тяга", "back"),
  /* плечи */
  e("latraise", "Отведения гантелей", "shoulders"),
  e("ohp", "Жим штанги стоя", "shoulders"),
  e("dbShoulderPress", "Жим гантелей сидя", "shoulders"),
  e("frontRaise", "Подъёмы перед собой", "shoulders"),
  e("rearDelt", "Махи в наклоне", "shoulders"),
  e("facePull", "Тяга к лицу", "shoulders"),
  e("shrugs", "Шраги", "shoulders"),
  /* бицепс */
  e("curl", "Сгибания с супинацией", "biceps"),
  e("bbCurl", "Подъём штанги на бицепс", "biceps"),
  e("hammerCurl", "Молотки", "biceps"),
  e("cableCurl", "Сгибания на блоке", "biceps"),
  e("preacherCurl", "Скамья Скотта", "biceps"),
  /* трицепс */
  e("french", "Французский жим", "triceps"),
  e("tripush", "Разгибания рук на блоке", "triceps"),
  e("overheadExt", "Разгибания из-за головы", "triceps"),
  e("closeBench", "Жим узким хватом", "triceps"),
  e("kickback", "Разгибание в наклоне", "triceps"),
  /* ноги */
  e("legpress", "Жим ногами с упором", "legs"),
  e("legext", "Разгибания ног", "legs"),
  e("squat", "Приседания со штангой", "legs"),
  e("gobletSquat", "Гоблет-присед", "legs"),
  e("hackSquat", "Гакк-присед", "legs"),
  e("lunges", "Выпады", "legs"),
  e("bulgarianSplit", "Болгарские выпады", "legs"),
  e("legCurl", "Сгибания ног", "legs"),
  e("rdl", "Румынская тяга", "legs"),
  /* ягодицы */
  e("hipThrust", "Ягодичный мост", "glutes"),
  e("abduction", "Отведение бедра", "glutes"),
  e("cableKickback", "Махи на блоке", "glutes"),
  /* икры */
  e("calf", "Подъём на носки", "calves"),
  e("seatedCalf", "Подъём на носки сидя", "calves"),
  /* пресс */
  e("plank", "Планка", "core"),
  e("crunches", "Скручивания", "core"),
  e("legRaises", "Подъёмы ног", "core"),
  e("russianTwist", "Русские скручивания", "core"),
  e("abWheel", "Ролик для пресса", "core"),
  /* кардио */
  e("treadmill", "Беговая дорожка", "cardio"),
  e("bike", "Велотренажёр", "cardio"),
  e("elliptical", "Эллипс", "cardio"),
  e("rowingMachine", "Гребной тренажёр", "cardio"),
  e("jumpRope", "Скакалка", "cardio"),
  e("stairs", "Степпер", "cardio"),
];

const byId = new Map(EXERCISE_CATALOG.map((x) => [x.id, x]));

export const exerciseById = (id: string): Exercise | undefined => byId.get(id);
export const exerciseName = (id: string): string => byId.get(id)?.name ?? id;
export const exerciseGroup = (id: string): MuscleGroup | undefined => byId.get(id)?.group;

/** Поиск id по названию (для валидации ответов AI). */
export function findExerciseByName(name: string): Exercise | undefined {
  const s = name.trim().toLowerCase();
  return EXERCISE_CATALOG.find((x) => x.name.toLowerCase() === s) ?? EXERCISE_CATALOG.find((x) => x.name.toLowerCase().includes(s));
}
