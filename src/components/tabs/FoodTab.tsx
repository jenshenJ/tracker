import { useMemo, useState } from "react";
import { Camera, ChefHat, ChevronRight, Loader2, NotebookPen, ScanLine, Search, Sparkles, Trash2, X } from "lucide-react";
import type { CustomFood, DayLog, FoodEntry, FoodSearchResult, Meal, Profile, Totals } from "../../types";
import { MEALS, defaultMeal } from "../../constants";
import { AiError, askAi, cacheFoodSearch, cachedFoodSearch, parseJsonArray } from "../../lib/ai";
import { foodSearchPrompt } from "../../lib/prompts";
import { nextId } from "../../lib/id";
import { storage } from "../../lib/storage";
import { upsertLoggedFoods, type QuickFood } from "../../lib/foods";
import { searchFoods } from "../../lib/search";
import { AiChef } from "../AiChef";
import { BarcodeScanner } from "../BarcodeScanner";
import { PhotoFood } from "../PhotoFood";
import { CustomFoodForm } from "../CustomFoodForm";
import { RecentFoods } from "../RecentFoods";
import { Sheet } from "../Sheet";

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
  const [customFoods, setCustomFoods] = useState<CustomFood[]>(() => storage.loadCustomFoods());
  const [showScanner, setShowScanner] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [showChef, setShowChef] = useState(false);

  const saveCustomFood = (food: CustomFood) => {
    const next = [food, ...customFoods];
    setCustomFoods(next);
    storage.saveCustomFoods(next);
    pick(food.name, food.kcal, food.p, food.f, food.c, food.portion ?? 100);
    setShowCustom(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /* единая точка записи в дневник: пишем день + автосохраняем еду в базу */
  const logEntries = (entries: FoodEntry[]) => {
    saveDay({ ...day, foods: [...day.foods, ...entries] });
    const next = upsertLoggedFoods(entries, customFoods);
    if (next !== customFoods) {
      setCustomFoods(next);
      storage.saveCustomFoods(next);
    }
  };

  /* недавнее/частое — из всей истории дневника; day/customFoods в deps как триггер пересчёта после записи */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const days = useMemo(() => storage.allDays(), [day, customFoods]);

  /* выбор недавнего/частого: открываем редактор с запомненным весом — вес можно изменить перед записью */
  const pickQuick = (q: QuickFood) => {
    const per = 100 / q.grams;
    pick(q.name, q.kcal * per, q.p * per, q.f * per, q.c * per, q.grams);
    setMeal(q.meal);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const deleteCustomFood = (id: number) => {
    const next = customFoods.filter((x) => x.id !== id);
    setCustomFoods(next);
    storage.saveCustomFoods(next);
  };

  /* умный локальный поиск: свои блюда + встроенная база, нечёткое совпадение и ранжирование */
  const local = useMemo(() => searchFoods(q, customFoods, 8), [q, customFoods]);

  const aiSearch = async () => {
    const query = q.trim();
    if (query.length < 2) return;
    const cached = cachedFoodSearch(query);
    if (cached) {
      setAiResults(cached);
      setAiError("");
      return;
    }
    setAiLoading(true);
    setAiError("");
    setAiResults(null);
    try {
      const text = await askAi(foodSearchPrompt(query), 1000, { fast: true });
      const results = parseJsonArray<FoodSearchResult>(text);
      setAiResults(results);
      cacheFoodSearch(query, results);
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
    logEntries([
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
    ]);
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
    <div className="space-y-10">
      {/* поиск */}
      <section>
        <label htmlFor="fq" className="eyebrow">
          Что съели?
        </label>
        <div className="flex gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-dim absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              id="fq"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setAiResults(null);
                setAiError("");
              }}
              placeholder="гречка, шаурма, борщ…"
              className="w-full bg-surface rounded-full pl-11 pr-4 py-3 text-base"
            />
          </div>
          <button
            onClick={aiSearch}
            disabled={aiLoading}
            className="bg-accent hover:bg-accent-soft disabled:opacity-50 transition-all duration-150 text-accent-ink rounded-full px-5 cursor-pointer flex items-center gap-1.5 font-semibold"
            aria-label="Поиск через AI"
          >
            {aiLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            <span className="hidden sm:inline">AI</span>
          </button>
        </div>

        {local.length > 0 && !picked && (
          <ul className="mt-4">
            {local.map((item) => (
              <li key={item.id ?? item.name} className="border-b border-line first:border-t flex items-center gap-1">
                <button
                  onClick={() => pick(item.name, item.kcal, item.p, item.f, item.c, item.portion ?? (item.name.includes("Протеин") ? 30 : 100))}
                  className="flex-1 min-w-0 text-left py-3 cursor-pointer flex justify-between items-baseline gap-3 hover:text-accent transition-colors duration-150"
                >
                  <span className="text-sm truncate">
                    {item.name}
                    {item.id !== null && <span className="text-accent text-xs ml-2">своё</span>}
                  </span>
                  <span className="text-xs text-dim shrink-0 disp">
                    {Math.round(item.kcal)} ккал · Б{item.p}
                  </span>
                </button>
                {item.id !== null && (
                  <button
                    onClick={() => deleteCustomFood(item.id!)}
                    className="text-dim hover:text-danger cursor-pointer p-2 shrink-0"
                    aria-label={`Удалить «${item.name}» из базы`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        {q.length >= 2 && local.length === 0 && !aiResults && !aiLoading && !picked && (
          <p className="text-xs text-dim mt-3">
            Нет в базе — нажмите <b className="text-accent">AI</b>, и калорийность определится автоматически.
          </p>
        )}

        {aiError && (
          <p role="alert" className="text-sm text-danger mt-3">
            {aiError}
          </p>
        )}

        {aiResults && (
          <ul className="mt-4">
            {aiResults.map((r, i) => (
              <li key={i} className="border-b border-line first:border-t">
                <button
                  onClick={() => pick(r.name, r.kcal, r.p, r.f, r.c, r.portion)}
                  className="w-full text-left py-3 cursor-pointer hover:text-accent transition-colors duration-150"
                >
                  <div className="flex justify-between items-baseline gap-3">
                    <span className="text-sm">{r.name}</span>
                    <span className="text-xs text-dim shrink-0 disp">{Math.round(r.kcal)} ккал/100г</span>
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
          <div className="mt-5 border-t border-accent/40 pt-4">
            <div className="flex justify-between items-start">
              <div className="text-sm font-medium pr-2">{picked.name}</div>
              <button
                onClick={() => setPicked(null)}
                className="text-dim hover:text-fg cursor-pointer p-2 -mt-1.5"
                aria-label="Отмена"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex gap-3 mt-3 items-end">
              <input
                type="number"
                inputMode="decimal"
                value={grams}
                onChange={(e) => setGrams(e.target.value)}
                className="w-24 shrink-0 bg-transparent border-b border-line focus:border-accent transition-colors px-1 py-1.5 disp text-2xl font-medium outline-none"
                aria-label="Граммы"
              />
              <span className="text-dim text-sm pb-2">г</span>
              <select
                value={meal}
                onChange={(e) => setMeal(e.target.value as Meal)}
                className="flex-1 min-w-0 bg-surface rounded-full px-4 py-2.5 text-sm"
                aria-label="Приём пищи"
              >
                {MEALS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>
            {g > 0 && (
              <div className="text-xs text-dim mt-3 disp">
                = {Math.round((picked.kcal * g) / 100)} ккал · Б {Math.round((picked.p * g) / 100)} · Ж{" "}
                {Math.round((picked.f * g) / 100)} · У {Math.round((picked.c * g) / 100)}
              </div>
            )}
            <button
              onClick={add}
              className="mt-4 w-full bg-accent hover:bg-accent-soft active:scale-[0.98] transition-all duration-150 text-accent-ink font-semibold rounded-full py-3 cursor-pointer"
            >
              Записать
            </button>
          </div>
        )}
      </section>

      {/* добавить иначе: фото, штрихкод, своё блюдо */}
      <section>
        <div className="eyebrow">Ещё способы</div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <button
            onClick={() => setShowPhoto(true)}
            className="bg-raised hover:bg-raised-hover transition-colors duration-150 rounded-2xl py-3.5 flex flex-col items-center gap-1.5 cursor-pointer"
          >
            <Camera className="w-5 h-5 text-accent" strokeWidth={1.7} />
            <span className="text-xs text-body">Фото</span>
          </button>
          <button
            onClick={() => setShowScanner(true)}
            className="bg-raised hover:bg-raised-hover transition-colors duration-150 rounded-2xl py-3.5 flex flex-col items-center gap-1.5 cursor-pointer"
          >
            <ScanLine className="w-5 h-5 text-accent" strokeWidth={1.7} />
            <span className="text-xs text-body">Штрихкод</span>
          </button>
          <button
            onClick={() => setShowCustom(true)}
            className="bg-raised hover:bg-raised-hover transition-colors duration-150 rounded-2xl py-3.5 flex flex-col items-center gap-1.5 cursor-pointer"
          >
            <NotebookPen className="w-5 h-5 text-accent" strokeWidth={1.7} />
            <span className="text-xs text-body">Своё блюдо</span>
          </button>
        </div>
      </section>

      {/* недавнее и частое — быстрый повтор */}
      <RecentFoods days={days} onPick={pickQuick} />

      {/* AI-повар — открывается шторкой */}
      <button
        onClick={() => setShowChef(true)}
        className="w-full flex items-center justify-between border-y border-line py-4 cursor-pointer"
      >
        <span className="flex items-center gap-2.5 text-sm text-body font-medium">
          <ChefHat className="w-4 h-4 text-accent" strokeWidth={1.6} /> Что приготовить из остатка?
        </span>
        <ChevronRight className="w-4 h-4 text-dim" />
      </button>

      {/* дневник */}
      <section>
        <div className="flex justify-between items-baseline">
          <span className="eyebrow">Дневник за день</span>
          <span className="disp text-base font-medium">
            {Math.round(totals.kcal)} <span className="text-dim text-sm">/ {profile.kcalTarget}</span>
          </span>
        </div>
        {day.foods.length === 0 && (
          <p className="text-sm text-dim py-6 text-center">Пока пусто. Найдите продукт выше и нажмите «Записать».</p>
        )}
        {MEALS.filter((m) => byMeal.has(m)).map((m) => (
          <div key={m} className="mt-5">
            <div className="text-xs text-accent font-medium mb-1 disp uppercase tracking-wider">
              {m} · {Math.round(byMeal.get(m)!.reduce((s, f) => s + f.kcal, 0))} ккал
            </div>
            <ul>
              {byMeal.get(m)!.map((f) => (
                <li key={f.id} className="flex items-center justify-between border-b border-line py-2.5 first:border-t">
                  <div className="min-w-0">
                    <div className="text-sm truncate">{f.name}</div>
                    <div className="text-xs text-dim disp">
                      {Math.round(f.grams)} г · {Math.round(f.kcal)} ккал · Б {Math.round(f.p)}
                    </div>
                  </div>
                  <button
                    onClick={() => saveDay({ ...day, foods: day.foods.filter((x) => x.id !== f.id) })}
                    className="text-dim hover:text-danger cursor-pointer p-2 shrink-0"
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

      {showPhoto && (
        <PhotoFood
          onConfirm={(entries) => {
            logEntries(entries);
            setShowPhoto(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onClose={() => setShowPhoto(false)}
        />
      )}

      {showScanner && (
        <BarcodeScanner
          onPicked={(r) => {
            pick(r.name, r.kcal, r.p, r.f, r.c, r.portion);
            setShowScanner(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showCustom && (
        <Sheet
          title="Своё блюдо в базу"
          icon={<NotebookPen className="w-4 h-4 text-accent" strokeWidth={1.6} />}
          onClose={() => setShowCustom(false)}
        >
          <CustomFoodForm customFoods={customFoods} onSave={saveCustomFood} />
        </Sheet>
      )}

      {showChef && (
        <Sheet
          title="Что приготовить из остатка?"
          icon={<ChefHat className="w-4 h-4 text-accent" strokeWidth={1.6} />}
          onClose={() => setShowChef(false)}
        >
          <AiChef day={day} logEntries={logEntries} totals={totals} profile={profile} />
        </Sheet>
      )}
    </div>
  );
}
