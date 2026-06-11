import { Trash2, TrendingDown } from "lucide-react";
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
      adviceColor = "text-muted";
    } else if (pace > 1.3) {
      advice = `Темп ${pace.toFixed(1)} кг/нед — слишком быстро. Добавьте ~150 ккал, чтобы не терять мышцы и силы на футболе.`;
      adviceColor = "text-muted";
    } else {
      advice = `Темп ${pace.toFixed(1)} кг/нед — в коридоре. Нужно ${needPace.toFixed(1)} кг/нед до цели. Так держать.`;
      adviceColor = "text-accent";
    }
  }

  const milestones: Array<[string, string]> = [...MILESTONES, [profile.goalDate, `${profile.goalWeight} кг — финиш`]];

  return (
    <div className="space-y-10">
      <section>
        <div className="eyebrow">Вес</div>
        <div className="flex items-end justify-between mt-3">
          <div>
            <div className="disp text-6xl font-semibold leading-none">{last.toFixed(1)}</div>
            <div className="text-xs text-dim mt-1.5">сейчас, кг</div>
          </div>
          <div className="text-right">
            <div className="disp text-xl font-medium text-accent">−{Math.max(lost, 0).toFixed(1)}</div>
            <div className="text-xs text-dim">сброшено</div>
            <div className="disp text-xl font-medium mt-2">{Math.max(toGo, 0).toFixed(1)}</div>
            <div className="text-xs text-dim">до цели</div>
          </div>
        </div>
        <WeightChart profile={profile} entries={entries} />
        <div className={`text-sm mt-3 flex gap-2 items-start ${adviceColor}`}>
          <TrendingDown className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={1.6} /> <span>{advice}</span>
        </div>
      </section>

      <section>
        <div className="eyebrow">Контрольные точки</div>
        <ul className="mt-4">
          {milestones.map(([d, label]) => {
            const passed = todayStr() >= d;
            const avg = weeklyAvg(weights, d);
            const hit = passed && avg !== null && avg <= goalLineAt(profile, d) + 0.5;
            return (
              <li key={d} className="flex items-center justify-between border-b border-line py-3 first:border-t">
                <span className="text-sm text-muted">{fmtDate(d)}</span>
                <span className={`disp font-medium ${passed ? (hit ? "text-accent" : "text-danger") : "text-fg"}`}>{label}</span>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-dim mt-3">
          Осталось {daysLeft} дн. Если будете на 96–97 кг к финишу — это тоже победа, просто финиш сместится на пару недель.
        </p>
      </section>

      {entries.length > 0 && (
        <section>
          <div className="eyebrow">Последние записи</div>
          <ul className="mt-4">
            {entries
              .slice(-10)
              .reverse()
              .map(([d, v]) => (
                <li key={d} className="flex justify-between items-center border-b border-line py-2 text-sm first:border-t">
                  <span className="text-muted">{fmtDate(d)}</span>
                  <span className="flex items-center gap-1">
                    <b className="disp text-base font-medium">{v} кг</b>
                    <button
                      onClick={() => {
                        const n = { ...weights };
                        delete n[d];
                        saveWeights(n);
                      }}
                      className="text-dim hover:text-danger cursor-pointer p-2"
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
