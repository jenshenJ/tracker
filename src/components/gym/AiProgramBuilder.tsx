import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import type { Intensity, ProgramDay, WorkoutProgram } from "../../types";
import { EXERCISE_CATALOG, exerciseById, findExerciseByName } from "../../constants/exercises";
import { AiError, askAi } from "../../lib/ai";
import { programBuilderPrompt } from "../../lib/prompts";

interface Props {
  onResult: (p: WorkoutProgram) => void;
  onCancel: () => void;
}

const GOALS = ["Сброс жира", "Набор массы", "Сила", "Общая форма"];
const LEVELS = ["Новичок", "Средний", "Опытный"];
const EQUIPMENT = ["Полный зал", "Гантели и турник", "Только своё тело"];

const INTENSITIES = new Set<Intensity>(["легкая", "средняя", "тяжелая"]);

interface RawSlot {
  exerciseId?: string;
  name?: string;
  intensity?: string;
  sets?: number;
  repsMin?: number;
  repsMax?: number;
}
interface RawProgram {
  name?: string;
  weeks?: number;
  days?: Array<{ week?: number; weekday?: number; slots?: RawSlot[] }>;
}

/** Валидация ответа AI: чужие id маппим по названию, мусор выбрасываем. */
function sanitize(raw: RawProgram): WorkoutProgram | null {
  const days: ProgramDay[] = [];
  for (const d of raw.days ?? []) {
    const weekday = typeof d.weekday === "number" && d.weekday >= 0 && d.weekday <= 6 ? d.weekday : null;
    if (weekday === null) continue;
    const slots = (d.slots ?? [])
      .map((s) => {
        let id = s.exerciseId && exerciseById(s.exerciseId) ? s.exerciseId : undefined;
        if (!id && s.name) id = findExerciseByName(s.name)?.id;
        if (!id && s.exerciseId) id = findExerciseByName(s.exerciseId)?.id;
        if (!id) return null;
        return {
          exerciseId: id,
          intensity: INTENSITIES.has(s.intensity as Intensity) ? (s.intensity as Intensity) : ("средняя" as Intensity),
          sets: Math.min(Math.max(Math.round(s.sets ?? 3), 1), 10),
          repsMin: Math.min(Math.max(Math.round(s.repsMin ?? 8), 1), 100),
          repsMax: Math.min(Math.max(Math.round(s.repsMax ?? 12), 1), 120),
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
    if (slots.length) days.push({ week: d.week === 2 ? 2 : 1, weekday, slots });
  }
  if (!days.length) return null;
  const weeks = days.some((d) => d.week === 2) ? 2 : 1;
  return {
    id: "custom-" + Date.now(),
    name: (raw.name ?? "Программа от AI").slice(0, 60),
    weeks,
    days,
  };
}

function Pills({ options, value, onPick }: { options: string[]; value: string; onPick: (v: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap mt-2">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onPick(o)}
          className={`rounded-full px-4 py-2 text-xs font-semibold cursor-pointer transition-colors duration-150 ${
            value === o ? "bg-accent text-accent-ink" : "bg-surface text-dim hover:text-muted"
          }`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}

/** Анкета → AI собирает программу из каталога. */
export function AiProgramBuilder({ onResult, onCancel }: Props) {
  const [goal, setGoal] = useState(GOALS[0]);
  const [level, setLevel] = useState(LEVELS[0]);
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [equipment, setEquipment] = useState(EQUIPMENT[0]);
  const [restrictions, setRestrictions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const build = async () => {
    setLoading(true);
    setError("");
    try {
      const catalog = EXERCISE_CATALOG.map((x) => `${x.id} — ${x.name}`).join("\n");
      const text = await askAi(programBuilderPrompt({ goal, level, daysPerWeek, equipment, restrictions }, catalog), 2000);
      const clean = text.replace(/```json|```/g, "").trim();
      const program = sanitize(JSON.parse(clean) as RawProgram);
      if (!program) throw new AiError("Не удалось собрать программу из ответа.");
      onResult(program);
    } catch (e) {
      console.error(e);
      setError(e instanceof AiError ? e.message : "Не получилось собрать программу. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-7">
      <div className="flex items-baseline justify-between">
        <div className="eyebrow">AI-конструктор программы</div>
        <button onClick={onCancel} className="text-xs text-dim hover:text-fg cursor-pointer">
          отмена
        </button>
      </div>

      <div>
        <span className="text-sm text-body">Цель</span>
        <Pills options={GOALS} value={goal} onPick={setGoal} />
      </div>
      <div>
        <span className="text-sm text-body">Опыт</span>
        <Pills options={LEVELS} value={level} onPick={setLevel} />
      </div>
      <div>
        <span className="text-sm text-body">Тренировок в неделю</span>
        <div className="flex gap-2 mt-2">
          {[2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setDaysPerWeek(n)}
              className={`w-11 h-11 rounded-full disp font-semibold cursor-pointer transition-colors duration-150 ${
                daysPerWeek === n ? "bg-accent text-accent-ink" : "bg-surface text-dim hover:text-muted"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div>
        <span className="text-sm text-body">Оборудование</span>
        <Pills options={EQUIPMENT} value={equipment} onPick={setEquipment} />
      </div>
      <div>
        <span className="text-sm text-body">Ограничения</span>
        <textarea
          value={restrictions}
          onChange={(e) => setRestrictions(e.target.value)}
          rows={2}
          placeholder="например: без осевой нагрузки, болит левое плечо…"
          className="w-full bg-surface rounded-2xl px-4 py-3 text-sm resize-none mt-2"
          aria-label="Ограничения"
        />
      </div>

      <button
        onClick={build}
        disabled={loading}
        className="w-full bg-accent hover:bg-accent-soft disabled:opacity-50 active:scale-[0.98] transition-all duration-150 text-accent-ink font-semibold rounded-full py-3.5 flex items-center justify-center gap-2 cursor-pointer"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
        {loading ? "Собираю…" : "Собрать программу"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
