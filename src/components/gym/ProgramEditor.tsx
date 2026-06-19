import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Search, Trash2, X } from "lucide-react";
import type { Intensity, MuscleGroup, ProgramDay, ProgramSlot, WorkoutProgram } from "../../types";
import { EXERCISE_CATALOG, GROUP_LABEL, exerciseMeasure, exerciseName } from "../../constants/exercises";
import { RU_DAYS } from "../../lib/date";
import { ExerciseIcon } from "../ExerciseIcons";

interface Props {
  initial: WorkoutProgram;
  onSave: (p: WorkoutProgram) => void;
  onCancel: () => void;
}

const INTENSITIES: Intensity[] = ["легкая", "средняя", "тяжелая"];
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Редактор программы: дни → упражнения из каталога → подходы/повторы. */
export function ProgramEditor({ initial, onSave, onCancel }: Props) {
  const [p, setP] = useState<WorkoutProgram>(() => JSON.parse(JSON.stringify(initial)) as WorkoutProgram);
  /** для какого дня открыт выбор упражнения: индекс дня или null */
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const [q, setQ] = useState("");
  const [group, setGroup] = useState<MuscleGroup | null>(null);
  /** единицы ввода временных слотов: ключ "день-слот" → сек | мин; по умолчанию от величины */
  const [units, setUnits] = useState<Record<string, "s" | "m">>({});

  const unitOf = (di: number, si: number, s: ProgramSlot): "s" | "m" =>
    units[`${di}-${si}`] ?? (s.repsMax >= 120 ? "m" : "s");
  /** значение поля в текущих единицах */
  const fromSec = (v: number, u: "s" | "m") => (u === "m" ? Math.round(v / 60) : v);
  const toSec = (v: number, u: "s" | "m") => (u === "m" ? v * 60 : v);

  const setDay = (i: number, fn: (d: ProgramDay) => ProgramDay) =>
    setP({ ...p, days: p.days.map((d, j) => (j === i ? fn(d) : d)) });

  const setSlot = (di: number, si: number, fn: (s: ProgramSlot) => ProgramSlot) =>
    setDay(di, (d) => ({ ...d, slots: d.slots.map((s, j) => (j === si ? fn(s) : s)) }));

  const moveSlot = (di: number, si: number, dir: -1 | 1) =>
    setDay(di, (d) => {
      const slots = [...d.slots];
      const to = si + dir;
      if (to < 0 || to >= slots.length) return d;
      [slots[si], slots[to]] = [slots[to], slots[si]];
      return { ...d, slots };
    });

  const addDay = () => {
    const used = new Set(p.days.filter((d) => d.week === 1).map((d) => d.weekday));
    const weekday = WEEKDAY_ORDER.find((w) => !used.has(w)) ?? 1;
    setP({ ...p, days: [...p.days, { week: 1, weekday, slots: [] }] });
  };

  const matches = EXERCISE_CATALOG.filter(
    (x) =>
      (!group || x.group === group) && (q.trim().length < 2 || x.name.toLowerCase().includes(q.trim().toLowerCase()))
  ).slice(0, 12);

  const valid = p.name.trim().length >= 2 && p.days.length > 0 && p.days.every((d) => d.slots.length > 0);
  const sortedDays = p.days
    .map((d, i) => ({ d, i }))
    .sort((a, b) => a.d.week - b.d.week || WEEKDAY_ORDER.indexOf(a.d.weekday) - WEEKDAY_ORDER.indexOf(b.d.weekday));

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-baseline justify-between">
          <div className="eyebrow">Редактор программы</div>
          <button onClick={onCancel} className="text-xs text-dim hover:text-fg cursor-pointer">
            отмена
          </button>
        </div>
        <label className="block border-b border-line focus-within:border-accent transition-colors mt-4">
          <span className="text-xs text-dim">Название</span>
          <input
            value={p.name}
            onChange={(e) => setP({ ...p, name: e.target.value })}
            placeholder="Моя программа"
            className="w-full bg-transparent disp text-2xl font-medium outline-none py-1"
          />
        </label>
        <div className="flex items-center gap-3 mt-4">
          <span className="text-xs text-dim">Недель в цикле:</span>
          {[1, 2].map((w) => (
            <button
              key={w}
              onClick={() => setP({ ...p, weeks: w, days: w === 1 ? p.days.filter((d) => d.week === 1) : p.days })}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold cursor-pointer transition-colors duration-150 ${
                p.weeks === w ? "bg-fg text-canvas" : "bg-surface text-dim hover:text-muted"
              }`}
            >
              {w}
            </button>
          ))}
        </div>
      </section>

      {sortedDays.map(({ d, i }) => (
        <section key={i} className="border-t border-line pt-4">
          <div className="flex items-center gap-2">
            {p.weeks > 1 && (
              <select
                value={d.week}
                onChange={(e) => setDay(i, (x) => ({ ...x, week: parseInt(e.target.value) }))}
                className="bg-surface rounded-full px-3 py-1.5 text-xs"
                aria-label="Неделя цикла"
              >
                {Array.from({ length: p.weeks }, (_, w) => (
                  <option key={w + 1} value={w + 1}>
                    нед. {w + 1}
                  </option>
                ))}
              </select>
            )}
            <select
              value={d.weekday}
              onChange={(e) => setDay(i, (x) => ({ ...x, weekday: parseInt(e.target.value) }))}
              className="bg-surface rounded-full px-3 py-1.5 text-xs uppercase font-semibold"
              aria-label="День недели"
            >
              {WEEKDAY_ORDER.map((w) => (
                <option key={w} value={w}>
                  {RU_DAYS[w]}
                </option>
              ))}
            </select>
            <button
              onClick={() => setP({ ...p, days: p.days.filter((_, j) => j !== i) })}
              className="ml-auto text-dim hover:text-danger cursor-pointer p-2"
              aria-label="Удалить день"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <ul className="mt-2">
            {d.slots.map((s, si) => (
              <li key={si} className="border-b border-line py-2.5 first:border-t">
                <div className="flex items-center gap-2.5">
                  <ExerciseIcon id={s.exerciseId} className="w-5 h-5 text-muted shrink-0" />
                  <span className="text-sm flex-1 min-w-0 truncate">{exerciseName(s.exerciseId)}</span>
                  <button onClick={() => moveSlot(i, si, -1)} className="text-dim hover:text-fg cursor-pointer p-1.5" aria-label="Выше">
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => moveSlot(i, si, 1)} className="text-dim hover:text-fg cursor-pointer p-1.5" aria-label="Ниже">
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDay(i, (x) => ({ ...x, slots: x.slots.filter((_, j) => j !== si) }))}
                    className="text-dim hover:text-danger cursor-pointer p-1.5"
                    aria-label="Удалить упражнение"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1.5 ml-8 text-xs">
                  <input
                    type="number"
                    inputMode="numeric"
                    value={s.sets}
                    onChange={(e) => setSlot(i, si, (x) => ({ ...x, sets: parseInt(e.target.value) || 1 }))}
                    className="w-12 bg-surface rounded-lg px-2 py-1.5 text-center disp"
                    aria-label="Подходы"
                  />
                  <span className="text-dim">×</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={
                      exerciseMeasure(s.exerciseId) === "time" ? fromSec(s.repsMin, unitOf(i, si, s)) : s.repsMin
                    }
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 1;
                      const isTime = exerciseMeasure(s.exerciseId) === "time";
                      const u = unitOf(i, si, s);
                      setSlot(i, si, (x) => ({ ...x, repsMin: isTime ? toSec(v, u) : v }));
                    }}
                    className="w-12 bg-surface rounded-lg px-2 py-1.5 text-center disp"
                    aria-label="От"
                  />
                  <span className="text-dim">–</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={
                      exerciseMeasure(s.exerciseId) === "time" ? fromSec(s.repsMax, unitOf(i, si, s)) : s.repsMax
                    }
                    onChange={(e) => {
                      const v = parseInt(e.target.value) || 1;
                      const isTime = exerciseMeasure(s.exerciseId) === "time";
                      const u = unitOf(i, si, s);
                      setSlot(i, si, (x) => ({ ...x, repsMax: isTime ? toSec(v, u) : v }));
                    }}
                    className="w-12 bg-surface rounded-lg px-2 py-1.5 text-center disp"
                    aria-label="До"
                  />
                  {exerciseMeasure(s.exerciseId) === "time" ? (
                    <button
                      onClick={() => {
                        const next = unitOf(i, si, s) === "s" ? "m" : "s";
                        setUnits((u) => ({ ...u, [`${i}-${si}`]: next }));
                      }}
                      className="bg-raised hover:bg-raised-hover rounded-lg px-2.5 py-1.5 cursor-pointer transition-colors duration-150 text-fg"
                      aria-label="Переключить единицы: секунды или минуты"
                    >
                      {unitOf(i, si, s) === "m" ? "мин" : "сек"} ⇄
                    </button>
                  ) : (
                    <span className="text-dim">повт</span>
                  )}
                  <select
                    value={s.intensity}
                    onChange={(e) => setSlot(i, si, (x) => ({ ...x, intensity: e.target.value as Intensity }))}
                    className="bg-surface rounded-lg px-2 py-1.5 flex-1 min-w-0"
                    aria-label="Интенсивность"
                  >
                    {INTENSITIES.map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </div>
              </li>
            ))}
          </ul>

          {pickerFor === i ? (
            <div className="mt-3">
              <div className="relative">
                <Search className="w-4 h-4 text-dim absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="поиск упражнения…"
                  className="w-full bg-surface rounded-full pl-11 pr-10 py-2.5 text-sm"
                  autoFocus
                />
                <button
                  onClick={() => setPickerFor(null)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-dim hover:text-fg cursor-pointer p-1.5"
                  aria-label="Закрыть выбор"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-1.5 mt-2 flex-wrap">
                {(Object.keys(GROUP_LABEL) as MuscleGroup[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setGroup(group === g ? null : g)}
                    className={`rounded-full px-3 py-1 text-xs cursor-pointer transition-colors duration-150 ${
                      group === g ? "bg-accent text-accent-ink" : "bg-surface text-dim hover:text-muted"
                    }`}
                  >
                    {GROUP_LABEL[g]}
                  </button>
                ))}
              </div>
              <ul className="mt-2">
                {matches.map((x) => (
                  <li key={x.id} className="border-b border-line first:border-t">
                    <button
                      onClick={() => {
                        /* дефолты: кардио — 1×10–20 мин, время (планка) — 3×30–60 сек, иначе 3×8–12 */
                        const slot =
                          x.measure === "time"
                            ? x.group === "cardio"
                              ? { exerciseId: x.id, intensity: "средняя" as const, sets: 1, repsMin: 600, repsMax: 1200 }
                              : { exerciseId: x.id, intensity: "средняя" as const, sets: 3, repsMin: 30, repsMax: 60 }
                            : { exerciseId: x.id, intensity: "средняя" as const, sets: 3, repsMin: 8, repsMax: 12 };
                        setDay(i, (d2) => ({ ...d2, slots: [...d2.slots, slot] }));
                        setQ("");
                      }}
                      className="w-full text-left py-2.5 flex items-center gap-2.5 cursor-pointer hover:text-accent transition-colors duration-150"
                    >
                      <ExerciseIcon id={x.id} className="w-5 h-5 text-muted shrink-0" />
                      <span className="text-sm flex-1">{x.name}</span>
                      <span className="text-xs text-dim">{GROUP_LABEL[x.group]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <button
              onClick={() => {
                setPickerFor(i);
                setQ("");
                setGroup(null);
              }}
              className="mt-3 text-sm text-muted hover:text-fg cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> упражнение
            </button>
          )}
        </section>
      ))}

      <button onClick={addDay} className="text-sm text-muted hover:text-fg cursor-pointer flex items-center gap-1.5">
        <Plus className="w-4 h-4" /> день
      </button>

      <button
        onClick={() => valid && onSave(p)}
        disabled={!valid}
        className="w-full bg-accent hover:bg-accent-soft disabled:opacity-40 active:scale-[0.98] transition-all duration-150 text-accent-ink font-semibold rounded-full py-3.5 cursor-pointer"
      >
        Сохранить программу
      </button>
    </div>
  );
}
