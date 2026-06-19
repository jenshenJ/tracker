import { useEffect, useState } from "react";
import { ArrowLeftRight, Check, ChevronRight, LineChart, Play, Plus, RotateCcw, Search, Settings2, SkipForward, Timer, Trash2, X } from "lucide-react";
import type { ActiveProgram, DayLog, MuscleGroup, ProgramSlot, WorkoutExerciseLog, WorkoutLog, WorkoutProgram } from "../../types";
import { EXERCISE_CATALOG, GROUP_LABEL, exerciseGroup, exerciseMeasure, exerciseName } from "../../constants/exercises";
import { BUILTIN_PROGRAMS, findBuiltin, findProgramDay, programWeekdays } from "../../constants/programs";
import { RU_DAYS, fmtDate, todayStr } from "../../lib/date";
import { blankProgram, isGymDay, lastWorkoutSetsFor, mondayOf, nearestGymWeekday, progressSeries, programWeekFor, timeTarget, workingSetFor } from "../../lib/gym";
import { nextId } from "../../lib/id";
import { storage } from "../../lib/storage";
import { ExerciseIcon } from "../ExerciseIcons";
import { AiProgramBuilder } from "../gym/AiProgramBuilder";
import { ProgramEditor } from "../gym/ProgramEditor";
import { ProgramManager } from "../gym/ProgramManager";
import { ProgressView, Sparkline } from "../gym/Progress";

interface Props {
  date: string;
  day: DayLog;
  saveDay: (d: DayLog) => void;
}

type View = "main" | "programs" | "editor" | "ai" | "progress";

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

/** Подпись чипа подхода: "60×12" или "1:23" для подходов по времени. */
const setChip = (s: { weight: number; reps: number; seconds?: number }) =>
  s.seconds != null ? fmtTime(s.seconds * 1000) : `${s.weight}×${s.reps}`;

/** Обёртка над Date.now: компилятор react-hooks считает прямой вызов в хендлерах нечистым. */
const nowMs = () => Date.now();

/** Указатель «фокуса» прошёл конец списка — показываем экран завершения. */
const DONE_FOCUS = "__done__";

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
  const [now, setNow] = useState(() => nowMs());
  const [historyOpen, setHistoryOpen] = useState<string | null>(null);
  /** локальные правки плана перед стартом, привязаны к конкретному дню; null — план как в программе */
  const [plan, setPlan] = useState<{ key: string; slots: ProgramSlot[] } | null>(null);
  /** открытый выбор упражнения: замена слота или добавление; live — правка во время тренировки */
  const [picker, setPicker] = useState<{ mode: "swap" | "add"; index: number; live?: boolean } | null>(null);
  const [pickQ, setPickQ] = useState("");
  const [pickGroup, setPickGroup] = useState<MuscleGroup | null>(null);
  /** какой слот плана сейчас редактируем (подходы/повторы); -1 — никакой */
  const [editIdx, setEditIdx] = useState(-1);
  /** единицы ввода для временных слотов: индекс → сек|мин */
  const [editUnits, setEditUnits] = useState<Record<number, "s" | "m">>({});

  const program: WorkoutProgram =
    customPrograms.find((p) => p.id === active.id) ?? findBuiltin(active.id) ?? BUILTIN_PROGRAMS[0];
  const weekdays = programWeekdays(program);

  /** Тренировки выбранного дня по времени начала. */
  const dayWorkouts = Object.values(workouts)
    .filter((w) => w.date === date)
    .sort((a, b) => (a.startedAt ?? "").localeCompare(b.startedAt ?? ""));
  /** Активная (незавершённая) тренировка дня — её и продолжаем. */
  const log = dayWorkouts.find((w) => !w.finishedAt) ?? null;
  /** Сколько тренировок уже завершено сегодня — для подписи кнопки старта. */
  const doneToday = dayWorkouts.filter((w) => w.finishedAt).length;
  const running = !!log && !log.finishedAt;
  const week = pick?.week ?? log?.week ?? programWeekFor(date, active, program.weeks);
  const weekday = pick?.weekday ?? log?.weekday ?? nearestGymWeekday(date, weekdays);
  const programDay = findProgramDay(program, week, weekday);

  /** Слоты идущей сессии: слепок из лога (старые логи — слоты программы). */
  const sessionSlots = log?.slots ?? programDay?.slots ?? [];
  /** Таймеры живут в логе — переживают уход на другую вкладку и возврат. */
  const restStart = log?.restStartedAt ?? null;
  const setStart = log?.setStartedAt ?? null;
  /** Ключ дня: правки плана действуют только пока выбран тот же день. */
  const planKey = `${active.id}-${week}-${weekday}`;
  const edited = plan?.key === planKey;
  /** План перед стартом: правки пользователя поверх слотов программы. */
  const planSlots = edited ? plan.slots : (programDay?.slots ?? []);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setNow(nowMs()), 1000);
    return () => clearInterval(t);
  }, [running]);

  const saveAll = (all: Record<string, WorkoutLog>) => {
    setWorkouts(all);
    storage.saveWorkouts(all);
  };
  const saveLog = (next: WorkoutLog) => saveAll({ ...workouts, [next.id]: next });

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

  const entryOf = (id: string) => log?.entries.find((x) => x.exerciseId === id);

  /** упражнение ещё в работе: есть запись, не пропущено, целевые подходы не закрыты */
  const incompleteSlot = (s: ProgramSlot) => {
    const e = entryOf(s.exerciseId);
    return !!e && !e.skipped && e.sets.length < s.sets;
  };

  /**
   * Текущее упражнение. Явный выбор пользователя (focusId, в т.ч. возврат тапом по точке)
   * важнее автопорядка — показываем даже выполненное/пропущенное, чтобы можно было дописать.
   * Без выбора (старт/возобновление) — первое незакрытое по порядку.
   */
  const currentSlot: ProgramSlot | null = (() => {
    if (!log || focusId === DONE_FOCUS) return null;
    if (focusId) {
      const s = sessionSlots.find((x) => x.exerciseId === focusId);
      if (s) return s;
    }
    return sessionSlots.find(incompleteSlot) ?? null;
  })();

  /** Следующее по порядку незакрытое упражнение после данного — только вперёд, без возврата. */
  const nextSlotAfter = (fromId: string): ProgramSlot | undefined => {
    const idx = sessionSlots.findIndex((s) => s.exerciseId === fromId);
    return sessionSlots.slice(idx + 1).find(incompleteSlot);
  };
  const advanceFrom = (fromId: string) => {
    const next = nextSlotAfter(fromId);
    setFocusId(next ? next.exerciseId : DONE_FOCUS);
  };

  const defaults = (id: string) => {
    const own = entryOf(id)?.sets.slice(-1)[0];
    if (own) return { w: String(own.weight), r: String(own.reps) };
    const prev = workingSetFor(workouts, id, date); // рабочий (самый тяжёлый) подход прошлой тренировки
    return { w: prev ? String(prev.weight) : "", r: prev ? String(prev.reps) : "" };
  };
  const inputW = currentSlot ? (drafts[currentSlot.exerciseId]?.w ?? defaults(currentSlot.exerciseId).w) : "";
  const inputR = currentSlot ? (drafts[currentSlot.exerciseId]?.r ?? defaults(currentSlot.exerciseId).r) : "";

  const start = () => {
    if (!programDay || planSlots.length === 0) return;
    const slots = planSlots;
    saveLog({
      id: `w${nowMs()}-${Math.random().toString(36).slice(2, 7)}`,
      date,
      week,
      weekday,
      startedAt: new Date().toISOString(),
      slots,
      entries: slots.map((s) => ({ exerciseId: s.exerciseId, skipped: false, sets: [] })),
    });
    setDrafts({});
    setFocusId(slots[0].exerciseId);
    setPlan(null);
    setPicker(null);
    setEditIdx(-1);
  };

  /** После записи подхода: добили цель — уходим к следующему; иначе остаёмся на упражнении. */
  const afterSet = (id: string, newCount: number, target: number) => {
    if (newCount >= target) advanceFrom(id);
    else setFocusId(id);
  };

  const addSet = () => {
    if (!currentSlot || !log) return;
    const id = currentSlot.exerciseId;
    const target = currentSlot.sets;
    const wv = parseFloat(inputW.replace(",", "."));
    const rv = parseInt(inputR);
    if (!wv || !rv) return;
    const newCount = (entryOf(id)?.sets.length ?? 0) + 1;
    saveLog({
      ...log,
      entries: log.entries.map((e) => (e.exerciseId === id ? { ...e, sets: [...e.sets, { weight: wv, reps: rv }] } : e)),
      restStartedAt: nowMs(),
      setStartedAt: undefined,
    });
    setDrafts((d) => ({ ...d, [id]: {} }));
    afterSet(id, newCount, target);
  };

  /** стоп таймерного подхода: записываем длительность */
  const stopTimedSet = () => {
    if (!currentSlot || !log || setStart === null) return;
    const id = currentSlot.exerciseId;
    const target = currentSlot.sets;
    const seconds = Math.max(1, Math.round((nowMs() - setStart) / 1000));
    const newCount = (entryOf(id)?.sets.length ?? 0) + 1;
    saveLog({
      ...log,
      entries: log.entries.map((e) => (e.exerciseId === id ? { ...e, sets: [...e.sets, { weight: 0, reps: 0, seconds }] } : e)),
      restStartedAt: nowMs(),
      setStartedAt: undefined,
    });
    afterSet(id, newCount, target);
  };

  const finish = () => {
    if (!log) return;
    saveLog({ ...log, finishedAt: new Date().toISOString(), restStartedAt: undefined, setStartedAt: undefined });
    const min = Math.max(5, Math.round((nowMs() - new Date(log.startedAt).getTime()) / 60000));
    saveDay({ ...day, acts: [...day.acts, { id: nextId(), type: "Зал", min }] });
  };

  /* ── правки плана перед стартом ── */
  /** дефолтный слот для упражнения: кардио — 1×10–20 мин, время — 3×30–60 сек, иначе 3×8–12 */
  const defaultSlotFor = (id: string): ProgramSlot =>
    exerciseMeasure(id) === "time"
      ? exerciseGroup(id) === "cardio"
        ? { exerciseId: id, intensity: "средняя", sets: 1, repsMin: 600, repsMax: 1200 }
        : { exerciseId: id, intensity: "средняя", sets: 3, repsMin: 30, repsMax: 60 }
      : { exerciseId: id, intensity: "средняя", sets: 3, repsMin: 8, repsMax: 12 };

  const editPlan = (slots: ProgramSlot[]) => setPlan({ key: planKey, slots });

  const setPlanSlot = (index: number, fn: (s: ProgramSlot) => ProgramSlot) =>
    editPlan(planSlots.map((s, i) => (i === index ? fn(s) : s)));

  /* единицы ввода для слотов по времени (сек/мин), с конвертацией в секунды */
  const slotUnit = (i: number, s: ProgramSlot): "s" | "m" => editUnits[i] ?? (s.repsMax >= 120 ? "m" : "s");
  const fromSec = (v: number, u: "s" | "m") => (u === "m" ? Math.round(v / 60) : v);
  const toSec = (v: number, u: "s" | "m") => (u === "m" ? v * 60 : v);

  const removeSlot = (index: number) => {
    editPlan(planSlots.filter((_, i) => i !== index));
    setEditIdx(-1);
  };

  const swapExercise = (index: number, newId: string) => {
    editPlan(
      planSlots.map((s, i) => {
        if (i !== index) return s;
        /* совпадает тип измерения — сохраняем подходы/повторы, иначе берём дефолт */
        return exerciseMeasure(s.exerciseId) === exerciseMeasure(newId)
          ? { ...s, exerciseId: newId }
          : { ...defaultSlotFor(newId), intensity: s.intensity };
      })
    );
    setPicker(null);
  };

  const addExercise = (newId: string) => {
    editPlan([...planSlots, defaultSlotFor(newId)]);
    setPicker(null);
  };

  const openSwap = (index: number, exId: string) => {
    setPicker({ mode: "swap", index });
    setPickQ("");
    setPickGroup(exerciseGroup(exId) ?? null);
  };
  const openAdd = () => {
    setPicker({ mode: "add", index: -1 });
    setPickQ("");
    setPickGroup(null);
  };

  /* ── правки прямо во время тренировки (мутируют лог: slots + entries) ── */
  const liveSlots = () => log?.slots ?? sessionSlots; // миграция старых логов без снапшота

  /** Заменить текущее упражнение по ходу тренировки. Подходы старого сбрасываются. */
  const swapCurrentLive = (newId: string) => {
    if (!log || !currentSlot) return;
    const oldId = currentSlot.exerciseId;
    if (oldId === newId) return setPicker(null);
    const newSlot =
      exerciseMeasure(oldId) === exerciseMeasure(newId)
        ? { ...currentSlot, exerciseId: newId }
        : { ...defaultSlotFor(newId), intensity: currentSlot.intensity };
    saveLog({
      ...log,
      slots: liveSlots().map((s) => (s.exerciseId === oldId ? newSlot : s)),
      entries: log.entries.map((e) => (e.exerciseId === oldId ? { exerciseId: newId, skipped: false, sets: [] } : e)),
      setStartedAt: undefined,
    });
    setFocusId(newId);
    setPicker(null);
  };

  /** Добавить упражнение по ходу тренировки (или перейти к уже добавленному). */
  const addExerciseLive = (newId: string) => {
    if (!log) return;
    const exists = sessionSlots.some((s) => s.exerciseId === newId);
    saveLog({
      ...log,
      slots: exists ? liveSlots() : [...liveSlots(), defaultSlotFor(newId)],
      entries: exists ? log.entries : [...log.entries, { exerciseId: newId, skipped: false, sets: [] }],
    });
    setFocusId(newId);
    setPicker(null);
  };

  const openSwapLive = (exId: string) => {
    setPicker({ mode: "swap", index: -1, live: true });
    setPickQ("");
    setPickGroup(exerciseGroup(exId) ?? null);
  };
  const openAddLive = () => {
    setPicker({ mode: "add", index: -1, live: true });
    setPickQ("");
    setPickGroup(null);
  };

  const pickMatches = EXERCISE_CATALOG.filter(
    (x) =>
      (!pickGroup || x.group === pickGroup) &&
      (pickQ.trim().length < 2 || x.name.toLowerCase().includes(pickQ.trim().toLowerCase()))
  ).slice(0, 12);

  /** Блок выбора упражнения — общий для плана и для правок во время тренировки. */
  const pickerBlock = picker && (
    <div className="mt-2 border border-line rounded-2xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-dim">
          {picker.mode === "swap" ? "Замена — упражнения на ту же группу мышц" : "Добавить упражнение"}
        </span>
        <button onClick={() => setPicker(null)} className="text-dim hover:text-fg cursor-pointer p-1" aria-label="Закрыть выбор">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="relative">
        <Search className="w-4 h-4 text-dim absolute left-4 top-1/2 -translate-y-1/2" />
        <input
          value={pickQ}
          onChange={(e) => setPickQ(e.target.value)}
          placeholder="поиск упражнения…"
          className="w-full bg-surface rounded-full pl-11 pr-4 py-2.5 text-sm"
          autoFocus
        />
      </div>
      <div className="flex gap-1.5 mt-2 flex-wrap">
        {(Object.keys(GROUP_LABEL) as MuscleGroup[]).map((g) => (
          <button
            key={g}
            onClick={() => setPickGroup(pickGroup === g ? null : g)}
            className={`rounded-full px-3 py-1 text-xs cursor-pointer transition-colors duration-150 ${
              pickGroup === g ? "bg-accent text-accent-ink" : "bg-surface text-dim hover:text-muted"
            }`}
          >
            {GROUP_LABEL[g]}
          </button>
        ))}
      </div>
      <ul className="mt-2">
        {pickMatches.map((x) => (
          <li key={x.id} className="border-b border-line first:border-t">
            <button
              onClick={() => {
                if (picker.live) {
                  if (picker.mode === "swap") swapCurrentLive(x.id);
                  else addExerciseLive(x.id);
                } else if (picker.mode === "swap") {
                  swapExercise(picker.index, x.id);
                } else {
                  addExercise(x.id);
                }
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
  );

  const deleteWorkout = (w: WorkoutLog) => {
    if (!window.confirm(`Удалить тренировку за ${fmtDate(w.date)}?`)) return;
    const all = { ...workouts };
    delete all[w.id];
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
          setDraft(p.builtin ? { ...JSON.parse(JSON.stringify(p)), id: "custom-" + nowMs(), name: p.name + " (копия)", builtin: undefined } : p);
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

  if (view === "progress") return <ProgressView workouts={workouts} onClose={() => setView("main")} />;

  const allDone =
    !!log &&
    sessionSlots.length > 0 &&
    sessionSlots.every((s) => {
      const e = entryOf(s.exerciseId);
      return e && (e.skipped || e.sets.length >= s.sets);
    });

  /* ── режим тренировки: фокус на одном упражнении ── */
  if (running && log) {
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
            {sessionSlots.map((s) => {
              const e = entryOf(s.exerciseId)!;
              const complete = e.sets.length >= s.sets;
              const isCur = currentSlot?.exerciseId === s.exerciseId;
              return (
                <button
                  key={s.exerciseId}
                  onClick={() => {
                    setFocusId(s.exerciseId);
                    if (log.setStartedAt != null) saveLog({ ...log, setStartedAt: undefined });
                  }}
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
          <div className="flex items-center gap-4 mt-3">
            {currentSlot && (
              <button
                onClick={() => openSwapLive(currentSlot.exerciseId)}
                className="text-xs text-dim hover:text-fg cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" /> заменить текущее
              </button>
            )}
            <button onClick={openAddLive} className="text-xs text-dim hover:text-fg cursor-pointer flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5" /> добавить упражнение
            </button>
          </div>
          {picker?.live && pickerBlock}
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
                    · цель{" "}
                    {exerciseMeasure(currentSlot.exerciseId) === "time"
                      ? timeTarget(currentSlot.repsMin, currentSlot.repsMax)
                      : `${currentSlot.repsMin}–${currentSlot.repsMax} повт`}
                  </span>
                </div>
              </div>
              <div className="ml-auto disp text-2xl shrink-0">
                {curEntry.sets.length + 1}
                <span className="text-dim text-base"> / {currentSlot.sets}</span>
              </div>
            </div>

            {(() => {
              const prev = lastWorkoutSetsFor(workouts, currentSlot.exerciseId, date);
              if (!prev) return null;
              const isTime = exerciseMeasure(currentSlot.exerciseId) === "time";
              const trend = progressSeries(workouts, currentSlot.exerciseId, isTime ? "time" : "e1rm")
                .filter((p) => p.date < date)
                .map((p) => p.value);
              return (
                <div className="text-xs text-dim mt-3 flex items-center">
                  прошлый раз: {prev.map(setChip).join(" · ")}
                  <Sparkline values={trend} />
                </div>
              );
            })()}

            {curEntry.sets.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-4">
                {curEntry.sets.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => updateEntry(currentSlot.exerciseId, (x) => ({ ...x, sets: x.sets.filter((_, j) => j !== i) }))}
                    className="bg-surface rounded-full px-3 py-1.5 text-xs disp cursor-pointer hover:text-danger transition-colors duration-150"
                    aria-label={`Подход ${i + 1}: ${setChip(s)}. Нажмите, чтобы удалить`}
                  >
                    {setChip(s)}
                  </button>
                ))}
              </div>
            )}

            {exerciseMeasure(currentSlot.exerciseId) === "time" ? (
              /* подход по времени: старт/стоп с живым счётом */
              <div className="mt-5">
                {setStart !== null ? (
                  <>
                    <div className="text-center">
                      <div className="disp text-6xl font-semibold text-accent">{fmtTime(now - setStart)}</div>
                      <div className="text-xs text-dim mt-1">идёт подход</div>
                    </div>
                    <button
                      onClick={stopTimedSet}
                      className="mt-5 w-full bg-accent hover:bg-accent-soft active:scale-[0.98] transition-all duration-150 text-accent-ink font-semibold rounded-full py-3.5 cursor-pointer"
                    >
                      Стоп — записать подход
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => saveLog({ ...log, setStartedAt: nowMs() })}
                    className="w-full bg-accent hover:bg-accent-soft active:scale-[0.98] transition-all duration-150 text-accent-ink font-semibold rounded-full py-3.5 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-5 h-5" /> Начать подход
                  </button>
                )}
              </div>
            ) : (
              <>
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
              </>
            )}
            {curEntry.sets.length > 0 ? (
              /* есть записанные подходы — не пропускаем (иначе потеряются), идём строго вперёд */
              nextSlotAfter(currentSlot.exerciseId) ? (
                <button
                  onClick={() => {
                    advanceFrom(currentSlot.exerciseId);
                    if (log.setStartedAt != null) saveLog({ ...log, setStartedAt: undefined });
                  }}
                  className="mt-3 w-full text-muted hover:text-fg transition-colors duration-150 rounded-full py-2 text-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Следующее упражнение <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={finish}
                  className="mt-3 w-full text-muted hover:text-fg transition-colors duration-150 rounded-full py-2 text-sm cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" /> Завершить тренировку
                </button>
              )
            ) : (
              <button
                onClick={() => {
                  saveLog({
                    ...log,
                    entries: log.entries.map((e) =>
                      e.exerciseId === currentSlot.exerciseId ? { ...e, skipped: true } : e
                    ),
                    setStartedAt: undefined,
                  });
                  advanceFrom(currentSlot.exerciseId);
                }}
                className="mt-3 w-full text-muted hover:text-fg transition-colors duration-150 rounded-full py-2 text-sm cursor-pointer flex items-center justify-center gap-1.5"
              >
                <SkipForward className="w-4 h-4" /> Пропустить упражнение
              </button>
            )}
          </section>
        ) : (
          (() => {
            const left = sessionSlots.filter(incompleteSlot);
            return (
              <section className="border-t border-line pt-6 text-center">
                <div className="disp text-2xl font-medium">
                  {left.length === 0 ? "Все упражнения выполнены" : "Дошли до конца списка"}
                </div>
                <p className="text-sm text-dim mt-2">
                  {left.length === 0
                    ? "Можно завершать — тренировка попадёт в активность дня."
                    : `Осталось незакрытых: ${left.length}. Вернитесь по кружку выше или завершайте.`}
                </p>
              </section>
            );
          })()
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
  /** Вся история: каждая тренировка отдельной строкой, в т.ч. несколько за один день. */
  const history = Object.values(workouts)
    .filter((w) => w.id !== log?.id && !!w.finishedAt)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.startedAt ?? "").localeCompare(a.startedAt ?? ""));

  return (
    <div className="space-y-10">
      <section>
        <div className="flex items-baseline justify-between">
          <div className="eyebrow">
            Зал{program.weeks > 1 ? ` · неделя ${week}` : ""}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setView("progress")}
              className="text-xs text-muted hover:text-fg cursor-pointer flex items-center gap-1.5"
              aria-label="Прогресс по упражнениям"
            >
              <LineChart className="w-3.5 h-3.5" /> Прогресс
            </button>
            <button
              onClick={() => setView("programs")}
              className="text-xs text-muted hover:text-fg cursor-pointer flex items-center gap-1.5"
            >
              <Settings2 className="w-3.5 h-3.5" /> {program.name}
            </button>
          </div>
        </div>
        {!isGymDay(date, weekdays) && !log && <p className="text-xs text-dim mt-1">сегодня по программе отдых</p>}

        {!log && (
          <>
            <div className="flex gap-2 mt-4 flex-wrap">
              {weekdays.map((d) => (
                <button
                  key={d}
                  onClick={() => {
                    setPick({ week, weekday: d });
                    setPicker(null);
                    setEditIdx(-1);
                  }}
                  className={`rounded-full px-4 py-2 text-xs font-semibold uppercase cursor-pointer transition-colors duration-150 ${
                    weekday === d ? "bg-fg text-canvas" : "bg-surface text-dim hover:text-muted"
                  }`}
                >
                  {RU_DAYS[d]}
                </button>
              ))}
              {program.weeks > 1 && (
                <button
                  onClick={() => {
                    setPick({ week: (week % program.weeks) + 1, weekday });
                    setPicker(null);
                    setEditIdx(-1);
                  }}
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
                  {planSlots.map((s, i) => (
                    <li key={s.exerciseId + i} className="border-b border-line py-3 first:border-t">
                      <div className="flex items-center gap-2">
                        <ExerciseIcon id={s.exerciseId} className="w-6 h-6 text-muted shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-sm truncate">{exerciseName(s.exerciseId)}</div>
                          <div className={`text-xs ${INTENSITY_STYLE[s.intensity]}`}>{s.intensity}</div>
                        </div>
                        <button
                          onClick={() => setEditIdx(editIdx === i ? -1 : i)}
                          className={`disp text-sm shrink-0 cursor-pointer ${editIdx === i ? "text-accent" : "text-muted hover:text-fg"}`}
                          aria-label={`Изменить подходы и повторы: ${exerciseName(s.exerciseId)}`}
                          aria-expanded={editIdx === i}
                        >
                          {exerciseMeasure(s.exerciseId) === "time"
                            ? `${s.sets > 1 ? `${s.sets}× ` : ""}${timeTarget(s.repsMin, s.repsMax)}`
                            : `${s.sets}×${s.repsMin}–${s.repsMax}`}
                        </button>
                        <button
                          onClick={() => (picker?.mode === "swap" && picker.index === i ? setPicker(null) : openSwap(i, s.exerciseId))}
                          className={`cursor-pointer p-1.5 shrink-0 ${
                            picker?.mode === "swap" && picker.index === i ? "text-accent" : "text-dim hover:text-fg"
                          }`}
                          aria-label={`Заменить упражнение: ${exerciseName(s.exerciseId)}`}
                        >
                          <ArrowLeftRight className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeSlot(i)}
                          className="text-dim hover:text-danger cursor-pointer p-1.5 shrink-0"
                          aria-label={`Убрать упражнение: ${exerciseName(s.exerciseId)}`}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      {editIdx === i &&
                        (() => {
                          const isTime = exerciseMeasure(s.exerciseId) === "time";
                          const u = slotUnit(i, s);
                          return (
                            <div className="flex items-center gap-2 mt-2.5 ml-8 text-xs flex-wrap">
                              <input
                                type="number"
                                inputMode="numeric"
                                value={s.sets}
                                onChange={(e) => setPlanSlot(i, (x) => ({ ...x, sets: Math.max(1, parseInt(e.target.value) || 1) }))}
                                className="w-12 bg-surface rounded-lg px-2 py-1.5 text-center disp"
                                aria-label="Подходы"
                              />
                              <span className="text-dim">×</span>
                              <input
                                type="number"
                                inputMode="numeric"
                                value={isTime ? fromSec(s.repsMin, u) : s.repsMin}
                                onChange={(e) => {
                                  const v = Math.max(1, parseInt(e.target.value) || 1);
                                  setPlanSlot(i, (x) => ({ ...x, repsMin: isTime ? toSec(v, u) : v }));
                                }}
                                className="w-12 bg-surface rounded-lg px-2 py-1.5 text-center disp"
                                aria-label="От"
                              />
                              <span className="text-dim">–</span>
                              <input
                                type="number"
                                inputMode="numeric"
                                value={isTime ? fromSec(s.repsMax, u) : s.repsMax}
                                onChange={(e) => {
                                  const v = Math.max(1, parseInt(e.target.value) || 1);
                                  setPlanSlot(i, (x) => ({ ...x, repsMax: isTime ? toSec(v, u) : v }));
                                }}
                                className="w-12 bg-surface rounded-lg px-2 py-1.5 text-center disp"
                                aria-label="До"
                              />
                              {isTime ? (
                                <button
                                  onClick={() => setEditUnits((m) => ({ ...m, [i]: u === "s" ? "m" : "s" }))}
                                  className="bg-raised hover:bg-raised-hover rounded-lg px-2.5 py-1.5 cursor-pointer transition-colors duration-150 text-fg"
                                  aria-label="Переключить единицы: секунды или минуты"
                                >
                                  {u === "m" ? "мин" : "сек"} ⇄
                                </button>
                              ) : (
                                <span className="text-dim">повт</span>
                              )}
                              <select
                                value={s.intensity}
                                onChange={(e) => setPlanSlot(i, (x) => ({ ...x, intensity: e.target.value as ProgramSlot["intensity"] }))}
                                className="bg-surface rounded-lg px-2 py-1.5 flex-1 min-w-0"
                                aria-label="Интенсивность"
                              >
                                {(["легкая", "средняя", "тяжелая"] as const).map((x) => (
                                  <option key={x}>{x}</option>
                                ))}
                              </select>
                            </div>
                          );
                        })()}

                      {picker?.mode === "swap" && picker.index === i && pickerBlock}
                    </li>
                  ))}
                </ul>

                {picker?.mode === "add" ? (
                  pickerBlock
                ) : (
                  !picker && (
                    <div className="flex items-center gap-4 mt-3">
                      <button onClick={openAdd} className="text-sm text-muted hover:text-fg cursor-pointer flex items-center gap-1.5">
                        <Plus className="w-4 h-4" /> добавить упражнение
                      </button>
                      {edited && (
                        <button
                          onClick={() => {
                            setPlan(null);
                            setPicker(null);
                          }}
                          className="text-xs text-dim hover:text-fg cursor-pointer flex items-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" /> вернуть план программы
                        </button>
                      )}
                    </div>
                  )
                )}

                {planSlots.length > 0 ? (
                  <button
                    onClick={start}
                    className="mt-6 w-full bg-accent hover:bg-accent-soft active:scale-[0.98] transition-all duration-150 text-accent-ink font-semibold rounded-full py-3.5 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Play className="w-5 h-5" /> {doneToday > 0 ? "Начать новую тренировку" : "Начать тренировку"}
                  </button>
                ) : (
                  <p className="text-sm text-dim mt-6">Добавьте хотя бы одно упражнение, чтобы начать.</p>
                )}
              </>
            ) : (
              <p className="text-sm text-dim mt-4">Для этого дня программы нет.</p>
            )}
          </>
        )}
      </section>

      {history.length > 0 && (
        <section>
          <div className="eyebrow">История</div>
          <ul className="mt-4">
            {history.map((w) => {
              const st = workoutStats(w);
              const open = historyOpen === w.id;
              const sameDay = history.filter((x) => x.date === w.date);
              /* нумеруем тренировки одного дня по времени начала */
              const dayNo =
                sameDay.length > 1
                  ? [...sameDay].sort((a, b) => (a.startedAt ?? "").localeCompare(b.startedAt ?? "")).findIndex((x) => x.id === w.id) + 1
                  : 0;
              return (
                <li key={w.id} className="border-b border-line py-3 first:border-t">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setHistoryOpen(open ? null : w.id)}
                      className="flex-1 min-w-0 flex items-center justify-between gap-3 cursor-pointer text-left"
                      aria-expanded={open}
                    >
                      <div className="min-w-0">
                        <div className="text-sm">
                          {fmtDate(w.date)}
                          {dayNo > 0 && <span className="text-dim"> · №{dayNo}</span>}
                        </div>
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
                      onClick={() => deleteWorkout(w)}
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
                              {e.sets.length ? (
                                <>
                                  {e.sets.map(setChip).join(" · ")}
                                  {e.skipped && <span className="text-dim"> · прервано</span>}
                                </>
                              ) : e.skipped ? (
                                <span className="text-dim">пропущено</span>
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
