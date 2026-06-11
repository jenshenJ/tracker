import { useState } from "react";
import { Dumbbell, Footprints, Plus, Trash2 } from "lucide-react";
import type { DayLog, Profile, Totals, Weights } from "../../types";
import { ACT_TYPES, CARB_TARGET, FAT_TARGET, SCHED_LABEL } from "../../constants";
import { dayOfWeek } from "../../lib/date";
import { nextId } from "../../lib/id";
import { goalLineAt, lastKnownWeight } from "../../lib/stats";
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
}

export function TodayTab({ profile, totals, day, saveDay, weights, saveWeights, date, goToFood }: Props) {
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

  return (
    <div className="space-y-4">
      {/* калории */}
      <section className="bg-surface rounded-2xl p-4 border border-line">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-muted text-sm font-medium">Калории</span>
          <span className="disp text-2xl font-bold">
            <span className="glow-primary">{Math.round(totals.kcal)}</span>{" "}
            <span className="text-muted text-base font-medium">/ {profile.kcalTarget}</span>
          </span>
        </div>
        <Bar value={totals.kcal} max={profile.kcalTarget} color="bg-orange-500" />
        <div className={`text-sm mt-2 font-medium ${left < 0 ? "text-red-400" : "text-body"}`}>
          {left >= 0 ? `Осталось ${left} ккал` : `Перебор ${-left} ккал`}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          {(
            [
              ["Белки", totals.p, profile.proteinTarget],
              ["Жиры", totals.f, FAT_TARGET],
              ["Углеводы", totals.c, CARB_TARGET],
            ] as Array<[string, number, number]>
          ).map(([n, v, m]) => (
            <div key={n} className="bg-canvas rounded-xl py-2">
              <div className="text-xs text-muted">{n}</div>
              <div className="disp text-lg font-semibold">
                {Math.round(v)}
                <span className="text-dim text-sm"> / {m}г</span>
              </div>
            </div>
          ))}
        </div>
        <Bar value={totals.p} max={profile.proteinTarget} color="bg-green-500" />
        <div className="text-xs text-muted mt-1">
          Белок — вторая цель дня: {Math.max(0, Math.round(profile.proteinTarget - totals.p))} г осталось
        </div>
        <button
          onClick={goToFood}
          className="mt-3 w-full bg-orange-500 hover:bg-orange-400 active:scale-[0.98] transition-all duration-150 text-gray-900 font-semibold rounded-xl py-3 flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-5 h-5" /> Добавить еду
        </button>
      </section>

      {/* вес */}
      <section className="bg-surface rounded-2xl p-4 border border-line">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted text-sm font-medium">Вес утром</span>
          <span className="text-xs text-dim">план на сегодня ≈ {goalToday.toFixed(1)} кг</span>
        </div>
        <div className="flex gap-2">
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            placeholder={lastW ? String(lastW) : "114.0"}
            value={w}
            onChange={(e) => setWEdit({ date, value: e.target.value })}
            className="flex-1 bg-canvas border border-line rounded-xl px-3 py-3 text-lg disp font-semibold"
            aria-label="Вес в килограммах"
          />
          <button
            onClick={saveWeight}
            className="bg-green-500 hover:bg-green-400 active:scale-[0.98] transition-all duration-150 text-gray-900 font-semibold rounded-xl px-5 cursor-pointer"
          >
            ОК
          </button>
        </div>
        {weights[date] && (
          <div className="text-sm mt-2 text-body">
            Записано: <b>{weights[date]} кг</b>{" "}
            {weights[date] <= goalToday ? (
              <span className="text-green-400">— идёте с опережением</span>
            ) : (
              <span className="text-orange-400">— чуть выше плана, без паники: смотрим на среднее за неделю</span>
            )}
          </div>
        )}
      </section>

      {/* активность */}
      <section className="bg-surface rounded-2xl p-4 border border-line">
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell className="w-4 h-4 text-orange-500" />
          <span className="text-muted text-sm font-medium">Активность</span>
          {plannedWorkout && (
            <span className="ml-auto text-xs bg-orange-500/15 text-orange-400 border border-orange-500/30 rounded-full px-2.5 py-1 font-medium">
              По плану: {SCHED_LABEL[plannedWorkout]}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <select
            value={actType}
            onChange={(e) => setActType(e.target.value)}
            className="bg-canvas border border-line rounded-xl px-3 py-3 text-sm flex-1"
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
            className="w-24 bg-canvas border border-line rounded-xl px-3 py-3 text-sm"
            aria-label="Минуты"
          />
          <button
            onClick={addAct}
            className="bg-raised hover:bg-raised-hover transition-colors duration-150 rounded-xl px-4 cursor-pointer"
            aria-label="Добавить активность"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        {day.acts.length > 0 && (
          <ul className="mt-3 space-y-2">
            {day.acts.map((a) => (
              <li key={a.id} className="flex items-center justify-between bg-canvas rounded-xl px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  {a.type === "Ходьба" ? (
                    <Footprints className="w-4 h-4 text-green-500" />
                  ) : (
                    <Dumbbell className="w-4 h-4 text-green-500" />
                  )}
                  {a.type} · {a.min} мин
                </span>
                <button
                  onClick={() => saveDay({ ...day, acts: day.acts.filter((x) => x.id !== a.id) })}
                  className="text-dim hover:text-red-400 cursor-pointer p-2"
                  aria-label="Удалить"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-dim mt-2">
          Дефицит уже заложен в {profile.kcalTarget} ккал — еду за тренировки не «отрабатываем» и не доедаем.
        </p>
      </section>
    </div>
  );
}
