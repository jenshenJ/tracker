import { useState } from "react";
import { Dumbbell, Footprints } from "lucide-react";
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
    <div className="space-y-10">
      <section>
        <div className="eyebrow">Цели на день</div>
        <div className="grid grid-cols-2 gap-6 mt-4">
          <label className="block border-b border-line focus-within:border-accent transition-colors">
            <span className="text-xs text-dim">Калории</span>
            <input
              type="number"
              inputMode="numeric"
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
              className="w-full bg-transparent disp text-3xl font-medium outline-none py-1"
            />
          </label>
          <label className="block border-b border-line focus-within:border-accent transition-colors">
            <span className="text-xs text-dim">Белок, г</span>
            <input
              type="number"
              inputMode="numeric"
              value={prot}
              onChange={(e) => setProt(e.target.value)}
              className="w-full bg-transparent disp text-3xl font-medium outline-none py-1"
            />
          </label>
        </div>
        <button
          onClick={saveTargets}
          className="mt-5 w-full bg-raised hover:bg-raised-hover transition-colors duration-150 rounded-full py-3 text-sm font-medium cursor-pointer"
        >
          Сохранить цели
        </button>
        <p className="text-xs text-dim mt-3">
          Стартовый план: 2350 ккал · 185 г белка · 65–75 г жиров · ~230 г углеводов. Ниже {MIN_KCAL} ккал приложение не даст
          опуститься.
        </p>
      </section>

      <section>
        <div className="eyebrow">График тренировок</div>
        <p className="text-xs text-dim mt-2 mb-4">
          Нажимайте на день: отдых → зал → футбол. AI-повар подстраивает углеводы под этот график.
        </p>
        <div className="grid grid-cols-7 gap-2">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => {
            const v = profile.schedule[d] ?? null;
            return (
              <button
                key={d}
                onClick={() => saveProfile({ ...profile, schedule: { ...profile.schedule, [d]: nextWorkout(v) } })}
                className={`aspect-square rounded-full flex flex-col items-center justify-center gap-0.5 cursor-pointer transition-all duration-150 ${
                  v === "gym"
                    ? "bg-accent text-accent-ink"
                    : v === "foot"
                      ? "bg-fg text-canvas"
                      : "bg-surface text-dim hover:text-muted"
                }`}
                aria-label={`${RU_DAYS[d]}: ${v ? SCHED_LABEL[v] : "отдых"}`}
              >
                <span className="text-[10px] font-semibold uppercase">{RU_DAYS[d]}</span>
                {v === "gym" ? (
                  <Dumbbell className="w-3.5 h-3.5" />
                ) : v === "foot" ? (
                  <Footprints className="w-3.5 h-3.5" />
                ) : null}
              </button>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-dim">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-accent inline-block" /> зал
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-fg inline-block" /> футбол
          </span>
        </div>
      </section>

      <section>
        <div className="eyebrow">Шаблон дня</div>
        <ul className="mt-4">
          {MENU.map(([t, d]) => (
            <li key={t} className="border-b border-line py-3 first:border-t">
              <div className="disp font-medium text-sm">{t}</div>
              <div className="text-sm text-muted mt-1">{d}</div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-dim mt-3">
          Источники меняйте свободно при тех же граммовках: грудка ↔ индейка ↔ говядина ↔ рыба; гречка ↔ рис ↔ макароны ↔
          картофель. В день футбола +50 г углеводов за 2–3 часа до игры.
        </p>
      </section>

      <section>
        <div className="eyebrow">Правила</div>
        <ul className="mt-4">
          {RULES.map((r, i) => (
            <li key={i} className="flex gap-3 text-sm text-body border-b border-line py-3 first:border-t">
              <span className="disp text-dim shrink-0">{String(i + 1).padStart(2, "0")}</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      <BackupSection profile={profile} />
    </div>
  );
}
