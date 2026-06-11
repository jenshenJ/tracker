import { useState } from "react";
import { Dumbbell, Footprints } from "lucide-react";
import type { GoalMode, Profile, Weights, Workout } from "../../types";
import { GOAL_LABEL, MAX_KCAL, MIN_KCAL, MIN_PROTEIN, SCHED_LABEL } from "../../constants";
import { RU_DAYS, todayStr } from "../../lib/date";
import { lastKnownWeight } from "../../lib/stats";
import { recommendTargets } from "../../lib/targets";
import { BackupSection } from "../BackupSection";

interface Props {
  profile: Profile;
  saveProfile: (p: Profile) => void;
  weights: Weights;
}

const RULES = [
  "Жидкие калории (сок, газировка, пиво) — ноль. Алкоголь максимум 1 раз в неделю, в пределах калорий.",
  "Один свободный приём пищи в неделю — планово, а не срывом.",
  "Силовые 3 раза в неделю: база (присед/жим ногами, тяги, жимы), 45–60 мин.",
  "Кардио 1–2 раза в неделю плюс 8–10 тыс. шагов каждый день.",
  "Взвешивание каждое утро после туалета, до еды. Решения — только по среднему за неделю.",
  "Темп не тот две недели подряд → скорректируйте 150–200 ккал или ±2000 шагов, вкладка «Вес» подскажет.",
  "Не урезать калории резко и не «отрабатывать» еду кардио.",
];

/** Цикл по клику на день недели: отдых → зал → футбол → отдых. */
const nextWorkout = (v: Workout | null): Workout | null => (v === null ? "gym" : v === "gym" ? "foot" : null);

export function PlanTab({ profile, saveProfile, weights }: Props) {
  const [kcal, setKcal] = useState(String(profile.kcalTarget));
  const [prot, setProt] = useState(String(profile.proteinTarget));

  /* черновик цели */
  const [goal, setGoal] = useState<GoalMode>(profile.goal);
  const [startW, setStartW] = useState(String(profile.startWeight));
  const [goalW, setGoalW] = useState(String(profile.goalWeight));
  const [goalDate, setGoalDate] = useState(profile.goalDate);
  const [savedMsg, setSavedMsg] = useState(false);

  const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;
  const baseWeight = lastKnownWeight(weights) ?? (num(startW) || profile.startWeight);
  const rec = recommendTargets(baseWeight, goal);

  const goalValid =
    num(startW) > 30 && num(startW) < 300 && num(goalW) > 30 && num(goalW) < 300 && goalDate > todayStr();

  const saveGoal = () => {
    if (!goalValid) return;
    saveProfile({
      ...profile,
      goal,
      startWeight: num(startW),
      goalWeight: num(goalW),
      /* при смене стартового веса считаем, что путь начинается заново — сегодня */
      startDate: num(startW) !== profile.startWeight ? todayStr() : profile.startDate,
      goalDate,
      kcalTarget: rec.kcal,
      proteinTarget: rec.protein,
      fatTarget: rec.fat,
      carbTarget: rec.carbs,
    });
    setKcal(String(rec.kcal));
    setProt(String(rec.protein));
    setSavedMsg(true);
  };

  const saveTargets = () => {
    const k = parseInt(kcal),
      p = parseInt(prot);
    if (k >= MIN_KCAL && k < MAX_KCAL && p > MIN_PROTEIN) {
      saveProfile({ ...profile, kcalTarget: k, proteinTarget: p });
    }
  };

  return (
    <div className="space-y-10">
      {/* цель */}
      <section>
        <div className="eyebrow">Цель</div>
        <div className="flex gap-2 mt-4">
          {(Object.keys(GOAL_LABEL) as GoalMode[]).map((g) => (
            <button
              key={g}
              onClick={() => {
                setGoal(g);
                setSavedMsg(false);
              }}
              className={`flex-1 rounded-full py-2.5 text-xs font-semibold cursor-pointer transition-colors duration-150 ${
                goal === g ? "bg-accent text-accent-ink" : "bg-surface text-dim hover:text-muted"
              }`}
            >
              {GOAL_LABEL[g]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-6 mt-5">
          <label className="block border-b border-line focus-within:border-accent transition-colors">
            <span className="text-xs text-dim">Стартовый вес, кг</span>
            <input
              type="number"
              inputMode="decimal"
              value={startW}
              onChange={(e) => {
                setStartW(e.target.value);
                setSavedMsg(false);
              }}
              className="w-full min-w-0 bg-transparent disp text-3xl font-medium outline-none py-1"
            />
          </label>
          <label className="block border-b border-line focus-within:border-accent transition-colors">
            <span className="text-xs text-dim">Целевой вес, кг</span>
            <input
              type="number"
              inputMode="decimal"
              value={goalW}
              onChange={(e) => {
                setGoalW(e.target.value);
                setSavedMsg(false);
              }}
              className="w-full min-w-0 bg-transparent disp text-3xl font-medium outline-none py-1"
            />
          </label>
        </div>
        <label className="block border-b border-line focus-within:border-accent transition-colors mt-4">
          <span className="text-xs text-dim">Дата цели</span>
          <input
            type="date"
            value={goalDate}
            min={todayStr()}
            onChange={(e) => {
              setGoalDate(e.target.value);
              setSavedMsg(false);
            }}
            className="w-full bg-transparent text-base outline-none py-1.5 text-fg"
          />
        </label>
        <p className="text-xs text-muted mt-4">
          Рекомендация под «{GOAL_LABEL[goal]}» при {baseWeight.toFixed(0)} кг:{" "}
          <b className="text-fg disp">
            {rec.kcal} ккал · Б {rec.protein} · Ж {rec.fat} · У {rec.carbs}
          </b>
        </p>
        <button
          onClick={saveGoal}
          disabled={!goalValid}
          className="mt-3 w-full bg-accent hover:bg-accent-soft disabled:opacity-50 active:scale-[0.98] transition-all duration-150 text-accent-ink font-semibold rounded-full py-3 cursor-pointer"
        >
          Сохранить цель и пересчитать КБЖУ
        </button>
        {savedMsg && <p className="text-xs text-accent mt-2">Цель сохранена, КБЖУ обновлено.</p>}
      </section>

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
          Текущий план: {profile.kcalTarget} ккал · {profile.proteinTarget} г белка · {profile.fatTarget} г жиров ·{" "}
          {profile.carbTarget} г углеводов. Ниже {MIN_KCAL} ккал приложение не даст опуститься.
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
