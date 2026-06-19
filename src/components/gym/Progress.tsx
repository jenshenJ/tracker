import { useMemo, useState } from "react";
import { ChevronLeft, Info } from "lucide-react";
import type { WorkoutLog } from "../../types";
import { GROUP_LABEL, exerciseGroup, exerciseMeasure, exerciseName } from "../../constants/exercises";
import { exercisesWithHistory, fmtSeconds, progressSeries, type ProgressMetric, type ProgressPoint } from "../../lib/gym";
import { ExerciseIcon } from "../ExerciseIcons";

interface Props {
  workouts: Record<string, WorkoutLog>;
  onClose: () => void;
}

const METRIC_LABEL: Record<ProgressMetric, string> = {
  e1rm: "1ПМ",
  top: "Рабочий вес",
  volume: "Тоннаж",
  time: "Время",
};

/** Пояснение к каждой метрике — что она означает и как считается. */
const METRIC_INFO: Record<ProgressMetric, { title: string; text: string }> = {
  e1rm: {
    title: "1ПМ — оценка одноповторного максимума",
    text:
      "Это расчётная прикидка веса, который ты смог бы поднять всего на один раз. Точно его измерять травмоопасно, поэтому он оценивается по формуле Эпли: вес × (1 + повторы ÷ 30). За тренировку берётся самый сильный подход. Главный плюс — честное сравнение подходов с разным весом и числом повторов: например, 60 кг × 12 даёт 1ПМ ≈ 84 кг, а 70 кг × 3 — только ≈ 77 кг. Если этот показатель растёт — растёт сила, даже когда рабочие веса и повторы скачут.",
  },
  top: {
    title: "Рабочий вес",
    text: "Самый тяжёлый вес, поднятый в этом упражнении за тренировку. Простой и наглядный ориентир, но не учитывает, на сколько повторов он был сделан.",
  },
  volume: {
    title: "Тоннаж (объём)",
    text: "Сумма вес × повторы по всем подходам за тренировку. Показывает общий объём проделанной работы и выносливость, а не максимальную силу — растёт, когда делаешь больше подходов или повторов.",
  },
  time: {
    title: "Время",
    text: "Максимальная длительность подхода за тренировку — для упражнений на время: планка, кардио и т. п.",
  },
};

const round1 = (v: number) => Math.round(v * 10) / 10;

/** Подпись значения метрики. */
const fmtVal = (metric: ProgressMetric, v: number): string =>
  metric === "time" ? fmtSeconds(Math.round(v)) : metric === "volume" ? `${Math.round(v).toLocaleString("ru-RU")} кг` : `${round1(v)} кг`;

/** Маленький SVG-график динамики (в стиле графика веса). */
function Chart({ points, metric }: { points: ProgressPoint[]; metric: ProgressMetric }) {
  if (points.length === 0) return <p className="text-sm text-dim mt-6">Пока нет записанных подходов.</p>;

  const W = 340,
    H = 180,
    P = { l: 42, r: 10, t: 14, b: 24 };
  const vals = points.map((p) => p.value);
  let yMin = Math.min(...vals),
    yMax = Math.max(...vals);
  if (yMin === yMax) {
    yMin = yMin === 0 ? 0 : yMin * 0.9;
    yMax = yMax === 0 ? 1 : yMax * 1.1;
  }
  const single = points.length === 1;
  const t0 = new Date(points[0].date + "T12:00:00").getTime();
  const t1 = new Date(points[points.length - 1].date + "T12:00:00").getTime();
  const x = (d: string) =>
    single || t1 === t0
      ? P.l + (W - P.l - P.r) / 2
      : P.l + ((new Date(d + "T12:00:00").getTime() - t0) / (t1 - t0)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - (v - yMin) / (yMax - yMin)) * (H - P.t - P.b);
  const line = points.map((p) => `${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const grid = [yMax, (yMax + yMin) / 2, yMin];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-4" role="img" aria-label="График динамики упражнения">
      {grid.map((v, i) => (
        <g key={i}>
          <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="var(--color-line)" strokeWidth="1" />
          <text x={2} y={y(v) + 4} fill="var(--color-dim)" fontSize="10">
            {metric === "time" ? Math.round(v / (v >= 120 ? 60 : 1)) : metric === "volume" ? Math.round(v / 1000) + "т" : round1(v)}
          </text>
        </g>
      ))}
      {!single && (
        <polyline points={line} fill="none" stroke="var(--color-accent)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      )}
      {points.map((p, i) => (
        <circle key={i} cx={x(p.date)} cy={y(p.value)} r={single ? 4 : 2.5} fill="var(--color-accent)" />
      ))}
    </svg>
  );
}

/** Крошечный спарклайн тренда — для подсказки во время тренировки. */
export function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return null;
  const W = 56,
    H = 18;
  const min = Math.min(...values),
    max = Math.max(...values);
  const x = (i: number) => 1 + (i / (values.length - 1)) * (W - 2);
  const y = (v: number) => (max === min ? H / 2 : 2 + (1 - (v - min) / (max - min)) * (H - 4));
  const line = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const up = values[values.length - 1] >= values[0];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="inline-block align-middle ml-1.5" aria-hidden="true">
      <polyline points={line} fill="none" stroke={up ? "var(--color-accent)" : "var(--color-danger)"} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/** Экран «Прогресс»: выбор упражнения → метрика → график динамики + цифры. */
export function ProgressView({ workouts, onClose }: Props) {
  const exercises = useMemo(
    () =>
      exercisesWithHistory(workouts).sort((a, b) => {
        const ga = GROUP_LABEL[exerciseGroup(a) ?? "core"];
        const gb = GROUP_LABEL[exerciseGroup(b) ?? "core"];
        return ga.localeCompare(gb) || exerciseName(a).localeCompare(exerciseName(b));
      }),
    [workouts]
  );

  const [sel, setSel] = useState<string>(() => exercises[0] ?? "");
  const [metric, setMetric] = useState<ProgressMetric>("e1rm");
  const [showInfo, setShowInfo] = useState(false);

  if (exercises.length === 0)
    return (
      <div className="space-y-6">
        <Header onClose={onClose} />
        <p className="text-sm text-dim">Здесь появится динамика, когда накопятся записанные тренировки.</p>
      </div>
    );

  const isTime = exerciseMeasure(sel) === "time";
  const metrics: ProgressMetric[] = isTime ? ["time"] : ["e1rm", "top", "volume"];
  const m = metrics.includes(metric) ? metric : metrics[0];

  const series = progressSeries(workouts, sel, m);
  const cur = series[series.length - 1]?.value ?? null;
  const first = series[0]?.value ?? null;
  const pr = series.length ? Math.max(...series.map((p) => p.value)) : null;
  const deltaPct = cur != null && first != null && first > 0 ? Math.round(((cur - first) / first) * 100) : null;

  return (
    <div className="space-y-6">
      <Header onClose={onClose} />

      <select
        value={sel}
        onChange={(e) => setSel(e.target.value)}
        className="w-full bg-surface rounded-2xl px-4 py-3 text-sm"
        aria-label="Упражнение"
      >
        {exercises.map((id) => (
          <option key={id} value={id}>
            {exerciseName(id)} · {GROUP_LABEL[exerciseGroup(id) ?? "core"]}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-3">
        <ExerciseIcon id={sel} className="w-7 h-7 text-accent shrink-0" />
        <div className="disp text-xl font-medium">{exerciseName(sel)}</div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {metrics.length > 1 &&
          metrics.map((x) => (
            <button
              key={x}
              onClick={() => setMetric(x)}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold cursor-pointer transition-colors duration-150 ${
                m === x ? "bg-accent text-accent-ink" : "bg-surface text-dim hover:text-muted"
              }`}
            >
              {METRIC_LABEL[x]}
            </button>
          ))}
        <button
          onClick={() => setShowInfo((v) => !v)}
          className={`ml-auto cursor-pointer p-1.5 rounded-full transition-colors duration-150 ${
            showInfo ? "text-accent" : "text-dim hover:text-fg"
          }`}
          aria-label="Что означает эта метрика"
          aria-expanded={showInfo}
        >
          <Info className="w-4 h-4" />
        </button>
      </div>

      {showInfo && (
        <div className="bg-surface rounded-2xl p-4">
          <div className="text-sm font-medium">{METRIC_INFO[m].title}</div>
          <p className="text-xs text-dim leading-relaxed mt-1.5">{METRIC_INFO[m].text}</p>
        </div>
      )}

      <Chart points={series} metric={m} />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Сейчас" value={cur != null ? fmtVal(m, cur) : "—"} />
        <Stat
          label="Прогресс"
          value={deltaPct != null ? `${deltaPct > 0 ? "+" : ""}${deltaPct}%` : "—"}
          accent={deltaPct != null && deltaPct > 0}
        />
        <Stat label="Рекорд" value={pr != null ? fmtVal(m, pr) : "—"} />
      </div>
      <p className="text-xs text-dim">
        {series.length} {series.length === 1 ? "тренировка" : "тренировок"} с этим упражнением
      </p>
    </div>
  );
}

function Header({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="eyebrow">Прогресс</div>
      <button onClick={onClose} className="text-xs text-dim hover:text-fg cursor-pointer flex items-center gap-1">
        <ChevronLeft className="w-3.5 h-3.5" /> назад
      </button>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-surface rounded-2xl px-3 py-3">
      <div className="text-xs text-dim">{label}</div>
      <div className={`disp text-lg font-semibold mt-0.5 ${accent ? "text-accent" : ""}`}>{value}</div>
    </div>
  );
}
