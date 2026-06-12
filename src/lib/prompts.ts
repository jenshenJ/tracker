import type { DayLog, GoalMode, Profile, Totals } from "../types";
import { MEALS, SCHED_LABEL } from "../constants";

const GOAL_PHRASE: Record<GoalMode, string> = {
  cut: "худеет",
  recomp: "делает рекомпозицию (держит вес, меняет жир на мышцы)",
  bulk: "набирает мышечную массу",
};

/** Промпт AI-поиска продукта по свободному запросу. */
export function foodSearchPrompt(query: string): string {
  return (
    `Ты база данных продуктов питания. Запрос пользователя (на русском): "${query}".\n` +
    `Верни ТОЛЬКО валидный JSON-массив (без markdown, без пояснений) из 1-4 наиболее вероятных вариантов:\n` +
    `[{"name":"название по-русски","kcal":число ккал на 100 г,"p":белки г/100г,"f":жиры г/100г,"c":углеводы г/100г,"portion":типичная порция в граммах}]\n` +
    `Если это готовое блюдо (шаурма, борщ, пицца) — оцени средние значения. Числа реалистичные.`
  );
}

/** Анкета AI-конструктора программ. */
export interface ProgramWizardAnswers {
  goal: string; // цель тренировок
  level: string; // опыт
  daysPerWeek: number;
  equipment: string;
  restrictions: string; // ограничения, свободный текст
}

/** Промпт AI-конструктора программы тренировок. catalogList — строки "id — название". */
export function programBuilderPrompt(a: ProgramWizardAnswers, catalogList: string): string {
  return (
    `Ты тренер. Составь программу тренировок в зале.\n` +
    `Цель: ${a.goal}. Опыт: ${a.level}. Дней в неделю: ${a.daysPerWeek}. Оборудование: ${a.equipment}.` +
    (a.restrictions.trim() ? ` Ограничения: ${a.restrictions.trim()}.` : "") +
    `\nИспользуй ТОЛЬКО упражнения из каталога (указывай exerciseId точно):\n${catalogList}\n` +
    `Дни недели: 1=пн 2=вт 3=ср 4=чт 5=пт 6=сб 0=вс. Распредели тренировки равномерно. ` +
    `weeks: 1 (или 2, если есть смысл чередовать недели). 4-7 упражнений в день, intensity одно из: "легкая","средняя","тяжелая".\n` +
    `Верни ТОЛЬКО валидный JSON-объект без markdown:\n` +
    `{"name":"короткое название","weeks":1,"days":[{"week":1,"weekday":1,"slots":[{"exerciseId":"bench0","intensity":"средняя","sets":4,"repsMin":8,"repsMax":12}]}]}`
  );
}

/** Промпт AI-повара под остаток КБЖУ и график тренировок. */
export function chefPrompt(profile: Profile, day: DayLog, totals: Totals, pantry: string): string {
  const leftKcal = Math.max(0, Math.round(profile.kcalTarget - totals.kcal));
  const leftP = Math.max(0, Math.round(profile.proteinTarget - totals.p));
  const leftF = Math.max(0, Math.round(profile.fatTarget - totals.f));
  const leftC = Math.max(0, Math.round(profile.carbTarget - totals.c));
  const mealsLeft = Math.max(1, MEALS.length - new Set(day.foods.map((f) => f.meal)).size);

  const planned = profile.schedule[new Date().getDay()] ?? null;
  const done = day.acts.map((a) => a.type).join(", ");
  let trainCtx = "Сегодня день отдыха — упор на белок и овощи, углеводы умеренно.";
  if (planned === "foot" && !done.includes(SCHED_LABEL.foot))
    trainCtx =
      "Сегодня вечером ФУТБОЛ, игра ещё впереди — в ближайший приём добавь сложных углеводов (~50-80 г сверху: рис, гречка, картофель, хлеб), чтобы были силы на игру.";
  else if (planned === "foot") trainCtx = "Сегодня уже был футбол — сейчас восстановление: упор на белок, углеводы умеренные.";
  else if (planned === "gym" && !done.includes(SCHED_LABEL.gym))
    trainCtx = "Сегодня СИЛОВАЯ тренировка, ещё впереди — нужны углеводы до неё и белок после.";
  else if (planned === "gym") trainCtx = "Силовая уже была — приоритет белку для восстановления мышц.";
  if (done) trainCtx += ` Уже записанная активность: ${done}.`;

  return (
    `Ты нутрициолог-повар. Человек ${GOAL_PHRASE[profile.goal]} (${profile.startWeight}→${profile.goalWeight} кг), тренируется, считает КБЖУ.\n` +
    `Остаток на сегодня: ${leftKcal} ккал, белка минимум ${leftP} г, жиров до ${leftF} г, углеводов до ${leftC} г. ` +
    `Впереди примерно ${mealsLeft} приём(а) пищи.\n` +
    `Контекст тренировок: ${trainCtx}\n` +
    `Продукты в наличии: ${pantry}.\n` +
    `Предложи 2-3 варианта ОДНОГО приёма пищи из этих продуктов (можно соль/специи/вода), распределяя углеводы согласно контексту тренировок. ` +
    `Если остаток на день большой, целься в ${Math.min(leftKcal, Math.round(leftKcal / mealsLeft) + 100)}–${Math.min(leftKcal, Math.round(leftKcal / mealsLeft) + 250)} ккал за приём с упором на белок. ` +
    `Граммы реалистичные, КБЖУ считай честно по граммовкам.\n` +
    `Верни ТОЛЬКО валидный JSON-массив без markdown:\n` +
    `[{"title":"название блюда","how":"как приготовить, 1-2 предложения","items":[{"name":"продукт","grams":число,"kcal":ккал за эти граммы,"p":г,"f":г,"c":г}],"kcal":итого,"p":итого,"f":итого,"c":итого}]`
  );
}
