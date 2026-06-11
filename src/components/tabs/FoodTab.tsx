import { useMemo, useState } from "react";
import { Loader2, Search, Sparkles, Trash2, X } from "lucide-react";
import type { DayLog, FoodEntry, FoodSearchResult, Meal, Profile, Totals } from "../../types";
import { MEALS, defaultMeal } from "../../constants";
import { FOOD_DB } from "../../constants/foodDb";
import { AiError, askAi, parseJsonArray } from "../../lib/ai";
import { foodSearchPrompt } from "../../lib/prompts";
import { nextId } from "../../lib/id";
import { AiChef } from "../AiChef";

interface Props {
  day: DayLog;
  saveDay: (d: DayLog) => void;
  totals: Totals;
  profile: Profile;
}

interface Picked {
  name: string;
  kcal: number;
  p: number;
  f: number;
  c: number;
}

export function FoodTab({ day, saveDay, totals, profile }: Props) {
  const [q, setQ] = useState("");
  const [aiResults, setAiResults] = useState<FoodSearchResult[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [picked, setPicked] = useState<Picked | null>(null);
  const [grams, setGrams] = useState("");
  const [meal, setMeal] = useState<Meal>(defaultMeal());

  const local = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    return FOOD_DB.filter((f) => f[0].toLowerCase().includes(s)).slice(0, 6);
  }, [q]);

  const aiSearch = async () => {
    if (q.trim().length < 2) return;
    setAiLoading(true);
    setAiError("");
    setAiResults(null);
    try {
      const text = await askAi(foodSearchPrompt(q.trim()), 1000);
      setAiResults(parseJsonArray<FoodSearchResult>(text));
    } catch (e) {
      console.error(e);
      setAiError(e instanceof AiError ? e.message : "Не получилось распознать. Попробуйте переформулировать запрос.");
    } finally {
      setAiLoading(false);
    }
  };

  const pick = (name: string, kcal: number, p: number, f: number, c: number, portion?: number) => {
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
      foods: [
        ...day.foods,
        {
          id: nextId(),
          meal,
          name: picked.name,
          grams: g,
          kcal: picked.kcal * k,
          p: picked.p * k,
          f: picked.f * k,
          c: picked.c * k,
        },
      ],
    });
    setPicked(null);
    setQ("");
    setGrams("");
  };

  const byMeal = useMemo(() => {
    const m = new Map<Meal, FoodEntry[]>();
    for (const f of day.foods) {
      const list = m.get(f.meal) ?? [];
      list.push(f);
      m.set(f.meal, list);
    }
    return m;
  }, [day]);

  const g = parseFloat(grams) || 0;

  return (
    <div className="space-y-4">
      {/* поиск */}
      <section className="bg-surface rounded-2xl p-4 border border-line">
        <label htmlFor="fq" className="text-muted text-sm font-medium">
          Что съели?
        </label>
        <div className="flex gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-dim absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="fq"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setAiResults(null);
                setAiError("");
              }}
              placeholder="гречка, шаурма, борщ…"
              className="w-full bg-canvas border border-line rounded-xl pl-9 pr-3 py-3 text-base"
            />
          </div>
          <button
            onClick={aiSearch}
            disabled={aiLoading}
            className="bg-orange-500 hover:bg-orange-400 disabled:opacity-50 transition-all duration-150 text-gray-900 rounded-xl px-4 cursor-pointer flex items-center gap-1.5 font-semibold"
            aria-label="Поиск через AI"
          >
            {aiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            <span className="hidden sm:inline">AI</span>
          </button>
        </div>

        {local.length > 0 && !picked && (
          <ul className="mt-3 divide-y divide-line border border-line rounded-xl overflow-hidden">
            {local.map(([n, k, p, f, c]) => (
              <li key={n}>
                <button
                  onClick={() => pick(n, k, p, f, c, n.includes("Протеин") ? 30 : 100)}
                  className="w-full text-left px-3 py-2.5 hover:bg-raised transition-colors duration-150 cursor-pointer flex justify-between items-center"
                >
                  <span className="text-sm">{n}</span>
                  <span className="text-xs text-muted shrink-0 ml-2">
                    {k} ккал · Б{p}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {q.length >= 2 && local.length === 0 && !aiResults && !aiLoading && !picked && (
          <p className="text-xs text-dim mt-2">
            Нет в базе — нажмите <b className="text-orange-400">AI</b>, и калорийность определится автоматически.
          </p>
        )}

        {aiError && <p role="alert" className="text-sm text-red-400 mt-2">{aiError}</p>}

        {aiResults && (
          <ul className="mt-3 divide-y divide-line border border-orange-500/40 rounded-xl overflow-hidden">
            {aiResults.map((r, i) => (
              <li key={i}>
                <button
                  onClick={() => pick(r.name, r.kcal, r.p, r.f, r.c, r.portion)}
                  className="w-full text-left px-3 py-2.5 hover:bg-raised transition-colors duration-150 cursor-pointer"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-sm">{r.name}</span>
                    <span className="text-xs text-muted shrink-0 ml-2">{Math.round(r.kcal)} ккал/100г</span>
                  </div>
                  <div className="text-xs text-dim mt-0.5">
                    Б {r.p} · Ж {r.f} · У {r.c} · порция ~{r.portion} г
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}

        {picked && (
          <div className="mt-3 bg-canvas border border-green-500/40 rounded-xl p-3">
            <div className="flex justify-between items-start">
              <div className="text-sm font-medium pr-2">{picked.name}</div>
              <button
                onClick={() => setPicked(null)}
                className="text-dim hover:text-body cursor-pointer p-2"
                aria-label="Отмена"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-2 mt-2">
              <input
                type="number"
                inputMode="decimal"
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                className="w-24 bg-surface border border-line rounded-xl px-3 py-2.5 disp text-lg font-semibold"
                aria-label="Граммы"
              />
              <span className="self-center text-muted text-sm">г</span>
              <select
                value={meal}
                onChange={(e) => setMeal(e.target.value as Meal)}
                className="flex-1 bg-surface border border-line rounded-xl px-3 py-2.5 text-sm"
                aria-label="Приём пищи"
              >
                {MEALS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            {g > 0 && (
              <div className="text-xs text-muted mt-2">
                = {Math.round((picked.kcal * g) / 100)} ккал · Б {Math.round((picked.p * g) / 100)} · Ж{" "}
                {Math.round((picked.f * g) / 100)} · У {Math.round((picked.c * g) / 100)}
              </div>
            )}
            <button
              onClick={add}
              className="mt-3 w-full bg-green-500 hover:bg-green-400 active:scale-[0.98] transition-all duration-150 text-gray-900 font-semibold rounded-xl py-2.5 cursor-pointer"
            >
              Записать
            </button>
          </div>
        )}
      </section>

      {/* AI-повар */}
      <AiChef day={day} saveDay={saveDay} totals={totals} profile={profile} />

      {/* дневник */}
      <section className="bg-surface rounded-2xl p-4 border border-line">
        <div className="flex justify-between items-baseline mb-2">
          <span className="text-muted text-sm font-medium">Дневник за день</span>
          <span className="disp text-lg font-bold">
            {Math.round(totals.kcal)} <span className="text-dim text-sm">/ {profile.kcalTarget} ккал</span>
          </span>
        </div>
        {day.foods.length === 0 && (
          <p className="text-sm text-dim py-4 text-center">Пока пусто. Найдите продукт выше и нажмите «Записать».</p>
        )}
        {MEALS.filter((m) => byMeal.has(m)).map((m) => (
          <div key={m} className="mt-3">
            <div className="text-xs uppercase tracking-wide text-orange-400 font-semibold mb-1.5 disp">
              {m} · {Math.round(byMeal.get(m)!.reduce((s, f) => s + f.kcal, 0))} ккал
            </div>
            <ul className="space-y-1.5">
              {byMeal.get(m)!.map((f) => (
                <li key={f.id} className="flex items-center justify-between bg-canvas rounded-xl px-3 py-2">
                  <div className="min-w-0">
                    <div className="text-sm truncate">{f.name}</div>
                    <div className="text-xs text-dim">
                      {Math.round(f.grams)} г · {Math.round(f.kcal)} ккал · Б {Math.round(f.p)}
                    </div>
                  </div>
                  <button
                    onClick={() => saveDay({ ...day, foods: day.foods.filter((x) => x.id !== f.id) })}
                    className="text-dim hover:text-red-400 cursor-pointer p-2 shrink-0"
                    aria-label="Удалить запись"
                  >
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
