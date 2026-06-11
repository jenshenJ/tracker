import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { GoalMode, Profile } from "../types";
import { DEFAULT_GOAL_HORIZON_DAYS, DEFAULT_SCHEDULE, GOAL_LABEL } from "../constants";
import { addDays, todayStr } from "../lib/date";
import { recommendTargets } from "../lib/targets";

interface Props {
  onComplete: (p: Profile) => void;
}

/** Первый запуск: пользователь сам задаёт цель и веса — дефолтов в приложении нет. */
export function Onboarding({ onComplete }: Props) {
  const [goal, setGoal] = useState<GoalMode>("cut");
  const [startW, setStartW] = useState("");
  const [goalW, setGoalW] = useState("");
  const [goalDate, setGoalDate] = useState(addDays(todayStr(), DEFAULT_GOAL_HORIZON_DAYS));

  const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;
  const valid = num(startW) > 30 && num(startW) < 300 && num(goalW) > 30 && num(goalW) < 300 && goalDate > todayStr();
  const rec = valid ? recommendTargets(num(startW), goal) : null;

  const start = () => {
    if (!valid || !rec) return;
    onComplete({
      goal,
      startDate: todayStr(),
      startWeight: num(startW),
      goalWeight: num(goalW),
      goalDate,
      kcalTarget: rec.kcal,
      proteinTarget: rec.protein,
      fatTarget: rec.fat,
      carbTarget: rec.carbs,
      schedule: { ...DEFAULT_SCHEDULE },
    });
  };

  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <div
        className="max-w-md mx-auto px-5"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 4rem)", paddingBottom: "3rem" }}
      >
        <div className="eyebrow">Первый запуск</div>
        <h1 className="disp text-4xl font-semibold leading-tight mt-2">Поставим цель</h1>
        <p className="text-sm text-muted mt-3">
          Под неё посчитается дневная норма калорий и белка. Всё можно поменять позже на вкладке «План».
        </p>

        <div className="flex gap-2 mt-8">
          {(Object.keys(GOAL_LABEL) as GoalMode[]).map((g) => (
            <button
              key={g}
              onClick={() => setGoal(g)}
              className={`flex-1 rounded-full py-2.5 text-xs font-semibold cursor-pointer transition-colors duration-150 ${
                goal === g ? "bg-accent text-accent-ink" : "bg-surface text-dim hover:text-muted"
              }`}
            >
              {GOAL_LABEL[g]}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-6 mt-8">
          <label className="block border-b border-line focus-within:border-accent transition-colors">
            <span className="text-xs text-dim">Вес сейчас, кг</span>
            <input
              type="number"
              inputMode="decimal"
              value={startW}
              onChange={(e) => setStartW(e.target.value)}
              className="w-full min-w-0 bg-transparent disp text-4xl font-medium outline-none py-1"
              aria-label="Текущий вес"
            />
          </label>
          <label className="block border-b border-line focus-within:border-accent transition-colors">
            <span className="text-xs text-dim">Цель, кг</span>
            <input
              type="number"
              inputMode="decimal"
              value={goalW}
              onChange={(e) => setGoalW(e.target.value)}
              className="w-full min-w-0 bg-transparent disp text-4xl font-medium outline-none py-1"
              aria-label="Целевой вес"
            />
          </label>
        </div>

        <label className="block border-b border-line focus-within:border-accent transition-colors mt-6">
          <span className="text-xs text-dim">К какой дате</span>
          <input
            type="date"
            value={goalDate}
            min={todayStr()}
            onChange={(e) => setGoalDate(e.target.value)}
            className="w-full bg-transparent text-base outline-none py-1.5 text-fg"
          />
        </label>

        {rec && (
          <p className="text-sm text-muted mt-6">
            Норма под «{GOAL_LABEL[goal]}»:{" "}
            <b className="text-fg disp">
              {rec.kcal} ккал · Б {rec.protein} · Ж {rec.fat} · У {rec.carbs}
            </b>
          </p>
        )}

        <button
          onClick={start}
          disabled={!valid}
          className="mt-8 w-full bg-accent hover:bg-accent-soft disabled:opacity-40 active:scale-[0.98] transition-all duration-150 text-accent-ink font-semibold rounded-full py-3.5 flex items-center justify-center gap-2 cursor-pointer"
        >
          Начать <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
