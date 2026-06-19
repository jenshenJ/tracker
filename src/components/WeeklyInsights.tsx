import { useMemo, useState } from "react";
import { Dumbbell, Flame, Scale, TrendingDown, TrendingUp, MoveRight } from "lucide-react";
import type { DayLog, Profile, Weights } from "../types";
import { todayStr } from "../lib/date";
import { weeklyReport } from "../lib/stats";
import { storage } from "../lib/storage";

interface Props {
  profile: Profile;
  weights: Weights;
  /** Дневник за выбранную дату — как триггер пересчёта после записи еды. */
  day: DayLog;
}

const r0 = (n: number) => Math.round(n);
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}`;

/** Доступные периоды сводки: [дней, подпись]. */
const PERIODS: Array<[number, string]> = [
  [7, "Неделя"],
  [30, "Месяц"],
  [90, "3 мес"],
];

/** Сводка за выбранный период: калории, тренд веса, нагрузка в зале. */
export function WeeklyInsights({ profile, weights, day }: Props) {
  const [windowDays, setWindowDays] = useState(() => storage.loadInsightsDays());

  const changePeriod = (d: number) => {
    setWindowDays(d);
    storage.saveInsightsDays(d);
  };

  const rep = useMemo(
    () => weeklyReport(storage.allDays(), weights, storage.loadWorkouts(), profile, todayStr(), windowDays),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [profile, weights, day, windowDays],
  );

  /* нечего показывать, пока совсем нет данных */
  if (rep.loggedDays === 0 && rep.weightDelta === null && rep.workouts === 0) return null;

  /* вес: цвет под цель */
  const wd = rep.weightDelta;
  let weightColor = "text-muted";
  if (wd !== null) {
    if (profile.goal === "cut") weightColor = wd < -0.05 ? "text-accent" : wd > 0.2 ? "text-danger" : "text-muted";
    else if (profile.goal === "bulk") weightColor = wd > 0.05 ? "text-accent" : "text-muted";
    else weightColor = Math.abs(wd) <= 0.3 ? "text-accent" : "text-muted";
  }
  const WeightIcon = profile.goal === "bulk" ? TrendingUp : profile.goal === "recomp" ? MoveRight : TrendingDown;

  /* калории: «в цель», если среднее отклонение ≤100 ккал/день */
  const kd = rep.kcalDelta;
  const kcalColor = kd === null ? "text-muted" : Math.abs(kd) <= 100 ? "text-accent" : "text-muted";

  /* зал: динамика тоннажа против прошлой недели */
  const volPct =
    rep.volumePrev > 0 ? Math.round(((rep.volume - rep.volumePrev) / rep.volumePrev) * 100) : null;
  const gymColor = volPct === null ? "text-muted" : volPct >= 0 ? "text-accent" : "text-muted";

  const periodLabel = (PERIODS.find(([d]) => d === windowDays)?.[1] ?? `${windowDays} дн`).toLowerCase();

  return (
    <section>
      <div className="flex items-center justify-between gap-3">
        <div className="eyebrow">Сводка · {periodLabel}</div>
        <div className="flex gap-1 bg-surface rounded-full p-1" role="group" aria-label="Период сводки">
          {PERIODS.map(([d, label]) => (
            <button
              key={d}
              onClick={() => changePeriod(d)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors duration-150 cursor-pointer ${
                windowDays === d ? "bg-accent text-accent-ink" : "text-dim hover:text-muted"
              }`}
              aria-pressed={windowDays === d}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <ul className="mt-4">
        {/* калории */}
        <li className="flex items-center gap-3 border-b border-line py-3.5 first:border-t">
          <Flame className="w-4 h-4 text-accent shrink-0" strokeWidth={1.6} />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-muted">Калории · ср./день</div>
            <div className="text-xs text-dim">{rep.loggedDays} из {windowDays} дней с записями</div>
          </div>
          <div className="text-right shrink-0">
            <div className="disp text-base font-medium">{rep.avgKcal === null ? "—" : r0(rep.avgKcal)}</div>
            <div className={`text-xs ${kcalColor}`}>
              {kd === null ? `цель ${rep.kcalTarget}` : `${signed(r0(kd))} от цели`}
            </div>
          </div>
        </li>

        {/* вес */}
        <li className="flex items-center gap-3 border-b border-line py-3.5">
          <Scale className="w-4 h-4 text-accent shrink-0" strokeWidth={1.6} />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-muted">Вес · за период</div>
            <div className="text-xs text-dim">по среднему утреннему</div>
          </div>
          <div className={`flex items-center gap-1.5 shrink-0 ${weightColor}`}>
            <WeightIcon className="w-4 h-4" strokeWidth={1.6} />
            <span className="disp text-base font-medium">
              {wd === null ? "—" : `${signed(Math.round(wd * 10) / 10)} кг`}
            </span>
          </div>
        </li>

        {/* зал */}
        <li className="flex items-center gap-3 border-b border-line py-3.5">
          <Dumbbell className="w-4 h-4 text-accent shrink-0" strokeWidth={1.6} />
          <div className="flex-1 min-w-0">
            <div className="text-sm text-muted">Зал · тренировок</div>
            <div className="text-xs text-dim">{rep.volume > 0 ? `тоннаж ${r0(rep.volume).toLocaleString("ru")} кг` : "силовых записей нет"}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="disp text-base font-medium">{rep.workouts}</div>
            {volPct !== null && <div className={`text-xs ${gymColor}`}>{signed(volPct)}% тоннаж</div>}
          </div>
        </li>
      </ul>
    </section>
  );
}
