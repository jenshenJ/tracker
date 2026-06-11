import { useState } from "react";
import { Dumbbell, Footprints, Play, Plus, Trash2 } from "lucide-react";
import type { DayLog, Profile, Totals, Weights } from "../../types";
import { ACT_TYPES, CARB_TARGET, FAT_TARGET, SCHED_LABEL } from "../../constants";
import { dayOfWeek } from "../../lib/date";
import { goalLineAt, lastKnownWeight } from "../../lib/stats";
import { nextId } from "../../lib/id";
import { Bar } from "../Bar";

interface Props {
  profile: Profile;
  totals: Totals;
  day: DayLog;
  saveDay: (d: DayLog) => void;
  weights: Weights;
  saveWeights: (w: Weights) => void;
  date: string;
  goToFood: () => void;
  goToGym: () => void;
}

export function TodayTab({ profile, totals, day, saveDay, weights, saveWeights, date, goToFood, goToGym }: Props) {
  /* значение поля выводится из weights[date]; ручной ввод хранится с привязкой к дате */
  const [wEdit, setWEdit] = useState<{ date: string; value: string } | null>(null);
  const w = wEdit?.date === date ? wEdit.value : String(weights[date] ?? "");
  const [actType, setActType] = useState<string>("gym");
  const [actMin, setActMin] = useState("");

  const left = Math.round(profile.kcalTarget - totals.kcal);
  const goalToday = goalLineAt(profile, date);
  const lastW = weights[date] ?? lastKnownWeight(weights);
  const plannedWorkout = profile.schedule[dayOfWeek(date)];

  const addAct = () => {
    const min = parseInt(actMin);
    if (!min) return;
    const t = ACT_TYPES.find((a) => a.id === actType);
    if (!t) return;
    saveDay({ ...day, acts: [...day.acts, { id: nextId(), type: t.label, min }] });
    setActMin("");
  };

  const saveWeight = () => {
    const v = parseFloat(w.replace(",", "."));
    if (v > 40 && v < 250) saveWeights({ ...weights, [date]: v });
  };

  const macros: Array<[string, number, number]> = [
    ["Белки", totals.p, profile.proteinTarget],
    ["Жиры", totals.f, FAT_TARGET],
    ["Углеводы", totals.c, CARB_TARGET],
  ];

  return (
    <div className="space-y-10">
      {/* hero: калории */}
      <section>
        <div className="eyebrow">Калории</div>
        <div className="disp text-6xl font-semibold leading-none mt-3">
          {Math.round(totals.kcal)}
          <span className="text-dim text-2xl font-medium"> / {profile.kcalTarget}</span>
        </div>
        <div className={`text-sm mt-2 font-medium ${left < 0 ? "text-danger" : "text-accent"}`}>
          {left >= 0 ? `осталось ${left} ккал` : `перебор ${-left} ккал`}
        </div>
        <div className="mt-5">
          <Bar value={totals.kcal} max={profile.kcalTarget} />
        </div>

        <ul className="mt-6">
          {macros.map(([n, v, m]) => (
            <li key={n} className="border-b border-line py-3 first:border-t">
              <div className="flex justify-between items-baseline">
                <span className="text-sm text-muted">{n}</span>
                <span className="disp text-base font-medium">
                  {Math.round(v)}
                  <span className="text-dim"> / {m} г</span>
                </span>
              </div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-dim mt-3">
          Белок — вторая цель дня: {Math.max(0, Math.round(profile.proteinTarget - totals.p))} г осталось
        </p>

        <button
          onClick={goToFood}
          className="mt-6 w-full bg-accent hover:bg-accent-soft active:scale-[0.98] transition-all duration-150 text-accent-ink font-semibold rounded-full py-3.5 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-5 h-5" /> Добавить еду
        </button>
      </section>

      {/* вес */}
      <section>
        <div className="flex items-baseline justify-between">
          <div className="eyebrow">Вес утром</div>
          <span className="text-xs text-dim">план ≈ {goalToday.toFixed(1)} кг</span>
        </div>
        <div className="mt-4 flex items-end gap-2 border-b border-line focus-within:border-accent transition-colors">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder={lastW ? String(lastW) : "114.0"}
            value={w}
            onChange={(e) => setWEdit({ date, value: e.target.value })}
            className="flex-1 min-w-0 bg-transparent px-1 py-2 disp text-3xl font-medium outline-none"
            aria-label="Вес в килограммах"
          />
          <span className="text-dim text-sm pb-2.5">кг</span>
        </div>
        <button
          onClick={saveWeight}
          className="mt-4 w-full bg-raised hover:bg-raised-hover active:scale-[0.98] transition-all duration-150 text-fg font-medium rounded-full py-3 text-sm cursor-pointer"
        >
          Записать вес
        </button>
        {weights[date] && (
          <p className="text-sm mt-3 text-body">
            {weights[date]} кг{" "}
            {weights[date] <= goalToday ? (
              <span className="text-accent">— идёте с опережением</span>
            ) : (
              <span className="text-muted">— чуть выше плана, смотрим на среднее за неделю</span>
            )}
          </p>
        )}
      </section>

      {/* активность */}
      <section>
        <div className="flex items-baseline justify-between">
          <div className="eyebrow">Активность</div>
          {plannedWorkout && <span className="text-xs text-accent">по плану: {SCHED_LABEL[plannedWorkout]}</span>}
        </div>
        {plannedWorkout === "gym" && (
          <button
            onClick={goToGym}
            className="mt-4 w-full bg-fg hover:bg-body active:scale-[0.98] transition-all duration-150 text-canvas font-semibold rounded-full py-3 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4" /> Начать тренировку
          </button>
        )}
        <div className="flex gap-2 mt-4">
          <select
            value={actType}
            onChange={(e) => setActType(e.target.value)}
            className="bg-surface rounded-full px-4 py-2.5 text-sm flex-1 min-w-0"
            aria-label="Тип активности"
          >
            {ACT_TYPES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            inputMode="numeric"
            placeholder="мин"
            value={actMin}
            onChange={(e) => setActMin(e.target.value)}
            className="w-20 shrink-0 bg-surface rounded-full px-4 py-2.5 text-sm"
            aria-label="Минуты"
          />
          <button
            onClick={addAct}
            className="bg-raised hover:bg-raised-hover transition-colors duration-150 rounded-full w-11 h-11 flex items-center justify-center cursor-pointer"
            aria-label="Добавить активность"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        {day.acts.length > 0 && (
          <ul className="mt-4">
            {day.acts.map((a) => (
              <li key={a.id} className="flex items-center justify-between border-b border-line py-2.5 text-sm first:border-t">
                <span className="flex items-center gap-2.5">
                  {a.type === "Ходьба" ? (
                    <Footprints className="w-4 h-4 text-accent" strokeWidth={1.6} />
                  ) : (
                    <Dumbbell className="w-4 h-4 text-accent" strokeWidth={1.6} />
                  )}
                  {a.type} · {a.min} мин
                </span>
                <button
                  onClick={() => saveDay({ ...day, acts: day.acts.filter((x) => x.id !== a.id) })}
                  className="text-dim hover:text-danger cursor-pointer p-2"
                  aria-label="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-dim mt-3">
          Дефицит уже заложен в {profile.kcalTarget} ккал — еду за тренировки не «отрабатываем» и не доедаем.
        </p>
      </section>
    </div>
  );
}
