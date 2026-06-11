import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Flame, Drumstick, Dumbbell, Scale, CalendarDays, Search, Plus, Trash2,
  TrendingDown, Target, Loader2, Sparkles, ClipboardList, ChevronRight, X, Footprints, ChefHat, Download, Upload
} from "lucide-react";

/* ───────────────────────── helpers ───────────────────────── */


/* ── автономное хранилище: localStorage с тем же API, что window.storage ── */
const LS = {
  async get(k) { const v = localStorage.getItem("t95:" + k); return v == null ? null : { key: k, value: v }; },
  async set(k, v) { localStorage.setItem("t95:" + k, v); return { key: k, value: v }; },
  async delete(k) { localStorage.removeItem("t95:" + k); return { key: k, deleted: true }; },
  async list(prefix = "") {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("t95:" + prefix)) keys.push(k.slice(4));
    }
    return { keys };
  },
};
const storageApi = typeof window !== "undefined" && window.storage ? window.storage : LS;

const getApiKey = () => { try { return localStorage.getItem("t95:apikey") || ""; } catch { return ""; } };
const setApiKey = (v) => { try { localStorage.setItem("t95:apikey", v.trim()); } catch {} };
const AI_HEADERS = () => ({
  "Content-Type": "application/json",
  "x-api-key": getApiKey(),
  "anthropic-version": "2023-06-01",
  "anthropic-dangerous-direct-browser-access": "true",
});

const pad = (n) => String(n).padStart(2, "0");
const dstr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const todayStr = () => dstr(new Date());
const RU_DAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const RU_MON = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const fmtDate = (s) => {
  const d = new Date(s + "T12:00:00");
  return `${RU_DAYS[d.getDay()]}, ${d.getDate()} ${RU_MON[d.getMonth()]}`;
};
const daysBetween = (a, b) =>
  Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);

const DEFAULT_PROFILE = {
  startDate: "2026-06-11",
  startWeight: 114,
  goalWeight: 95,
  goalDate: "2026-11-03",
  kcalTarget: 2350,
  proteinTarget: 185,
  /* график тренировок: 0=вс … 6=сб; null | "gym" | "foot" */
  schedule: { 0: null, 1: "gym", 2: null, 3: "gym", 4: null, 5: "gym", 6: "foot" },
};
const SCHED_LABEL = { gym: "Зал", foot: "Футбол" };

async function stGet(key, fallback) {
  try {
    const r = await storageApi.get(key);
    return r ? JSON.parse(r.value) : fallback;
  } catch {
    return fallback;
  }
}
async function stSet(key, val) {
  try {
    await storageApi.set(key, JSON.stringify(val));
  } catch (e) {
    console.error("storage", e);
  }
}

/* встроенная база частых продуктов, на 100 г */
const FOOD_DB = [
  ["Куриная грудка (сырая)", 113, 23.6, 1.9, 0.4],
  ["Куриная грудка (запечённая)", 148, 30, 3, 0],
  ["Индейка филе", 114, 24, 1.5, 0],
  ["Говядина постная", 187, 19, 12, 0],
  ["Лосось", 208, 20, 13, 0],
  ["Треска / белая рыба", 82, 18, 0.7, 0],
  ["Яйцо куриное (1 шт ≈ 55 г)", 157, 12.7, 11.5, 0.7],
  ["Творог 5%", 121, 17, 5, 1.8],
  ["Творог обезжиренный", 71, 16.5, 0.2, 1.3],
  ["Протеин (порция 30 г)", 380, 75, 5, 8],
  ["Греческий йогурт 2%", 73, 10, 2, 4],
  ["Молоко 2.5%", 52, 2.8, 2.5, 4.7],
  ["Гречка (сухая)", 343, 13, 3.4, 68],
  ["Гречка (варёная)", 110, 4.2, 1.1, 21],
  ["Рис (сухой)", 360, 7, 1, 78],
  ["Рис (варёный)", 130, 2.7, 0.3, 28],
  ["Овсянка (сухая)", 366, 12, 7, 62],
  ["Макароны тв. сортов (сухие)", 350, 12, 1.5, 71],
  ["Картофель (варёный)", 82, 2, 0.1, 17],
  ["Хлеб цельнозерновой", 250, 9, 3.5, 45],
  ["Банан (1 шт ≈ 120 г)", 96, 1.5, 0.2, 22],
  ["Яблоко (1 шт ≈ 180 г)", 52, 0.3, 0.2, 14],
  ["Овощи (огурец/помидор/салат)", 22, 1, 0.2, 4],
  ["Овощи тушёные", 60, 2, 2.5, 8],
  ["Масло оливковое (1 ст.л ≈ 15 г)", 898, 0, 99.8, 0],
  ["Сыр твёрдый", 360, 25, 28, 1],
  ["Орехи грецкие", 654, 15, 65, 11],
  ["Авокадо", 160, 2, 15, 9],
  ["Шоколад тёмный", 540, 6, 35, 48],
];

const MEALS = ["Завтрак", "Обед", "Перекус", "Ужин"];
const defaultMeal = () => {
  const h = new Date().getHours();
  if (h < 11) return "Завтрак";
  if (h < 15) return "Обед";
  if (h < 18) return "Перекус";
  return "Ужин";
};

const ACT_TYPES = [
  { id: "gym", label: "Зал", kc: 6 },
  { id: "foot", label: "Футбол", kc: 9 },
  { id: "walk", label: "Ходьба", kc: 4 },
  { id: "other", label: "Другое", kc: 5 },
];

/* линия цели: вес по плану на дату */
function goalLineAt(profile, dateS) {
  const total = daysBetween(profile.startDate, profile.goalDate);
  const passed = Math.min(Math.max(daysBetween(profile.startDate, dateS), 0), total);
  return profile.startWeight - (profile.startWeight - profile.goalWeight) * (passed / total);
}

/* ───────────────────────── App ───────────────────────── */

export default function Tracker95() {
  const [tab, setTab] = useState("today");
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [weights, setWeights] = useState({});
  const [date, setDate] = useState(todayStr());
  const [day, setDay] = useState({ foods: [], acts: [] });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const p = await stGet("profile", DEFAULT_PROFILE);
      const merged = { ...DEFAULT_PROFILE, ...p, schedule: { ...DEFAULT_PROFILE.schedule, ...(p.schedule || {}) } };
      const w = await stGet("weights", {});
      const d = await stGet("day:" + todayStr(), { foods: [], acts: [] });
      setProfile(merged); setWeights(w); setDay(d); setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    (async () => setDay(await stGet("day:" + date, { foods: [], acts: [] })))();
  }, [date, loaded]);

  const saveDay = (next) => { setDay(next); stSet("day:" + date, next); };
  const saveWeights = (next) => { setWeights(next); stSet("weights", next); };
  const saveProfile = (next) => { setProfile(next); stSet("profile", next); };

  const totals = useMemo(() => {
    const t = { kcal: 0, p: 0, f: 0, c: 0 };
    for (const f of day.foods) { t.kcal += f.kcal; t.p += f.p; t.f += f.f; t.c += f.c; }
    return t;
  }, [day]);

  if (!loaded)
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    );

  return (
    <div className="min-h-screen bg-gray-900 text-slate-50" style={{ fontFamily: "Barlow, -apple-system, system-ui, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600;700&display=swap');
        .disp { font-family: 'Barlow Condensed', 'Arial Narrow', -apple-system, sans-serif; letter-spacing: .02em; }
        @media (prefers-reduced-motion: reduce) { * { transition: none !important; animation: none !important; } }
        input, select { color-scheme: dark; }
      `}</style>

      <div className="max-w-md mx-auto pb-28 px-4 pt-5">
        <header className="flex items-end justify-between mb-4">
          <div>
            <div className="disp text-3xl font-bold leading-none uppercase">Путь к 95</div>
            <div className="text-slate-400 text-sm mt-1">{fmtDate(date)}</div>
          </div>
          <input
            type="date" value={date} max={todayStr()}
            onChange={(e) => setDate(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-sm text-slate-200"
            aria-label="Выбрать дату"
          />
        </header>

        {tab === "today" && (
          <TodayTab profile={profile} totals={totals} day={day} saveDay={saveDay}
            weights={weights} saveWeights={saveWeights} date={date} goTo={setTab} />
        )}
        {tab === "food" && <FoodTab day={day} saveDay={saveDay} totals={totals} profile={profile} />}
        {tab === "weight" && <WeightTab profile={profile} weights={weights} saveWeights={saveWeights} />}
        {tab === "plan" && <PlanTab profile={profile} saveProfile={saveProfile} />}
      </div>

      <nav className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="max-w-md mx-auto grid grid-cols-4">
          {[
            ["today", "Сегодня", Flame],
            ["food", "Еда", Drumstick],
            ["weight", "Вес", Scale],
            ["plan", "План", ClipboardList],
          ].map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex flex-col items-center gap-1 py-2.5 cursor-pointer transition-colors duration-150 ${tab === id ? "text-orange-500" : "text-slate-400 hover:text-slate-200"}`}
              aria-label={label}>
              <Icon className="w-5 h-5" />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

/* ───────────────────────── Сегодня ───────────────────────── */

function Bar({ value, max, color }) {
  const pct = Math.min(100, (value / max) * 100);
  const over = value > max;
  return (
    <div className="h-2.5 rounded-full bg-gray-700 overflow-hidden">
      <div className={`h-full rounded-full transition-all duration-300 ${over ? "bg-red-500" : color}`}
        style={{ width: pct + "%" }} />
    </div>
  );
}

function TodayTab({ profile, totals, day, saveDay, weights, saveWeights, date, goTo }) {
  const [w, setW] = useState(weights[date] ?? "");
  const [actType, setActType] = useState("gym");
  const [actMin, setActMin] = useState("");
  useEffect(() => setW(weights[date] ?? ""), [date, weights]);

  const left = Math.round(profile.kcalTarget - totals.kcal);
  const goalToday = goalLineAt(profile, date);
  const lastW = weights[date] ?? lastKnownWeight(weights);

  const addAct = () => {
    const min = parseInt(actMin);
    if (!min) return;
    const t = ACT_TYPES.find((a) => a.id === actType);
    saveDay({ ...day, acts: [...day.acts, { id: Date.now(), type: t.label, min }] });
    setActMin("");
  };

  return (
    <div className="space-y-4">
      {/* калории */}
      <section className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-slate-400 text-sm font-medium">Калории</span>
          <span className="disp text-2xl font-bold">
            {Math.round(totals.kcal)} <span className="text-slate-400 text-base font-medium">/ {profile.kcalTarget}</span>
          </span>
        </div>
        <Bar value={totals.kcal} max={profile.kcalTarget} color="bg-orange-500" />
        <div className={`text-sm mt-2 font-medium ${left < 0 ? "text-red-400" : "text-slate-300"}`}>
          {left >= 0 ? `Осталось ${left} ккал` : `Перебор ${-left} ккал`}
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 text-center">
          {[["Белки", totals.p, profile.proteinTarget, "г"], ["Жиры", totals.f, 75, "г"], ["Углеводы", totals.c, 230, "г"]].map(([n, v, m, u]) => (
            <div key={n} className="bg-gray-900 rounded-xl py-2">
              <div className="text-xs text-slate-400">{n}</div>
              <div className="disp text-lg font-semibold">{Math.round(v)}<span className="text-slate-500 text-sm"> / {m}{u}</span></div>
            </div>
          ))}
        </div>
        <Bar value={totals.p} max={profile.proteinTarget} color="bg-green-500" />
        <div className="text-xs text-slate-400 mt-1">Белок — вторая цель дня: {Math.max(0, Math.round(profile.proteinTarget - totals.p))} г осталось</div>
        <button onClick={() => goTo("food")}
          className="mt-3 w-full bg-orange-500 hover:bg-orange-400 active:scale-[0.98] transition-all duration-150 text-gray-900 font-semibold rounded-xl py-3 flex items-center justify-center gap-2 cursor-pointer">
          <Plus className="w-5 h-5" /> Добавить еду
        </button>
      </section>

      {/* вес */}
      <section className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-slate-400 text-sm font-medium">Вес утром</span>
          <span className="text-xs text-slate-500">план на сегодня ≈ {goalToday.toFixed(1)} кг</span>
        </div>
        <div className="flex gap-2">
          <input type="number" inputMode="decimal" step="0.1" placeholder={lastW ? String(lastW) : "114.0"}
            value={w} onChange={(e) => setW(e.target.value)}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-3 text-lg disp font-semibold"
            aria-label="Вес в килограммах" />
          <button onClick={() => { const v = parseFloat(String(w).replace(",", ".")); if (v > 40 && v < 250) saveWeights({ ...weights, [date]: v }); }}
            className="bg-green-500 hover:bg-green-400 active:scale-[0.98] transition-all duration-150 text-gray-900 font-semibold rounded-xl px-5 cursor-pointer">
            ОК
          </button>
        </div>
        {weights[date] && (
          <div className="text-sm mt-2 text-slate-300">
            Записано: <b>{weights[date]} кг</b>{" "}
            {weights[date] <= goalToday
              ? <span className="text-green-400">— идёте с опережением</span>
              : <span className="text-orange-400">— чуть выше плана, без паники: смотрим на среднее за неделю</span>}
          </div>
        )}
      </section>

      {/* активность */}
      <section className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Dumbbell className="w-4 h-4 text-orange-500" />
          <span className="text-slate-400 text-sm font-medium">Активность</span>
          {profile.schedule?.[new Date(date + "T12:00:00").getDay()] && (
            <span className="ml-auto text-xs bg-orange-500/15 text-orange-400 border border-orange-500/30 rounded-full px-2.5 py-1 font-medium">
              По плану: {SCHED_LABEL[profile.schedule[new Date(date + "T12:00:00").getDay()]]}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <select value={actType} onChange={(e) => setActType(e.target.value)}
            className="bg-gray-900 border border-gray-700 rounded-xl px-3 py-3 text-sm flex-1" aria-label="Тип активности">
            {ACT_TYPES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
          <input type="number" inputMode="numeric" placeholder="мин" value={actMin}
            onChange={(e) => setActMin(e.target.value)}
            className="w-24 bg-gray-900 border border-gray-700 rounded-xl px-3 py-3 text-sm" aria-label="Минуты" />
          <button onClick={addAct} className="bg-gray-700 hover:bg-gray-600 transition-colors duration-150 rounded-xl px-4 cursor-pointer" aria-label="Добавить активность">
            <Plus className="w-5 h-5" />
          </button>
        </div>
        {day.acts.length > 0 && (
          <ul className="mt-3 space-y-2">
            {day.acts.map((a) => (
              <li key={a.id} className="flex items-center justify-between bg-gray-900 rounded-xl px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  {a.type === "Ходьба" ? <Footprints className="w-4 h-4 text-green-500" /> : <Dumbbell className="w-4 h-4 text-green-500" />}
                  {a.type} · {a.min} мин
                </span>
                <button onClick={() => saveDay({ ...day, acts: day.acts.filter((x) => x.id !== a.id) })}
                  className="text-slate-500 hover:text-red-400 cursor-pointer p-1" aria-label="Удалить">
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-slate-500 mt-2">Дефицит уже заложен в 2350 ккал — еду за тренировки не «отрабатываем» и не доедаем.</p>
      </section>
    </div>
  );
}

function lastKnownWeight(weights) {
  const keys = Object.keys(weights).sort();
  return keys.length ? weights[keys[keys.length - 1]] : null;
}

/* ───────────────────────── Еда ───────────────────────── */

function FoodTab({ day, saveDay, totals, profile }) {
  const [q, setQ] = useState("");
  const [aiResults, setAiResults] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [picked, setPicked] = useState(null); // {name, kcal100,p,f,c, portion}
  const [grams, setGrams] = useState("");
  const [meal, setMeal] = useState(defaultMeal());
  const inputRef = useRef(null);

  const local = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return FOOD_DB.filter((f) => f[0].toLowerCase().includes(s)).slice(0, 6);
  }, [q]);

  const aiSearch = async () => {
    if (q.trim().length < 2) return;
    if (!getApiKey()) { setAiError("Добавьте API-ключ Anthropic на вкладке «План» — без него AI-поиск не работает."); return; }
    setAiLoading(true); setAiError(""); setAiResults(null);
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: AI_HEADERS(),
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content:
              `Ты база данных продуктов питания. Запрос пользователя (на русском): "${q.trim()}".\n` +
              `Верни ТОЛЬКО валидный JSON-массив (без markdown, без пояснений) из 1-4 наиболее вероятных вариантов:\n` +
              `[{"name":"название по-русски","kcal":число ккал на 100 г,"p":белки г/100г,"f":жиры г/100г,"c":углеводы г/100г,"portion":типичная порция в граммах}]\n` +
              `Если это готовое блюдо (шаурма, борщ, пицца) — оцени средние значения. Числа реалистичные.`,
          }],
        }),
      });
      const data = await res.json();
      const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
      const clean = text.replace(/```json|```/g, "").trim();
      const arr = JSON.parse(clean);
      if (!Array.isArray(arr) || !arr.length) throw new Error("empty");
      setAiResults(arr);
    } catch (e) {
      console.error(e);
      setAiError("Не получилось распознать. Попробуйте переформулировать запрос.");
    } finally {
      setAiLoading(false);
    }
  };

  const pick = (name, kcal, p, f, c, portion) => {
    setPicked({ name, kcal, p, f, c });
    setGrams(String(portion || 100));
    setAiResults(null);
  };

  const add = () => {
    const g = parseFloat(grams);
    if (!picked || !g) return;
    const k = g / 100;
    saveDay({
      ...day,
      foods: [...day.foods, {
        id: Date.now(), meal, name: picked.name, grams: g,
        kcal: picked.kcal * k, p: picked.p * k, f: picked.f * k, c: picked.c * k,
      }],
    });
    setPicked(null); setQ(""); setGrams("");
  };

  const byMeal = useMemo(() => {
    const m = {};
    for (const f of day.foods) (m[f.meal] = m[f.meal] || []).push(f);
    return m;
  }, [day]);

  return (
    <div className="space-y-4">
      {/* поиск */}
      <section className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
        <label htmlFor="fq" className="text-slate-400 text-sm font-medium">Что съели?</label>
        <div className="flex gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input id="fq" ref={inputRef} value={q}
              onChange={(e) => { setQ(e.target.value); setAiResults(null); setAiError(""); }}
              placeholder="гречка, шаурма, борщ…"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-9 pr-3 py-3 text-base" />
          </div>
          <button onClick={aiSearch} disabled={aiLoading}
            className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 transition-all duration-150 text-gray-900 rounded-xl px-4 cursor-pointer flex items-center gap-1.5 font-semibold"
            aria-label="Поиск через AI">
            {aiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            <span className="hidden sm:inline">AI</span>
          </button>
        </div>

        {local.length > 0 && !picked && (
          <ul className="mt-3 divide-y divide-gray-700 border border-gray-700 rounded-xl overflow-hidden">
            {local.map(([n, k, p, f, c]) => (
              <li key={n}>
                <button onClick={() => pick(n, k, p, f, c, n.includes("Протеин") ? 30 : 100)}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-700 transition-colors duration-150 cursor-pointer flex justify-between items-center">
                  <span className="text-sm">{n}</span>
                  <span className="text-xs text-slate-400 shrink-0 ml-2">{k} ккал · Б{p}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {q.length >= 2 && local.length === 0 && !aiResults && !aiLoading && !picked && (
          <p className="text-xs text-slate-500 mt-2">Нет в базе — нажмите <b className="text-orange-400">AI</b>, и калорийность определится автоматически.</p>
        )}

        {aiError && <p className="text-sm text-red-400 mt-2">{aiError}</p>}

        {aiResults && (
          <ul className="mt-3 divide-y divide-gray-700 border border-orange-500/40 rounded-xl overflow-hidden">
            {aiResults.map((r, i) => (
              <li key={i}>
                <button onClick={() => pick(r.name, r.kcal, r.p, r.f, r.c, r.portion)}
                  className="w-full text-left px-3 py-2.5 hover:bg-gray-700 transition-colors duration-150 cursor-pointer">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{r.name}</span>
                    <span className="text-xs text-slate-400 shrink-0 ml-2">{Math.round(r.kcal)} ккал/100г</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Б {r.p} · Ж {r.f} · У {r.c} · порция ~{r.portion} г</div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {picked && (
          <div className="mt-3 bg-gray-900 border border-green-500/40 rounded-xl p-3">
            <div className="flex justify-between items-start">
              <div className="text-sm font-medium pr-2">{picked.name}</div>
              <button onClick={() => setPicked(null)} className="text-slate-500 hover:text-slate-300 cursor-pointer p-1" aria-label="Отмена"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex gap-2 mt-2">
              <input type="number" inputMode="decimal" value={grams} onChange={(e) => setGrams(e.target.value)}
                className="w-24 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 disp text-lg font-semibold" aria-label="Граммы" />
              <span className="self-center text-slate-400 text-sm">г</span>
              <select value={meal} onChange={(e) => setMeal(e.target.value)}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm" aria-label="Приём пищи">
                {MEALS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            {grams > 0 && (
              <div className="text-xs text-slate-400 mt-2">
                = {Math.round(picked.kcal * grams / 100)} ккал · Б {Math.round(picked.p * grams / 100)} · Ж {Math.round(picked.f * grams / 100)} · У {Math.round(picked.c * grams / 100)}
              </div>
            )}
            <button onClick={add}
              className="mt-3 w-full bg-green-500 hover:bg-green-400 active:scale-[0.98] transition-all duration-150 text-gray-900 font-semibold rounded-xl py-2.5 cursor-pointer">
              Записать
            </button>
          </div>
        )}
      </section>

      {/* AI-повар */}
      <AiChef day={day} saveDay={saveDay} totals={totals} profile={profile} />

      {/* дневник */}
      <section className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-slate-400 text-sm font-medium">Дневник за день</span>
          <span className="disp text-lg font-bold">{Math.round(totals.kcal)} <span className="text-slate-500 text-sm">/ {profile.kcalTarget} ккал</span></span>
        </div>
        {day.foods.length === 0 && (
          <p className="text-sm text-slate-500 py-4 text-center">Пока пусто. Найдите продукт выше и нажмите «Записать».</p>
        )}
        {MEALS.filter((m) => byMeal[m]).map((m) => (
          <div key={m} className="mt-3">
            <div className="text-xs uppercase tracking-wide text-orange-400 font-semibold mb-1.5 disp">{m} · {Math.round(byMeal[m].reduce((s, f) => s + f.kcal, 0))} ккал</div>
            <ul className="space-y-1.5">
              {byMeal[m].map((f) => (
                <li key={f.id} className="flex items-center justify-between bg-gray-900 rounded-xl px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm truncate">{f.name}</div>
                    <div className="text-xs text-slate-500">{Math.round(f.grams)} г · {Math.round(f.kcal)} ккал · Б {Math.round(f.p)}</div>
                  </div>
                  <button onClick={() => saveDay({ ...day, foods: day.foods.filter((x) => x.id !== f.id) })}
                    className="text-slate-500 hover:text-red-400 cursor-pointer p-1.5 shrink-0" aria-label="Удалить запись">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>
    </div>
  );
}

/* ───────────────────────── AI-повар ───────────────────────── */

function AiChef({ day, saveDay, totals, profile }) {
  const [pantry, setPantry] = useState("");
  const [ideas, setIdeas] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await stGet("pantry", "");
      if (saved) setPantry(saved);
    })();
  }, []);

  const leftKcal = Math.max(0, Math.round(profile.kcalTarget - totals.kcal));
  const leftP = Math.max(0, Math.round(profile.proteinTarget - totals.p));
  const leftF = Math.max(0, Math.round(75 - totals.f));
  const leftC = Math.max(0, Math.round(230 - totals.c));
  const mealsLeft = Math.max(1, MEALS.length - new Set(day.foods.map((f) => f.meal)).size);

  const suggest = async () => {
    if (pantry.trim().length < 3) return;
    if (!getApiKey()) { setError("Добавьте API-ключ Anthropic на вкладке «План» — без него AI-повар не работает."); return; }
    setLoading(true); setError(""); setIdeas(null);
    stSet("pantry", pantry.trim());

    /* что сегодня по тренировкам: из графика + из уже записанной активности */
    const planned = profile.schedule?.[new Date().getDay()] || null;
    const done = day.acts.map((a) => a.type).join(", ");
    let trainCtx = "Сегодня день отдыха — упор на белок и овощи, углеводы умеренно.";
    if (planned === "foot" && !done.includes("Футбол"))
      trainCtx = "Сегодня вечером ФУТБОЛ, игра ещё впереди — в ближайший приём добавь сложных углеводов (~50-80 г сверху: рис, гречка, картофель, хлеб), чтобы были силы на игру.";
    else if (planned === "foot")
      trainCtx = "Сегодня уже был футбол — сейчас восстановление: упор на белок, углеводы умеренные.";
    else if (planned === "gym" && !done.includes("Зал"))
      trainCtx = "Сегодня СИЛОВАЯ тренировка, ещё впереди — нужны углеводы до неё и белок после.";
    else if (planned === "gym")
      trainCtx = "Силовая уже была — приоритет белку для восстановления мышц.";
    if (done) trainCtx += ` Уже записанная активность: ${done}.`;

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: AI_HEADERS(),
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1600,
          messages: [{
            role: "user",
            content:
              `Ты нутрициолог-повар. Человек худеет (114→95 кг), тренируется, считает КБЖУ.\n` +
              `Остаток на сегодня: ${leftKcal} ккал, белка минимум ${leftP} г, жиров до ${leftF} г, углеводов до ${leftC} г. ` +
              `Впереди примерно ${mealsLeft} приём(а) пищи.\n` +
              `Контекст тренировок: ${trainCtx}\n` +
              `Продукты в наличии: ${pantry.trim()}.\n` +
              `Предложи 2-3 варианта ОДНОГО приёма пищи из этих продуктов (можно соль/специи/вода), распределяя углеводы согласно контексту тренировок. ` +
              `Если остаток на день большой, целься в ${Math.min(leftKcal, Math.round(leftKcal / mealsLeft) + 100)}–${Math.min(leftKcal, Math.round(leftKcal / mealsLeft) + 250)} ккал за приём с упором на белок. ` +
              `Граммы реалистичные, КБЖУ считай честно по граммовкам.\n` +
              `Верни ТОЛЬКО валидный JSON-массив без markdown:\n` +
              `[{"title":"название блюда","how":"как приготовить, 1-2 предложения","items":[{"name":"продукт","grams":число,"kcal":ккал за эти граммы,"p":г,"f":г,"c":г}],"kcal":итого,"p":итого,"f":итого,"c":итого}]`,
          }],
        }),
      });
      const data = await res.json();
      const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
      const arr = JSON.parse(text.replace(/```json|```/g, "").trim());
      if (!Array.isArray(arr) || !arr.length) throw new Error("empty");
      setIdeas(arr);
    } catch (e) {
      console.error(e);
      setError("Не получилось придумать. Попробуйте ещё раз или уточните список продуктов.");
    } finally {
      setLoading(false);
    }
  };

  const logIdea = (idea) => {
    const meal = defaultMeal();
    const stamp = Date.now();
    const foods = idea.items.map((it, i) => ({
      id: stamp + i, meal,
      name: `${it.name} (${idea.title})`,
      grams: it.grams, kcal: it.kcal, p: it.p, f: it.f, c: it.c,
    }));
    saveDay({ ...day, foods: [...day.foods, ...foods] });
    setIdeas(null);
  };

  return (
    <section className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between cursor-pointer" aria-expanded={open}>
        <span className="flex items-center gap-2 text-slate-400 text-sm font-medium">
          <ChefHat className="w-4 h-4 text-green-500" /> Что приготовить из того, что есть?
        </span>
        <ChevronRight className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="mt-3">
          <div className="text-xs text-slate-400 mb-2">
            Остаток на сегодня: <b className="text-orange-400">{leftKcal} ккал</b> · белка добрать <b className="text-green-400">{leftP} г</b>
            {profile.schedule?.[new Date().getDay()] && (
              <> · сегодня: <b className="text-slate-200">{SCHED_LABEL[profile.schedule[new Date().getDay()]]}</b></>
            )}
          </div>
          <textarea
            value={pantry} onChange={(e) => setPantry(e.target.value)} rows={3}
            placeholder="курица, гречка, яйца, творог, помидоры, сыр…"
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm resize-none"
            aria-label="Продукты в наличии" />
          <button onClick={suggest} disabled={loading || pantry.trim().length < 3}
            className="mt-2 w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 active:scale-[0.98] transition-all duration-150 text-gray-900 font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 cursor-pointer">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? "Думаю…" : "Предложить блюда"}
          </button>
          {error && <p className="text-sm text-red-400 mt-2">{error}</p>}

          {ideas && (
            <ul className="mt-3 space-y-3">
              {ideas.map((idea, i) => (
                <li key={i} className="bg-gray-900 border border-green-500/30 rounded-xl p-3">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="disp font-semibold text-base">{idea.title}</span>
                    <span className="text-xs text-slate-400 shrink-0">{Math.round(idea.kcal)} ккал · Б {Math.round(idea.p)}</span>
                  </div>
                  <p className="text-sm text-slate-300 mt-1">{idea.how}</p>
                  <ul className="mt-2 text-xs text-slate-400 space-y-0.5">
                    {idea.items.map((it, j) => (
                      <li key={j}>• {it.name} — {Math.round(it.grams)} г ({Math.round(it.kcal)} ккал)</li>
                    ))}
                  </ul>
                  <div className="text-xs text-slate-500 mt-1.5">Итого: Б {Math.round(idea.p)} · Ж {Math.round(idea.f)} · У {Math.round(idea.c)}</div>
                  <button onClick={() => logIdea(idea)}
                    className="mt-2.5 w-full bg-gray-700 hover:bg-gray-600 transition-colors duration-150 rounded-xl py-2 text-sm font-medium cursor-pointer flex items-center justify-center gap-1.5">
                    <Plus className="w-4 h-4" /> Записать в дневник
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

/* ───────────────────────── Вес ───────────────────────── */

function weeklyAvg(weights, endDate, days = 7) {
  const vals = [];
  const end = new Date(endDate + "T12:00:00");
  for (let i = 0; i < days; i++) {
    const d = new Date(end); d.setDate(end.getDate() - i);
    const v = weights[dstr(d)];
    if (v) vals.push(v);
  }
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

function WeightTab({ profile, weights, saveWeights }) {
  const entries = Object.entries(weights).sort((a, b) => a[0].localeCompare(b[0]));
  const last = entries.length ? entries[entries.length - 1][1] : profile.startWeight;
  const lost = profile.startWeight - last;
  const toGo = last - profile.goalWeight;
  const daysLeft = Math.max(daysBetween(todayStr(), profile.goalDate), 0);

  const avgNow = weeklyAvg(weights, todayStr());
  const prev = new Date(); prev.setDate(prev.getDate() - 7);
  const avgPrev = weeklyAvg(weights, dstr(prev));
  const pace = avgNow && avgPrev ? avgPrev - avgNow : null;
  const needPace = daysLeft > 0 ? (toGo / daysLeft) * 7 : 0;

  let advice = "Записывайте вес каждое утро — через неделю появится темп и рекомендации.";
  let adviceColor = "text-slate-400";
  if (pace !== null) {
    if (pace < needPace - 0.2) { advice = `Темп ${pace.toFixed(1)} кг/нед — медленнее нужного (${needPace.toFixed(1)}). Минус 150–200 ккал от нормы или +2000 шагов в день.`; adviceColor = "text-orange-400"; }
    else if (pace > 1.3) { advice = `Темп ${pace.toFixed(1)} кг/нед — слишком быстро. Добавьте ~150 ккал, чтобы не терять мышцы и силы на футболе.`; adviceColor = "text-orange-400"; }
    else { advice = `Темп ${pace.toFixed(1)} кг/нед — в коридоре. Нужно ${needPace.toFixed(1)} кг/нед до цели. Так держать.`; adviceColor = "text-green-400"; }
  }

  return (
    <div className="space-y-4">
      <section className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
        <div className="grid grid-cols-3 text-center gap-2">
          <div><div className="text-xs text-slate-400">Сейчас</div><div className="disp text-2xl font-bold">{last.toFixed(1)}</div></div>
          <div><div className="text-xs text-slate-400">Сброшено</div><div className="disp text-2xl font-bold text-green-400">−{Math.max(lost, 0).toFixed(1)}</div></div>
          <div><div className="text-xs text-slate-400">До цели</div><div className="disp text-2xl font-bold text-orange-400">{Math.max(toGo, 0).toFixed(1)}</div></div>
        </div>
        <Chart profile={profile} entries={entries} />
        <div className={`text-sm mt-2 flex gap-2 items-start ${adviceColor}`}>
          <TrendingDown className="w-4 h-4 mt-0.5 shrink-0" /> <span>{advice}</span>
        </div>
      </section>

      <section className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-orange-500" />
          <span className="text-slate-400 text-sm font-medium">Контрольные точки</span>
        </div>
        <ul className="space-y-2">
          {[["2026-07-15", "≈ 108.5 кг"], ["2026-08-15", "≈ 103 кг"], ["2026-09-30", "≈ 99 кг"], [profile.goalDate, profile.goalWeight + " кг — финиш"]].map(([d, label]) => {
            const passed = todayStr() >= d;
            const hit = passed && weeklyAvg(weights, d) !== null && weeklyAvg(weights, d) <= goalLineAt(profile, d) + 0.5;
            return (
              <li key={d} className="flex items-center justify-between bg-gray-900 rounded-xl px-3 py-2.5">
                <span className="text-sm flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-slate-500" /> {fmtDate(d)}
                </span>
                <span className={`disp font-semibold ${passed ? (hit ? "text-green-400" : "text-orange-400") : "text-slate-300"}`}>{label}</span>
              </li>
            );
          })}
        </ul>
        <p className="text-xs text-slate-500 mt-3">Осталось {daysLeft} дн. Если будете на 96–97 кг к 3 ноября — это тоже победа, просто финиш сместится на пару недель.</p>
      </section>

      {entries.length > 0 && (
        <section className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
          <span className="text-slate-400 text-sm font-medium">Последние записи</span>
          <ul className="mt-2 space-y-1.5">
            {entries.slice(-10).reverse().map(([d, v]) => (
              <li key={d} className="flex justify-between items-center bg-gray-900 rounded-xl px-3 py-2 text-sm">
                <span className="text-slate-400">{fmtDate(d)}</span>
                <span className="flex items-center gap-2">
                  <b className="disp text-base">{v} кг</b>
                  <button onClick={() => { const n = { ...weights }; delete n[d]; saveWeights(n); }}
                    className="text-slate-500 hover:text-red-400 cursor-pointer p-1" aria-label="Удалить запись веса">
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

function Chart({ profile, entries }) {
  const W = 340, H = 170, P = { l: 30, r: 8, t: 10, b: 20 };
  const t0 = new Date(profile.startDate + "T12:00:00").getTime();
  const t1 = new Date(profile.goalDate + "T12:00:00").getTime();
  const yMin = profile.goalWeight - 2, yMax = profile.startWeight + 2;
  const x = (s) => P.l + ((new Date(s + "T12:00:00").getTime() - t0) / (t1 - t0)) * (W - P.l - P.r);
  const y = (v) => P.t + (1 - (v - yMin) / (yMax - yMin)) * (H - P.t - P.b);
  const pts = entries.map(([d, v]) => `${x(d).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const gridY = [95, 100, 105, 110, 115].filter((v) => v >= yMin && v <= yMax);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-3" role="img" aria-label="График веса относительно плановой линии до 3 ноября">
      {gridY.map((v) => (
        <g key={v}>
          <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="#374151" strokeWidth="1" strokeDasharray="3 4" />
          <text x={2} y={y(v) + 4} fill="#64748b" fontSize="10">{v}</text>
        </g>
      ))}
      {/* плановая линия */}
      <line x1={x(profile.startDate)} y1={y(profile.startWeight)} x2={x(profile.goalDate)} y2={y(profile.goalWeight)}
        stroke="#22C55E" strokeWidth="2" strokeDasharray="6 5" opacity="0.8" />
      <circle cx={x(profile.goalDate)} cy={y(profile.goalWeight)} r="4" fill="#22C55E" />
      <text x={x(profile.goalDate) - 6} y={y(profile.goalWeight) - 8} fill="#22C55E" fontSize="10" textAnchor="end">95 кг · 3 ноя</text>
      {/* фактические данные */}
      {entries.length > 1 && <polyline points={pts} fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />}
      {entries.slice(-1).map(([d, v]) => (
        <g key={d}>
          <circle cx={x(d)} cy={y(v)} r="4.5" fill="#F97316" stroke="#1F2937" strokeWidth="2" />
        </g>
      ))}
      {entries.length === 0 && <text x={W / 2} y={H / 2} fill="#64748b" fontSize="12" textAnchor="middle">Записывайте вес — линия появится здесь</text>}
    </svg>
  );
}

/* ───────────────────────── План ───────────────────────── */

function PlanTab({ profile, saveProfile }) {
  const [kcal, setKcal] = useState(profile.kcalTarget);
  const [prot, setProt] = useState(profile.proteinTarget);

  const menu = [
    ["Завтрак · ~550 ккал", "4 яйца + 100 г овощей в омлет, 60 г овсянки с ягодами или бананом"],
    ["Обед · ~700 ккал", "200 г куриной грудки или индейки, 80 г гречки/риса (сухой вес), салат с 1 ст. л. масла"],
    ["Перекус · ~350 ккал", "Протеин или 200 г творога 5% + фрукт (после тренировки)"],
    ["Ужин · ~650 ккал", "200 г рыбы или постной говядины, 250–300 г картофеля или 70 г риса, овощи"],
  ];
  const rules = [
    "Жидкие калории (сок, газировка, пиво) — ноль. Алкоголь максимум 1 раз в неделю, в пределах калорий.",
    "Один свободный приём пищи в неделю — планово, а не срывом.",
    "Силовые 3 раза в неделю: база (присед/жим ногами, тяги, жимы), 45–60 мин — чтобы худел жир, а не мышцы.",
    "Футбол 1–2 раза — это кардио. Плюс 8–10 тыс. шагов каждый день.",
    "Взвешивание каждое утро после туалета, до еды. Решения — только по среднему за неделю.",
    "Темп ниже 0.7 кг/нед две недели подряд → −150–200 ккал или +2000 шагов. Выше 1.3 кг/нед → +150 ккал.",
    "Не опускаться ниже 1900 ккал и не «отрабатывать» еду кардио.",
  ];

  return (
    <div className="space-y-4">
      <section className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
        <span className="text-slate-400 text-sm font-medium">Цели на день</span>
        <div className="grid grid-cols-2 gap-2 mt-2">
          <label className="bg-gray-900 rounded-xl p-3 block">
            <span className="text-xs text-slate-400">Калории</span>
            <input type="number" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)}
              className="w-full bg-transparent disp text-2xl font-bold outline-none" />
          </label>
          <label className="bg-gray-900 rounded-xl p-3 block">
            <span className="text-xs text-slate-400">Белок, г</span>
            <input type="number" inputMode="numeric" value={prot} onChange={(e) => setProt(e.target.value)}
              className="w-full bg-transparent disp text-2xl font-bold outline-none" />
          </label>
        </div>
        <button onClick={() => { const k = parseInt(kcal), p = parseInt(prot); if (k >= 1900 && k < 4000 && p > 80) saveProfile({ ...profile, kcalTarget: k, proteinTarget: p }); }}
          className="mt-3 w-full bg-gray-700 hover:bg-gray-600 transition-colors duration-150 rounded-xl py-2.5 font-medium cursor-pointer">
          Сохранить цели
        </button>
        <p className="text-xs text-slate-500 mt-2">Стартовый план: 2350 ккал · 185 г белка · 65–75 г жиров · ~230 г углеводов. Ниже 1900 ккал приложение не даст опуститься.</p>
      </section>

      <section className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
        <span className="text-slate-400 text-sm font-medium">График тренировок</span>
        <p className="text-xs text-slate-500 mt-1 mb-2">Нажимайте на день: отдых → зал → футбол. AI-повар подстраивает углеводы под этот график.</p>
        <div className="grid grid-cols-7 gap-1.5">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => {
            const v = profile.schedule?.[d] || null;
            const next = v === null ? "gym" : v === "gym" ? "foot" : null;
            return (
              <button key={d}
                onClick={() => saveProfile({ ...profile, schedule: { ...profile.schedule, [d]: next } })}
                className={`rounded-xl py-2 flex flex-col items-center gap-1 cursor-pointer transition-colors duration-150 border ${
                  v === "gym" ? "bg-orange-500/15 border-orange-500/40 text-orange-400"
                  : v === "foot" ? "bg-green-500/15 border-green-500/40 text-green-400"
                  : "bg-gray-900 border-gray-700 text-slate-500 hover:text-slate-300"}`}
                aria-label={`${RU_DAYS[d]}: ${v ? SCHED_LABEL[v] : "отдых"}`}>
                <span className="text-xs font-semibold uppercase">{RU_DAYS[d]}</span>
                {v === "gym" ? <Dumbbell className="w-4 h-4" /> : v === "foot" ? <Footprints className="w-4 h-4" /> : <span className="w-4 h-4 text-base leading-4">·</span>}
              </button>
            );
          })}
        </div>
      </section>

      <section className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
        <span className="text-slate-400 text-sm font-medium">Шаблон дня</span>
        <ul className="mt-2 space-y-2">
          {menu.map(([t, d]) => (
            <li key={t} className="bg-gray-900 rounded-xl px-3 py-2.5">
              <div className="disp font-semibold text-orange-400">{t}</div>
              <div className="text-sm text-slate-300 mt-0.5">{d}</div>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500 mt-2">Источники меняйте свободно при тех же граммовках: грудка ↔ индейка ↔ говядина ↔ рыба; гречка ↔ рис ↔ макароны ↔ картофель. В день футбола +50 г углеводов за 2–3 часа до игры.</p>
      </section>

      <section className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
        <span className="text-slate-400 text-sm font-medium">Правила</span>
        <ul className="mt-2 space-y-2">
          {rules.map((r, i) => (
            <li key={i} className="flex gap-2 text-sm text-slate-300">
              <ChevronRight className="w-4 h-4 text-green-500 shrink-0 mt-0.5" /> <span>{r}</span>
            </li>
          ))}
        </ul>
      </section>

      <ApiKeySection />

      <BackupSection profile={profile} />
    </div>
  );
}


/* ───────────────────────── API-ключ ───────────────────────── */

function ApiKeySection() {
  const [key, setKey] = useState(getApiKey());
  const [saved, setSaved] = useState(false);
  return (
    <section className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
      <span className="text-slate-400 text-sm font-medium">API-ключ Anthropic (для AI-функций)</span>
      <p className="text-xs text-slate-500 mt-1">Создаётся на console.anthropic.com → API Keys. Хранится только на этом устройстве. Без ключа работает всё, кроме AI-поиска еды и AI-повара.</p>
      <div className="flex gap-2 mt-2">
        <input type="password" value={key} onChange={(e) => { setKey(e.target.value); setSaved(false); }}
          placeholder="sk-ant-…" autoComplete="off"
          className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm" aria-label="API-ключ" />
        <button onClick={() => { setApiKey(key); setSaved(true); }}
          className="bg-gray-700 hover:bg-gray-600 transition-colors duration-150 rounded-xl px-4 text-sm font-medium cursor-pointer">
          {saved ? "Сохранён" : "Сохранить"}
        </button>
      </div>
    </section>
  );
}

/* ───────────────────────── Бэкап ───────────────────────── */

function BackupSection({ profile }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef(null);

  const exportAll = async () => {
    setBusy(true); setMsg("");
    try {
      const out = {
        app: "tracker95", exportedAt: new Date().toISOString(),
        profile,
        weights: await stGet("weights", {}),
        pantry: await stGet("pantry", ""),
        days: {},
      };
      try {
        const r = await storageApi.list("day:");
        const keys = (r?.keys || []).map((k) => (typeof k === "string" ? k : k.key));
        for (const k of keys) {
          const v = await stGet(k, null);
          if (v) out.days[k] = v;
        }
      } catch (e) { console.error(e); }
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `tracker95-backup-${todayStr()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      setMsg(`Выгружено: ${Object.keys(out.weights).length} взвешиваний, ${Object.keys(out.days).length} дней дневника.`);
    } catch (e) {
      console.error(e);
      setMsg("Не получилось выгрузить. Попробуйте ещё раз.");
    } finally { setBusy(false); }
  };

  const importAll = async (file) => {
    if (!file) return;
    setBusy(true); setMsg("");
    try {
      const data = JSON.parse(await file.text());
      if (data.app !== "tracker95") throw new Error("wrong file");
      if (data.profile) await stSet("profile", data.profile);
      if (data.weights) await stSet("weights", data.weights);
      if (typeof data.pantry === "string") await stSet("pantry", data.pantry);
      for (const [k, v] of Object.entries(data.days || {})) await stSet(k, v);
      setMsg("Данные восстановлены. Перезагружаю…");
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      console.error(e);
      setMsg("Файл не похож на бэкап этого приложения.");
      setBusy(false);
    }
  };

  return (
    <section className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
      <span className="text-slate-400 text-sm font-medium">Резервная копия</span>
      <p className="text-xs text-slate-500 mt-1">Все данные — цели, вес, дневник еды и активности — одним JSON-файлом. Восстановление перезапишет текущие данные данными из файла.</p>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <button onClick={exportAll} disabled={busy}
          className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors duration-150 rounded-xl py-2.5 text-sm font-medium cursor-pointer flex items-center justify-center gap-1.5">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} Выгрузить
        </button>
        <button onClick={() => fileRef.current?.click()} disabled={busy}
          className="bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors duration-150 rounded-xl py-2.5 text-sm font-medium cursor-pointer flex items-center justify-center gap-1.5">
          <Upload className="w-4 h-4" /> Восстановить
        </button>
        <input ref={fileRef} type="file" accept=".json,application/json" className="hidden"
          onChange={(e) => { importAll(e.target.files?.[0]); e.target.value = ""; }} aria-label="Файл бэкапа" />
      </div>
      {msg && <p className="text-xs text-slate-400 mt-2">{msg}</p>}
    </section>
  );
}
