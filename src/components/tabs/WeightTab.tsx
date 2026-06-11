import { Trash2, TrendingDown, TrendingUp, MoveRight } from "lucide-react";
import type { Profile, Weights } from "../../types";
import { daysBetween, dstr, fmtDate, todayStr } from "../../lib/date";
import { goalLineAt, lastKnownWeight, milestones, weeklyAvg } from "../../lib/stats";
import { WeightChart } from "../WeightChart";

interface Props {
  profile: Profile;
  weights: Weights;
  saveWeights: (w: Weights) => void;
}

export function WeightTab({ profile, weights, saveWeights }: Props) {
  const entries = Object.entries(weights).sort((a, b) => a[0].localeCompare(b[0]));
  const last = lastKnownWeight(weights) ?? profile.startWeight;
  const delta = last - profile.startWeight; // + набрано, − сброшено
  const toGo = Math.abs(last - profile.goalWeight);
  const daysLeft = Math.max(daysBetween(todayStr(), profile.goalDate), 0);

  const avgNow = weeklyAvg(weights, todayStr());
  const prev = new Date();
  prev.setDate(prev.getDate() - 7);
  const avgPrev = weeklyAvg(weights, dstr(prev));
  /** Δ за неделю: + набирает, − сбрасывает. */
  const weeklyDelta = avgNow && avgPrev ? avgNow - avgPrev : null;
  /** Нужный темп (кг/нед, со знаком) до цели. */
  const needPace = daysLeft > 0 ? ((profile.goalWeight - last) / daysLeft) * 7 : 0;

  let advice = "Записывайте вес каждое утро — через неделю появится темп и рекомендации.";
  let adviceColor = "text-muted";
  if (weeklyDelta !== null) {
    if (profile.goal === "cut") {
      const lose = -weeklyDelta;
      const need = -needPace;
      if (lose < need - 0.2)
        advice = `Темп −${lose.toFixed(1)} кг/нед — медленнее нужного (−${need.toFixed(1)}). Минус 150–200 ккал от нормы или +2000 шагов в день.`;
      else if (lose > 1.3)
        advice = `Темп −${lose.toFixed(1)} кг/нед — слишком быстро. Добавьте ~150 ккал, чтобы не терять мышцы.`;
      else {
        advice = `Темп −${lose.toFixed(1)} кг/нед — в коридоре. Нужно −${need.toFixed(1)} кг/нед до цели. Так держать.`;
        adviceColor = "text-accent";
      }
    } else if (profile.goal === "bulk") {
      const gain = weeklyDelta;
      const need = needPace;
      if (gain < need - 0.1)
        advice = `Темп +${Math.max(0, gain).toFixed(1)} кг/нед — медленнее нужного (+${need.toFixed(1)}). Добавьте 150–200 ккал.`;
      else if (gain > 0.5)
        advice = `Темп +${gain.toFixed(1)} кг/нед — слишком быстро, лишнее уйдёт в жир. Уберите 100–150 ккал.`;
      else {
        advice = `Темп +${gain.toFixed(1)} кг/нед — в коридоре чистого набора. Так держать.`;
        adviceColor = "text-accent";
      }
    } else {
      if (Math.abs(weeklyDelta) <= 0.3) {
        advice = `Вес стабилен (${weeklyDelta >= 0 ? "+" : ""}${weeklyDelta.toFixed(1)} кг/нед) — рекомпозиция идёт. Прогресс смотрим по весам в зале и замерам.`;
        adviceColor = "text-accent";
      } else
        advice = `Вес плывёт на ${weeklyDelta > 0 ? "+" : ""}${weeklyDelta.toFixed(1)} кг/нед. Для рекомпозиции держим ±0.3: скорректируйте 100–150 ккал.`;
    }
  }

  const TrendIcon = profile.goal === "bulk" ? TrendingUp : profile.goal === "recomp" ? MoveRight : TrendingDown;
  const deltaLabel = profile.goal === "bulk" ? "набрано" : profile.goal === "recomp" ? "изменение" : "сброшено";
  const deltaShown =
    profile.goal === "bulk" ? Math.max(delta, 0) : profile.goal === "recomp" ? delta : Math.max(-delta, 0);
  const deltaSign = profile.goal === "recomp" ? (delta > 0 ? "+" : delta < 0 ? "−" : "±") : profile.goal === "bulk" ? "+" : "−";

  const hitMilestone = (d: string) => {
    const avg = weeklyAvg(weights, d);
    if (avg === null) return false;
    const line = goalLineAt(profile, d);
    if (profile.goal === "recomp") return Math.abs(avg - line) <= 0.7;
    return profile.goal === "bulk" ? avg >= line - 0.5 : avg <= line + 0.5;
  };

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
            <div className="disp text-xl font-medium text-accent">
              {deltaSign}
              {Math.abs(deltaShown).toFixed(1)}
            </div>
            <div className="text-xs text-dim">{deltaLabel}</div>
            <div className="disp text-xl font-medium mt-2">{toGo.toFixed(1)}</div>
            <div className="text-xs text-dim">до цели</div>
          </div>
        </div>
        <WeightChart profile={profile} entries={entries} />
        <div className={`text-sm mt-3 flex gap-2 items-start ${adviceColor}`}>
          <TrendIcon className="w-4 h-4 mt-0.5 shrink-0" strokeWidth={1.6} /> <span>{advice}</span>
        </div>
      </section>

      <section>
        <div className="eyebrow">Контрольные точки</div>
        <ul className="mt-4">
          {milestones(profile).map(([d, label]) => {
            const passed = todayStr() >= d;
            const hit = passed && hitMilestone(d);
            return (
              <li key={d} className="flex items-center justify-between border-b border-line py-3 first:border-t">
                <span className="text-sm text-muted">{fmtDate(d)}</span>
                <span className={`disp font-medium ${passed ? (hit ? "text-accent" : "text-danger") : "text-fg"}`}>{label}</span>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-dim mt-3">
          Осталось {daysLeft} дн. Небольшое отставание от плана — не провал, просто финиш сместится на пару недель.
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
