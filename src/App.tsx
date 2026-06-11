import { useMemo, useState } from "react";
import { Flame, Drumstick, Scale, ClipboardList } from "lucide-react";
import type { DayLog, Profile, Totals, Weights } from "./types";
import { storage } from "./lib/storage";
import { todayStr, fmtDate } from "./lib/date";
import { TodayTab } from "./components/tabs/TodayTab";
import { FoodTab } from "./components/tabs/FoodTab";
import { WeightTab } from "./components/tabs/WeightTab";
import { PlanTab } from "./components/tabs/PlanTab";

type Tab = "today" | "food" | "weight" | "plan";

const TABS: Array<[Tab, string, typeof Flame]> = [
  ["today", "Сегодня", Flame],
  ["food", "Еда", Drumstick],
  ["weight", "Вес", Scale],
  ["plan", "План", ClipboardList],
];

export default function App() {
  const [tab, setTab] = useState<Tab>("today");
  const [date, setDate] = useState(todayStr());
  const [profile, setProfile] = useState<Profile>(() => storage.loadProfile());
  const [weights, setWeights] = useState<Weights>(() => storage.loadWeights());

  /* день выводится из даты; правки живут в override — без setState в эффектах */
  const storedDay = useMemo(() => storage.loadDay(date), [date]);
  const [dayOverride, setDayOverride] = useState<{ date: string; day: DayLog } | null>(null);
  const day = dayOverride?.date === date ? dayOverride.day : storedDay;

  const saveDay = (next: DayLog) => {
    setDayOverride({ date, day: next });
    storage.saveDay(date, next);
  };
  const saveWeights = (next: Weights) => {
    setWeights(next);
    storage.saveWeights(next);
  };
  const saveProfile = (next: Profile) => {
    setProfile(next);
    storage.saveProfile(next);
  };

  const totals = useMemo<Totals>(() => {
    const t: Totals = { kcal: 0, p: 0, f: 0, c: 0 };
    for (const f of day.foods) {
      t.kcal += f.kcal;
      t.p += f.p;
      t.f += f.f;
      t.c += f.c;
    }
    return t;
  }, [day]);

  return (
    <div className="min-h-dvh bg-canvas text-fg">
      <div className="max-w-md mx-auto pb-28 px-4 pt-5">
        <header className="flex items-end justify-between mb-4">
          <div>
            <div className="disp text-3xl font-bold leading-none uppercase">Путь к 95</div>
            <div className="text-muted text-sm mt-1">{fmtDate(date)}</div>
          </div>
          <input
            type="date"
            value={date}
            max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            className="bg-surface border border-line rounded-lg px-2 py-1.5 text-sm text-fg"
            aria-label="Выбрать дату"
          />
        </header>

        {tab === "today" && (
          <TodayTab
            profile={profile}
            totals={totals}
            day={day}
            saveDay={saveDay}
            weights={weights}
            saveWeights={saveWeights}
            date={date}
            goToFood={() => setTab("food")}
          />
        )}
        {tab === "food" && <FoodTab day={day} saveDay={saveDay} totals={totals} profile={profile} />}
        {tab === "weight" && <WeightTab profile={profile} weights={weights} saveWeights={saveWeights} />}
        {tab === "plan" && <PlanTab profile={profile} saveProfile={saveProfile} />}
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 bg-surface border-t border-line"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="max-w-md mx-auto grid grid-cols-4">
          {TABS.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-col items-center gap-1 py-2.5 cursor-pointer transition-colors duration-150 ${
                tab === id ? "text-orange-500" : "text-muted hover:text-fg"
              }`}
              aria-label={label}
            >
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
