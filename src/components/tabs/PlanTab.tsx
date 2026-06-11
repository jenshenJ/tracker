import { useState } from "react";
import { ChevronRight, Dumbbell, Footprints } from "lucide-react";
import type { Profile, Workout } from "../../types";
import { MAX_KCAL, MIN_KCAL, MIN_PROTEIN, SCHED_LABEL } from "../../constants";
import { RU_DAYS } from "../../lib/date";
import { BackupSection } from "../BackupSection";

interface Props {
  profile: Profile;
  saveProfile: (p: Profile) => void;
}

const MENU: Array<[string, string]> = [
  ["Завтрак · ~550 ккал", "4 яйца + 100 г овощей в омлет, 60 г овсянки с ягодами или бананом"],
  ["Обед · ~700 ккал", "200 г куриной грудки или индейки, 80 г гречки/риса (сухой вес), салат с 1 ст. л. масла"],
  ["Перекус · ~350 ккал", "Протеин или 200 г творога 5% + фрукт (после тренировки)"],
  ["Ужин · ~650 ккал", "200 г рыбы или постной говядины, 250–300 г картофеля или 70 г риса, овощи"],
];

const RULES = [
  "Жидкие калории (сок, газировка, пиво) — ноль. Алкоголь максимум 1 раз в неделю, в пределах калорий.",
  "Один свободный приём пищи в неделю — планово, а не срывом.",
  "Силовые 3 раза в неделю: база (присед/жим ногами, тяги, жимы), 45–60 мин — чтобы худел жир, а не мышцы.",
  "Футбол 1–2 раза — это кардио. Плюс 8–10 тыс. шагов каждый день.",
  "Взвешивание каждое утро после туалета, до еды. Решения — только по среднему за неделю.",
  "Темп ниже 0.7 кг/нед две недели подряд → −150–200 ккал или +2000 шагов. Выше 1.3 кг/нед → +150 ккал.",
  "Не опускаться ниже 1900 ккал и не «отрабатывать» еду кардио.",
];

/** Цикл по клику на день недели: отдых → зал → футбол → отдых. */
const nextWorkout = (v: Workout | null): Workout | null => (v === null ? "gym" : v === "gym" ? "foot" : null);

export function PlanTab({ profile, saveProfile }: Props) {
  const [kcal, setKcal] = useState(String(profile.kcalTarget));
  const [prot, setProt] = useState(String(profile.proteinTarget));

  const saveTargets = () => {
    const k = parseInt(kcal),
      p = parseInt(prot);
    if (k >= MIN_KCAL && k < MAX_KCAL && p > MIN_PROTEIN) {
      saveProfile({ ...profile, kcalTarget: k, proteinTarget: p });
    }
  };

  return (
    <div className="space-y-4">
      <section className="bg-surface rounded-2xl p-4 border border-line">
        <span className="text-muted text-sm font-medium">Цели на день</span>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <label className="bg-canvas rounded-xl p-3 block">
            <span className="text-xs text-muted">Калории</span>
            <input
              type="number"
              inputMode="numeric"
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
              className="w-full bg-transparent disp text-2xl font-bold outline-none"
            />
          </label>
          <label className="bg-canvas rounded-xl p-3 block">
            <span className="text-xs text-muted">Белок, г</span>
            <input
              type="number"
              inputMode="numeric"
              value={prot}
              onChange={(e) => setProt(e.target.value)}
              className="w-full bg-transparent disp text-2xl font-bold outline-none"
            />
          </label>
        </div>
        <button
          onClick={saveTargets}
          className="mt-3 w-full bg-raised hover:bg-raised-hover transition-colors duration-150 rounded-xl py-2.5 font-medium cursor-pointer"
        >
          Сохранить цели
        </button>
        <p className="text-xs text-dim mt-2">
          Стартовый план: 2350 ккал · 185 г белка · 65–75 г жиров · ~230 г углеводов. Ниже {MIN_KCAL} ккал приложение не даст
          опуститься.
        </p>
      </section>

      <section className="bg-surface rounded-2xl p-4 border border-line">
        <span className="text-muted text-sm font-medium">График тренировок</span>
        <p className="text-xs text-dim mt-1 mb-2">
          Нажимайте на день: отдых → зал → футбол. AI-повар подстраивает углеводы под этот график.
        </p>
        <div className="grid grid-cols-7 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => {
            const v = profile.schedule[d] ?? null;
            return (
              <button
                key={d}
                onClick={() => saveProfile({ ...profile, schedule: { ...profile.schedule, [d]: nextWorkout(v) } })}
                className={`rounded-xl py-2 flex flex-col items-center gap-1 cursor-pointer transition-colors duration-150 border ${
                  v === "gym"
                    ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
                    : v === "foot"
                      ? "bg-green-500/15 border-green-500/40 text-green-400"
                      : "bg-canvas border-line text-dim hover:text-body"
                }`}
                aria-label={`${RU_DAYS[d]}: ${v ? SCHED_LABEL[v] : "отдых"}`}
              >
                <span className="text-xs font-semibold uppercase">{RU_DAYS[d]}</span>
                {v === "gym" ? (
                  <Dumbbell className="w-4 h-4" />
                ) : v === "foot" ? (
                  <Footprints className="w-4 h-4" />
                ) : (
                  <span className="w-4 h-4 text-base leading-4">·</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-surface rounded-2xl p-4 border border-line">
        <span className="text-muted text-sm font-medium">Шаблон дня</span>
        <ul className="mt-2 space-y-2">
          {MENU.map(([t, d]) => (
            <li key={t} className="bg-canvas rounded-xl px-3 py-2.5">
              <div className="disp font-semibold text-orange-400">{t}</div>
              <div className="text-sm text-body mt-0.5">{d}</div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-dim mt-2">
          Источники меняйте свободно при тех же граммовках: грудка ↔ индейка ↔ говядина ↔ рыба; гречка ↔ рис ↔ макароны ↔
          картофель. В день футбола +50 г углеводов за 2–3 часа до игры.
        </p>
      </section>

      <section className="bg-surface rounded-2xl p-4 border border-line">
        <span className="text-muted text-sm font-medium">Правила</span>
        <ul className="mt-2 space-y-2">
          {RULES.map((r, i) => (
            <li key={i} className="flex gap-2 text-sm text-body">
              <ChevronRight className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      <BackupSection profile={profile} />
    </div>
  );
}
