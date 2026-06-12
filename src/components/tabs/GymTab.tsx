import { useEffect, useState } from "react";
import { Check, ChevronRight, Play, RotateCcw, Settings2, SkipForward, Timer, Trash2 } from "lucide-react";
import type { ActiveProgram, DayLog, ProgramSlot, WorkoutExerciseLog, WorkoutLog, WorkoutProgram } from "../../types";
import { exerciseName } from "../../constants/exercises";
import { BUILTIN_PROGRAMS, findBuiltin, findProgramDay, programWeekdays } from "../../constants/programs";
import { RU_DAYS, fmtDate, todayStr } from "../../lib/date";
import { blankProgram, isGymDay, lastSetFor, mondayOf, nearestGymWeekday, programWeekFor } from "../../lib/gym";
import { nextId } from "../../lib/id";
import { storage } from "../../lib/storage";
import { ExerciseIcon } from "../ExerciseIcons";
import { AiProgramBuilder } from "../gym/AiProgramBuilder";
import { ProgramEditor } from "../gym/ProgramEditor";
import { ProgramManager } from "../gym/ProgramManager";

interface Props {
  date: string;
  day: DayLog;
  saveDay: (d: DayLog) => void;
}

type View = "main" | "programs" | "editor" | "ai";

const INTENSITY_STYLE: Record<string, string> = {
  легкая: "text-dim",
  средняя: "text-muted",
  тяжелая: "text-accent",
};

/** 83 сек → "1:23". */
const fmtTime = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};

const workoutStats = (w: WorkoutLog) => {
  const sets = w.entries.reduce((s, e) => s + e.sets.length, 0);
  const tonnage = w.entries.reduce((s, e) => s + e.sets.reduce((a, x) => a + x.weight * x.reps, 0), 0);
  const min = w.finishedAt ? Math.round((+new Date(w.finishedAt) - +new Date(w.startedAt)) / 60000) : null;
  return { sets, tonnage, min };
};

export function GymTab({ date, day, saveDay }: Props) {
  const [workouts, setWorkouts] = useState<Record<string, WorkoutLog>>(() => storage.loadWorkouts());
  const [customPrograms, setCustomPrograms] = useState<WorkoutProgram[]>(() => storage.loadCustomPrograms());
  const [active, setActive] = useState<ActiveProgram>(() => storage.loadActiveProgram());
  const [view, setView] = useState<View>("main");
  const [draft, setDraft] = useState<WorkoutProgram | null>(null);

  const [pick, setPick] = useState<{ week: number; weekday: number } | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { w?: string; r?: string }>>({});
  const [focusId, setFocusId] = useState<string | null>(null);
  const [restStart, setRestStart] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [historyOpen, setHistoryOpen] = useState<string | null>(null);

  const program: WorkoutProgram =
    customPrograms.find((p) => p.id === active.id) ?? findBuiltin(active.id) ?? BUILTIN_PROGRAMS[0];
  const weekdays = programWeekdays(program);

  const log = workouts[date] ?? null;
  const running = !!log && !log.finishedAt;
  const week = pick?.week ?? log?.week ?? programWeekFor(date, active, program.weeks);
  const weekday = pick?.weekday ?? log?.weekday ?? nearestGymWeekday(date, weekdays);
  const programDay = findProgramDay(program, week, weekday);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [running]);

  const saveAll = (all: Record<string, WorkoutLog>) => {
    setWorkouts(all);
    storage.saveWorkouts(all);
  };
  const saveLog = (next: WorkoutLog) => saveAll({ ...workouts, [date]: next });

  const savePrograms = (list: WorkoutProgram[]) => {
    setCustomPrograms(list);
    storage.saveCustomPrograms(list);
  };
  const activate = (p: WorkoutProgram) => {
    const a = { id: p.id, anchor: mondayOf(todayStr()) };
    setActive(a);
    storage.saveActiveProgram(a);
    setPick(null);
    setView("main");
  };

  const updateEntry = (exerciseId: string, fn: (e: WorkoutExerciseLog) => WorkoutExerciseLog) => {
    if (!log) return;
    saveLog({ ...log, entries: log.entries.map((e) => (e.exerciseId === exerciseId ? fn(e) : e)) });
  };

  const currentSlot: ProgramSlot | null = (() => {
    if (!log || !programDay) return null;
    const incomplete = (s: ProgramSlot) => {
      const e = log.entries.find((x) => x.exerciseId === s.exerciseId);
      return e && !e.skipped && e.sets.length < s.sets;
    };
    if (focusId) {
      const s = programDay.slots.find((x) => x.exerciseId === focusId);
      if (s && incomplete(s)) return s;
    }
    return programDay.slots.find(incomplete) ?? null;
  })();

  const entryOf = (id: string) => log?.entries.find((x) => x.exerciseId === id);

  const defaults = (id: string) => {
    const own = entryOf(id)?.sets.slice(-1)[0];
    const prev = own ?? lastSetFor(workouts, id, date);
    return { w: prev ? String(prev.weight) : "", r: prev ? String(prev.reps) : "" };
  };
  const inputW = currentSlot ? (drafts[currentSlot.exerciseId]?.w ?? defaults(currentSlot.exerciseId).w) : "";
  const inputR = currentSlot ? (drafts[currentSlot.exerciseId]?.r ?? defaults(currentSlot.exerciseId).r) : "";

  const start = () => {
    if (!programDay) return;
    saveLog({
      date,
      week,
      weekday,
      startedAt: new Date().toISOString(),
      entries: programDay.slots.map((s) => ({ exerciseId: s.exerciseId, skipped: false, sets: [] })),
    });
    setDrafts({});
    setFocusId(null);
  };

  const addSet = () => {
    if (!currentSlot) return;
    const id = currentSlot.exerciseId;
    const wv = parseFloat(inputW.replace(",", "."));
    const rv = parseInt(inputR);
    if (!wv || !rv) return;
    updateEntry(id, (e) => ({ ...e, sets: [...e.sets, { weight: wv, reps: rv }] }));
    setDrafts((d) => ({ ...d, [id]: {} }));
    setRestStart(Date.now());
  };

  const finish = () => {
    if (!log) return;
    setRestStart(null);
    saveLog({ ...log, finishedAt: new Date().toISOString() });
    const min = Math.max(5, Math.round((Date.now() - new Date(log.startedAt).getTime()) / 60000));
    saveDay({ ...day, acts: [...day.acts, { id: nextId(), type: "Зал", min }] });
  };

  const deleteWorkout = (d: string) => {
    if (!window.confirm(`Удалить тренировку за ${fmtDate(d)}?`)) return;
    const all = { ...workouts };
    delete all[d];
    saveAll(all);
  };

  /* ── экраны программ ── */
  if (view === "programs")
    return (
      <ProgramManager
        custom={customPrograms}
        activeId={active.id}
        onActivate={activate}
        onEdit={(p) => {
          setDraft(p.builtin ? { ...JSON.parse(JSON.stringify(p)), id: "custom-" + Date.now(), name: p.name + " (копия)", builtin: undefined } : p);
          setView("editor");
        }}
        onDelete={(id) => {
          if (!window.confirm("Удалить программу?")) return;
          savePrograms(customPrograms.filter((x) => x.id !== id));
          if (active.id === id) activate(BUILTIN_PROGRAMS[0]);
        }}
        onCreate={() => {
          setDraft(blankProgram());
          setView("editor");
        }}
        onAi={() => setView("ai")}
        onClose={() => setView("main")}
      />
    );

  if (view === "editor" && draft)
    return (
      <ProgramEditor
        initial={draft}
        onSave={(p) => {
          savePrograms([p, ...customPrograms.filter((x) => x.id !== p.id)]);
          setDraft(null);
          setView("programs");
        }}
        onCancel={() => {
          setDraft(null);
          setView("programs");
        }}
      />
    );

  if (view === "ai")
    return (
      <AiProgramBuilder
        onResult={(p) => {
          setDraft(p);
          setView("editor");
        }}
        onCancel={() => setView("programs")}
      />
    );

  const done = !!log?.finishedAt;
  const allDone =
    !!log &&
    !!programDay &&
    programDay.slots.every((s) => {
      const e = entryOf(s.exerciseId);
      return e && (e.skipped || e.sets.length >= s.sets);
    });

  /* ── режим тренировки: фокус на одном упражнении ── */
  if (running && programDay && log) {
    const curEntry = currentSlot ? entryOf(currentSlot.exerciseId) : null;
    return (
      <div className="space-y-8">
        <section className="flex items-end justify-between">
          <div>
            <div className="eyebrow flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5" /> Тренировка
            </div>
            <div className="disp text-4xl font-semibold mt-1">{fmtTime(now - new Date(log.startedAt).getTime())}</div>
          </div>
          {restStart && (
            <div className="text-right">
              <div className="eyebrow">Отдых</div>
              <div className={`disp text-2xl font-medium mt-1 ${now - restStart > 180000 ? "text-danger" : "text-accent"}`}>
                {fmtTime(now - restStart)}
              </div>
            </div>
          )}
        </section>

        <section>
          <div className="flex gap-2 flex-wrap">
            {programDay.slots.map((s) => {
              const e = entryOf(s.exerciseId)!;
              const complete = e.sets.length >= s.sets;
              const isCur = currentSlot?.exerciseId === s.exerciseId;
              return (
                <button
                  key={s.exerciseId}
                  onClick={() => setFocusId(s.exerciseId)}
                  className={`w-11 h-11 rounded-full flex items-center justify-center cursor-pointer transition-all duration-150 ${
                    isCur
                      ? "bg-accent text-accent-ink"
                      : e.skipped
                        ? "bg-surface text-dim opacity-40"
                        : complete
                          ? "bg-raised text-dim"
                          : "bg-surface text-muted"
                  }`}
                  aria-label={`${exerciseName(s.exerciseId)}: ${e.skipped ? "пропущено" : `${e.sets.length} из ${s.sets}`}`}
                >
                  {complete && !isCur ? <Check className="w-4 h-4" /> : <ExerciseIcon id={s.exerciseId} className="w-5 h-5" />}
                </button>
              );
            })}
          </div>
        </section>

        {currentSlot && curEntry ? (
          <section className="border-t border-line pt-6">
            <div className="flex items-center gap-3">
              <ExerciseIcon id={currentSlot.exerciseId} className="w-8 h-8 text-accent shrink-0" />
              <div className="min-w-0">
                <div className="disp text-xl font-medium leading-tight">{exerciseName(currentSlot.exerciseId)}</div>
                <div className="text-xs mt-0.5">
                  <span className={INTENSITY_STYLE[currentSlot.intensity]}>{currentSlot.intensity}</span>
                  <span className="text-dim">
                    {" "}
                    · цель {currentSlot.repsMin}–{currentSlot.repsMax} повт
                  </span>
                </div>
              </div>
              <div className="ml-auto disp text-2xl shrink-0">
                {curEntry.sets.length + 1}
                <span className="text-dim text-base"> / {currentSlot.sets}</span>
              </div>
            </div>

            {curEntry.sets.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {curEntry.sets.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => updateEntry(currentSlot.exerciseId, (x) => ({ ...x, sets: x.sets.filter((_, j) => j !== i) }))}
                    className="bg-surface rounded-full px-3 py-1.5 text-xs disp cursor-pointer hover:text-danger transition-colors duration-150"
                    aria-label={`Подход ${i + 1}: ${s.weight} кг × ${s.reps}. Нажмите, чтобы удалить`}
                  >
                    {s.weight}×{s.reps}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-6 mt-5">
              <label className="block border-b border-line focus-within:border-accent transition-colors">
                <span className="text-xs text-dim">кг</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={inputW}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [currentSlot.exerciseId]: { ...d[currentSlot.exerciseId], w: e.target.value } }))
                  }
                  className="w-full min-w-0 bg-transparent disp text-3xl font-medium outline-none py-1"
                  aria-label="Вес, кг"
                />
              </label>
              <label className="block border-b border-line focus-within:border-accent transition-colors">
                <span className="text-xs text-dim">повторы</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={inputR}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [currentSlot.exerciseId]: { ...d[currentSlot.exerciseId], r: e.target.value } }))
                  }
                  className="w-full min-w-0 bg-transparent disp text-3xl font-medium outline-none py-1"
                  aria-label="Повторы"
                />
              </label>
            </div>

            <button
              onClick={addSet}
              className="mt-6 w-full bg-accent hover:bg-accent-soft active:scale-[0.98] transition-all duration-150 text-accent-ink font-semibold rounded-full py-3.5 cursor-pointer"
            >
              Записать подход
            </button>
            <button
              onClick={() => {
                updateEntry(currentSlot.exerciseId, (x) => ({ ...x, skipped: true }));
                setFocusId(null);
              }}
              className="mt-3 w-full text-muted hover:text-fg transition-colors duration-150 rounded-full py-2 text-sm cursor-pointer flex items-center justify-center gap-1.5"
            >
              <SkipForward className="w-4 h-4" /> Пропустить упражнение
            </button>
          </section>
        ) : (
          <section className="border-t border-line pt-6 text-center">
            <div className="disp text-2xl font-medium">Все упражнения выполнены</div>
            <p className="text-sm text-dim mt-2">Можно завершать — тренировка попадёт в активность дня.</p>
          </section>
        )}

        <button
          onClick={finish}
          className={`w-full active:scale-[0.98] transition-all duration-150 font-semibold rounded-full py-3 text-sm cursor-pointer ${
            allDone ? "bg-accent hover:bg-accent-soft text-accent-ink" : "bg-raised hover:bg-raised-hover text-fg"
          }`}
        >
          Завершить тренировку
        </button>
      </div>
    );
  }

  /* ── режим планирования + история ── */
  const todays = log;
  const history = Object.values(workouts)
    .filter((w) => w.date !== date || !!w.finishedAt)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-baseline justify-between">
          <div className="eyebrow">
            Зал{program.weeks > 1 ? ` · неделя ${week}` : ""}
          </div>
          <button
            onClick={() => setView("programs")}
            className="text-xs text-muted hover:text-fg cursor-pointer flex items-center gap-1.5"
          >
            <Settings2 className="w-3.5 h-3.5" /> {program.name}
          </button>
        </div>
        {!isGymDay(date, weekdays) && !todays && <p className="text-xs text-dim mt-1">сегодня по программе отдых</p>}

        {!todays && (
          <>
            <div className="flex gap-2 mt-4 flex-wrap">
              {weekdays.map((d) => (
                <button
                  key={d}
                  onClick={() => setPick({ week, weekday: d })}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase cursor-pointer transition-colors duration-150 ${
                    weekday === d ? "bg-fg text-canvas" : "bg-surface text-dim hover:text-muted"
                  }`}
                >
                  {RU_DAYS[d]}
                </button>
              ))}
              {program.weeks > 1 && (
                <button
                  onClick={() => setPick({ week: (week % program.weeks) + 1, weekday })}
                  className="ml-auto rounded-full px-4 py-2 text-xs font-semibold cursor-pointer bg-surface text-dim hover:text-muted transition-colors duration-150"
                  aria-label="Переключить неделю программы"
                >
                  нед. {week} ⇄
                </button>
              )}
            </div>

            {programDay ? (
              <>
                <ul className="mt-5">
                  {programDay.slots.map((s, i) => (
                    <li key={s.exerciseId + i} className="flex items-center gap-3 border-b border-line py-3 first:border-t">
                      <ExerciseIcon id={s.exerciseId} className="w-6 h-6 text-muted shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm truncate">{exerciseName(s.exerciseId)}</div>
                        <div className={`text-xs ${INTENSITY_STYLE[s.intensity]}`}>{s.intensity}</div>
                      </div>
                      <div className="disp text-sm text-muted shrink-0">
                        {s.sets}×{s.repsMin}–{s.repsMax}
                      </div>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={start}
                  className="mt-6 w-full bg-accent hover:bg-accent-soft active:scale-[0.98] transition-all duration-150 text-accent-ink font-semibold rounded-full py-3.5 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Play className="w-5 h-5" /> Начать тренировку
                </button>
              </>
            ) : (
              <p className="text-sm text-dim mt-4">Для этого дня программы нет.</p>
            )}
          </>
        )}

        {todays && done && (
          <div className="mt-4">
            <div className="disp text-3xl font-semibold">
              {workoutStats(todays).sets} <span className="text-dim text-lg">подходов</span> ·{" "}
              {Math.round((workoutStats(todays).tonnage / 1000) * 10) / 10}
              <span className="text-dim text-lg"> т</span>
              {workoutStats(todays).min !== null && (
                <>
                  {" "}
                  · {workoutStats(todays).min}
                  <span className="text-dim text-lg"> мин</span>
                </>
              )}
            </div>
            <button
              onClick={() => saveLog({ ...todays, finishedAt: undefined })}
              className="mt-3 text-xs text-muted hover:text-fg cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" /> возобновить тренировку
            </button>
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section>
          <div className="eyebrow">История</div>
          <ul className="mt-4">
            {history.map((w) => {
              const st = workoutStats(w);
              const open = historyOpen === w.date;
              return (
                <li key={w.date} className="border-b border-line py-3 first:border-t">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setHistoryOpen(open ? null : w.date)}
                      className="flex-1 min-w-0 flex items-center justify-between gap-3 cursor-pointer text-left"
                      aria-expanded={open}
                    >
                      <div className="min-w-0">
                        <div className="text-sm">{fmtDate(w.date)}</div>
                        <div className="text-xs text-dim">
                          {RU_DAYS[w.weekday]} · {st.sets} подходов · {Math.round((st.tonnage / 1000) * 10) / 10} т
                          {st.min !== null && ` · ${st.min} мин`}
                        </div>
                      </div>
                      <ChevronRight
                        className={`w-4 h-4 text-dim shrink-0 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
                      />
                    </button>
                    <button
                      onClick={() => deleteWorkout(w.date)}
                      className="text-dim hover:text-danger cursor-pointer p-2 shrink-0"
                      aria-label={`Удалить тренировку за ${fmtDate(w.date)}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {open && (
                    <ul className="mt-3 ml-1 space-y-2">
                      {w.entries.map((e) => (
                        <li key={e.exerciseId} className="flex items-start gap-2.5">
                          <ExerciseIcon id={e.exerciseId} className="w-4.5 h-4.5 text-dim shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <span className="text-xs text-muted">{exerciseName(e.exerciseId)}</span>
                            <div className="text-xs disp text-body">
                              {e.skipped ? (
                                <span className="text-dim">пропущено</span>
                              ) : e.sets.length ? (
                                e.sets.map((s) => `${s.weight}×${s.reps}`).join(" · ")
                              ) : (
                                <span className="text-dim">—</span>
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
