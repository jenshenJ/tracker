import { CalendarDays, Target, Trash2, TrendingDown } from "lucide-react";
import type { Profile, Weights } from "../../types";
import { MILESTONES } from "../../constants";
import { daysBetween, dstr, fmtDate, todayStr } from "../../lib/date";
import { goalLineAt, weeklyAvg } from "../../lib/stats";
import { WeightChart } from "../WeightChart";

interface Props {
  profile: Profile;
  weights: Weights;
  saveWeights: (w: Weights) => void;
}

export function WeightTab({ profile, weights, saveWeights }: Props) {
  const entries = Object.entries(weights).sort((a, b) => a[0].localeCompare(b[0]));
  const last = entries.length ? entries[entries.length - 1][1] : profile.startWeight;
  const lost = profile.startWeight - last;
  const toGo = last - profile.goalWeight;
  const daysLeft = Math.max(daysBetween(todayStr(), profile.goalDate), 0);

  const avgNow = weeklyAvg(weights, todayStr());
  const prev = new Date();
  prev.setDate(prev.getDate() - 7);
  const avgPrev = weeklyAvg(weights, dstr(prev));
  const pace = avgNow && avgPrev ? avgPrev - avgNow : null;
  const needPace = daysLeft > 0 ? (toGo / daysLeft) * 7 : 0;

  let advice = "Записывайте вес каждое утро — через неделю появится темп и рекомендации.";
  let adviceColor = "text-muted";
  if (pace !== null) {
    if (pace < needPace - 0.2) {
      advice = `Темп ${pace.toFixed(1)} кг/нед — медленнее нужного (${needPace.toFixed(1)}). Минус 150–200 ккал от нормы или +2000 шагов в день.`;
      adviceColor = "text-orange-400";
    } else if (pace > 1.3) {
      advice = `Темп ${pace.toFixed(1)} кг/нед — слишком быстро. Добавьте ~150 ккал, чтобы не терять мышцы и силы на футболе.`;
      adviceColor = "text-orange-400";
    } else {
      advice = `Темп ${pace.toFixed(1)} кг/нед — в коридоре. Нужно ${needPace.toFixed(1)} кг/нед до цели. Так держать.`;
      adviceColor = "text-green-400";
    }
  }

  const milestones: Array<[string, string]> = [...MILESTONES, [profile.goalDate, `${profile.goalWeight} кг — финиш`]];

  return (
    <div className="space-y-4">
      <section className="bg-surface rounded-2xl p-4 border border-line">
        <div className="grid grid-cols-3 text-center gap-2">
          <div>
            <div className="text-xs text-muted">Сейчас</div>
            <div className="disp text-2xl font-bold">{last.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-xs text-muted">Сброшено</div>
            <div className="disp text-2xl font-bold text-green-400">−{Math.max(lost, 0).toFixed(1)}</div>
          </div>
          <div>
            <div className="text-xs text-muted">До цели</div>
            <div className="disp text-2xl font-bold text-orange-400">{Math.max(toGo, 0).toFixed(1)}</div>
          </div>
        </div>
        <WeightChart profile={profile} entries={entries} />
        <div className={`text-sm mt-2 flex gap-2 items-start ${adviceColor}`}>
          <TrendingDown className="w-4 h-4 mt-0.5 shrink-0" /> <span>{advice}</span>
        </div>
      </section>

      <section className="bg-surface rounded-2xl p-4 border border-line">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-orange-500" />
          <span className="text-muted text-sm font-medium">Контрольные точки</span>
        </div>
        <ul className="space-y-2">
          {milestones.map(([d, label]) => {
            const passed = todayStr() >= d;
            const avg = weeklyAvg(weights, d);
            const hit = passed && avg !== null && avg <= goalLineAt(profile, d) + 0.5;
            return (
              <li key={d} className="flex items-center justify-between bg-canvas rounded-xl px-3 py-2.5">
                <span className="text-sm flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-dim" /> {fmtDate(d)}
                </span>
                <span className={`disp font-semibold ${passed ? (hit ? "text-green-400" : "text-orange-400") : "text-body"}`}>
                  {label}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-dim mt-3">
          Осталось {daysLeft} дн. Если будете на 96–97 кг к финишу — это тоже победа, просто финиш сместится на пару недель.
        </p>
      </section>

      {entries.length > 0 && (
        <section className="bg-surface rounded-2xl p-4 border border-line">
          <span className="text-muted text-sm font-medium">Последние записи</span>
          <ul className="mt-2 space-y-1.5">
            {entries
              .slice(-10)
              .reverse()
              .map(([d, v]) => (
                <li key={d} className="flex justify-between items-center bg-canvas rounded-xl px-3 py-2 text-sm">
                  <span className="text-muted">{fmtDate(d)}</span>
                  <span className="flex items-center gap-2">
                    <b className="disp text-base">{v} кг</b>
                    <button
                      onClick={() => {
                        const n = { ...weights };
                        delete n[d];
                        saveWeights(n);
                      }}
                      className="text-dim hover:text-red-400 cursor-pointer p-2"
                      aria-label="Удалить запись веса"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </span>
                </li>
              ))}
          </ul>
        </section>
      )}
    </div>
  );
}
