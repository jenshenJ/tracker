import { useEffect, useMemo, useState } from "react";
import { Flame, Drumstick, Dumbbell, Scale, ClipboardList } from "lucide-react";
import type { DayLog, Profile, Totals, Weights } from "./types";
import { storage } from "./lib/storage";
import { todayStr, fmtDate } from "./lib/date";
import { foodStreak } from "./lib/stats";
import { Onboarding } from "./components/Onboarding";
import { TodayTab } from "./components/tabs/TodayTab";
import { FoodTab } from "./components/tabs/FoodTab";
import { GymTab } from "./components/tabs/GymTab";
import { WeightTab } from "./components/tabs/WeightTab";
import { PlanTab } from "./components/tabs/PlanTab";

type Tab = "today" | "food" | "gym" | "weight" | "plan";

const TABS: Array<[Tab, string, typeof Flame]> = [
  ["today", "Сегодня", Flame],
  ["food", "Еда", Drumstick],
  ["gym", "Зал", Dumbbell],
  ["weight", "Вес", Scale],
  ["plan", "План", ClipboardList],
];

export default function App() {
  const [tab, setTab] = useState<Tab>("today");
  const [date, setDate] = useState(todayStr());
  const [profile, setProfile] = useState<Profile | null>(() => storage.loadProfile());
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

  /* иконка под цель: iOS возьмёт её при добавлении на экран «Домой» */
  useEffect(() => {
    if (!profile) return;
    document
      .querySelector('link[rel="apple-touch-icon"]')
      ?.setAttribute("href", `/api/icon?goal=${profile.goalWeight}&size=192`);
  }, [profile]);

  /* серия дней с записанной едой; пересчитывается после каждой записи */
  const { streak, todayLogged } = useMemo(() => {
    const all = { ...storage.allDays(), ["day:" + date]: day };
    return {
      streak: foodStreak(all, todayStr()),
      todayLogged: (all["day:" + todayStr()]?.foods.length ?? 0) > 0,
    };
  }, [date, day]);

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

  /* первый запуск: профиль создаёт пользователь */
  if (!profile) {
    return (
      <Onboarding
        onComplete={(p) => {
          setProfile(p);
          storage.saveProfile(p);
        }}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-canvas text-fg">
      {/* отступы под чёлку (safe-area-top) и нижнее меню + home-индикатор */}
      <div
        className="max-w-md mx-auto px-5"
        style={{
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 1.5rem)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 7rem)",
        }}
      >
        <header className="flex items-end justify-between mb-8">
          <div>
            <div className="eyebrow">{fmtDate(date)}</div>
            <div className="disp text-2xl font-semibold leading-tight mt-1">{profile.goalWeight}</div>
          </div>
          <div className="flex items-center gap-3">
            {streak > 0 && (
              <span
                className={`flex items-center gap-1 disp text-base font-semibold ${todayLogged ? "text-accent" : "text-dim"}`}
                title={`Серия: ${streak} дн. с записанной едой${todayLogged ? "" : " — запишите еду сегодня, чтобы не сгорела"}`}
                aria-label={`Серия записи еды: ${streak} дней`}
              >
                <Flame className="w-4 h-4" fill={todayLogged ? "currentColor" : "none"} /> {streak}
              </span>
            )}
            <input
              type="date"
              value={date}
              max={todayStr()}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent border-b border-line px-1 py-1 text-sm text-muted"
              aria-label="Выбрать дату"
            />
          </div>
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
            goToGym={() => setTab("gym")}
          />
        )}
        {tab === "food" && <FoodTab day={day} saveDay={saveDay} totals={totals} profile={profile} />}
        {tab === "gym" && <GymTab date={date} day={day} saveDay={saveDay} />}
        {tab === "weight" && <WeightTab profile={profile} weights={weights} saveWeights={saveWeights} />}
        {tab === "plan" && <PlanTab profile={profile} saveProfile={saveProfile} weights={weights} />}
      </div>

      <nav
        className="fixed bottom-0 left-0 right-0 border-t border-line"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          background: "rgba(10,10,10,0.85)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div className="max-w-md mx-auto grid grid-cols-5">
          {TABS.map(([id, label, Icon]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex flex-col items-center gap-1 py-3 cursor-pointer transition-colors duration-150 ${
                tab === id ? "text-accent" : "text-dim hover:text-muted"
              }`}
              aria-label={label}
              aria-current={tab === id ? "page" : undefined}
            >
              <Icon className="w-5 h-5" strokeWidth={tab === id ? 2.2 : 1.6} />
              <span className="text-[11px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
