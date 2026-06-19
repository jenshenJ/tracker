import { useMemo, useState } from "react";
import { Camera, ChefHat, ChevronRight, Loader2, Mic, NotebookPen, Pencil, ScanLine, Search, Sparkles, Star, Trash2, X } from "lucide-react";
import type { CustomFood, CustomFoodItem, DayLog, FavoriteMeal, FoodEntry, FoodSearchResult, Meal, Profile, Totals } from "../../types";
import { MEALS, defaultMeal } from "../../constants";
import { AiError, askAi, cacheFoodSearch, cachedFoodSearch, parseJsonArray } from "../../lib/ai";
import { foodSearchPrompt } from "../../lib/prompts";
import { nextId } from "../../lib/id";
import { storage } from "../../lib/storage";
import { upsertLoggedFoods, type QuickFood } from "../../lib/foods";
import { favoriteFromEntries, favoriteSingle } from "../../lib/favorites";
import { searchFoods } from "../../lib/search";
import { AiChef } from "../AiChef";
import { FavoriteMeals } from "../FavoriteMeals";
import { FoodAmountSheet } from "../FoodAmountSheet";
import { EditCustomFoodSheet } from "../EditCustomFoodSheet";
import { BarcodeScanner } from "../BarcodeScanner";
import { PhotoFood } from "../PhotoFood";
import { VoiceFood } from "../VoiceFood";
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

/** Состояние модалки записи/правки одного продукта (КБЖУ хранится на 100 г). */
interface AmountSheet {
  mode: "add" | "edit";
  title: string;
  name: string;
  per100: { kcal: number; p: number; f: number; c: number };
  grams: number;
  meal: Meal;
  /** id записи дневника при mode==="edit". */
  entryId?: number;
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
  const [favorites, setFavorites] = useState<FavoriteMeal[]>(() => storage.loadFavoriteMeals());
  const [savingMeal, setSavingMeal] = useState<Meal | null>(null);
  const [favName, setFavName] = useState("");
  const [favSaved, setFavSaved] = useState(false);
  const [amountSheet, setAmountSheet] = useState<AmountSheet | null>(null);
  const [editFood, setEditFood] = useState<CustomFood | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [showVoice, setShowVoice] = useState(false);
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

  /* выбор недавнего/частого: модалка с запомненным весом — вес/приём можно изменить перед записью */
  const pickQuick = (q: QuickFood) => {
    const per = 100 / q.grams;
    setAmountSheet({
      mode: "add",
      title: "Записать",
      name: q.name,
      per100: { kcal: q.kcal * per, p: q.p * per, f: q.f * per, c: q.c * per },
      grams: q.grams,
      meal: q.meal,
    });
  };

  /* правка уже добавленной записи дневника: модалка граммовки/приёма */
  const editEntry = (f: FoodEntry) => {
    const per = 100 / (f.grams || 100);
    setAmountSheet({
      mode: "edit",
      title: "Изменить запись",
      name: f.name,
      per100: { kcal: f.kcal * per, p: f.p * per, f: f.f * per, c: f.c * per },
      grams: f.grams,
      meal: f.meal,
      entryId: f.id,
    });
  };

  /* запись из модалки: новая запись (add) или обновление существующей (edit) */
  const submitAmount = (grams: number, meal: Meal) => {
    if (!amountSheet) return;
    const k = grams / 100;
    const per = amountSheet.per100;
    const vals = { grams, kcal: per.kcal * k, p: per.p * k, f: per.f * k, c: per.c * k };
    if (amountSheet.mode === "edit" && amountSheet.entryId != null) {
      saveDay({
        ...day,
        foods: day.foods.map((x) => (x.id === amountSheet.entryId ? { ...x, meal, ...vals } : x)),
      });
    } else {
      logEntries([{ id: nextId(), meal, name: amountSheet.name, ...vals }]);
    }
    setAmountSheet(null);
  };

  /* правка своего блюда в базе */
  const saveEditedFood = (updated: CustomFood) => {
    const next = customFoods.map((x) => (x.id === updated.id ? updated : x));
    setCustomFoods(next);
    storage.saveCustomFoods(next);
    setEditFood(null);
  };

  const deleteCustomFood = (id: number) => {
    const next = customFoods.filter((x) => x.id !== id);
    setCustomFoods(next);
    storage.saveCustomFoods(next);
  };

  /* избранные приёмы пищи */
  const persistFavorites = (next: FavoriteMeal[]) => {
    setFavorites(next);
    storage.saveFavoriteMeals(next);
  };

  const confirmSaveFavorite = () => {
    if (!savingMeal) return;
    const entries = day.foods.filter((f) => f.meal === savingMeal);
    if (entries.length === 0) return;
    const name = favName.trim() || savingMeal;
    persistFavorites([favoriteFromEntries(name, savingMeal, entries), ...favorites]);
    setSavingMeal(null);
    setFavName("");
  };

  const deleteFavorite = (id: number) => persistFavorites(favorites.filter((f) => f.id !== id));

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
    setFavSaved(false);
  };

  /* сохранить выбранный продукт в избранное (как избранное из одного пункта, с текущей граммовкой и приёмом) */
  const saveFoodFavorite = () => {
    if (!picked) return;
    const gNum = parseFloat(grams) || 100;
    const k = gNum / 100;
    const item: CustomFoodItem = {
      name: picked.name,
      grams: gNum,
      kcal: picked.kcal * k,
      p: picked.p * k,
      f: picked.f * k,
      c: picked.c * k,
    };
    persistFavorites([favoriteSingle(picked.name, meal, item), ...favorites]);
    setFavSaved(true);
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
          <button
            onClick={() => setShowVoice(true)}
            className="bg-surface hover:bg-raised-hover transition-colors duration-150 text-accent rounded-full px-4 cursor-pointer flex items-center justify-center shrink-0"
            aria-label="Записать голосом"
          >
            <Mic className="w-5 h-5" />
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
                  <>
                    <button
                      onClick={() => {
                        const fc = customFoods.find((x) => x.id === item.id);
                        if (fc) setEditFood(fc);
                      }}
                      className="text-dim hover:text-accent cursor-pointer p-2 shrink-0"
                      aria-label={`Изменить «${item.name}»`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteCustomFood(item.id!)}
                      className="text-dim hover:text-danger cursor-pointer p-2 shrink-0"
                      aria-label={`Удалить «${item.name}» из базы`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
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
              <div className="flex items-center shrink-0 -mt-1.5">
                <button
                  onClick={saveFoodFavorite}
                  disabled={favSaved}
                  className={`cursor-pointer p-2 transition-colors ${favSaved ? "text-accent" : "text-dim hover:text-accent"}`}
                  aria-label={favSaved ? "В избранном" : "В избранное"}
                  title={favSaved ? "Добавлено в избранное" : "В избранное"}
                >
                  <Star className="w-4 h-4" strokeWidth={1.7} fill={favSaved ? "currentColor" : "none"} />
                </button>
                <button
                  onClick={() => setPicked(null)}
                  className="text-dim hover:text-fg cursor-pointer p-2"
                  aria-label="Отмена"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
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

      {/* избранные приёмы пищи — типовой набор в один тап */}
      <FavoriteMeals favorites={favorites} onLog={logEntries} onDelete={deleteFavorite} />

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
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs text-accent font-medium disp uppercase tracking-wider">
                {m} · {Math.round(byMeal.get(m)!.reduce((s, f) => s + f.kcal, 0))} ккал
              </div>
              <button
                onClick={() => {
                  setSavingMeal(m);
                  setFavName(m);
                }}
                className="flex items-center gap-1 text-xs text-dim hover:text-accent cursor-pointer p-1 -mr-1"
                aria-label={`Сохранить «${m}» в избранное`}
              >
                <Star className="w-3.5 h-3.5" strokeWidth={1.7} />
                <span>в избранное</span>
              </button>
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
                  <div className="flex items-center shrink-0">
                    <button
                      onClick={() => editEntry(f)}
                      className="text-dim hover:text-accent cursor-pointer p-2"
                      aria-label="Изменить запись"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => saveDay({ ...day, foods: day.foods.filter((x) => x.id !== f.id) })}
                      className="text-dim hover:text-danger cursor-pointer p-2"
                      aria-label="Удалить запись"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {showVoice && (
        <VoiceFood
          onConfirm={(entries) => {
            logEntries(entries);
            setShowVoice(false);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onClose={() => setShowVoice(false)}
        />
      )}

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

      {savingMeal && (
        <Sheet
          title="В избранное"
          icon={<Star className="w-4 h-4 text-accent" strokeWidth={1.6} />}
          onClose={() => setSavingMeal(null)}
        >
          <p className="text-xs text-dim mb-4">
            Сохраним «{savingMeal}» ({day.foods.filter((f) => f.meal === savingMeal).length} поз.) как избранный приём пищи —
            записать его потом можно будет в один тап.
          </p>
          <input
            value={favName}
            onChange={(e) => setFavName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && confirmSaveFavorite()}
            placeholder="Название, напр. «Мой завтрак»"
            className="w-full bg-surface rounded-full px-4 py-3 text-base"
            aria-label="Название избранного"
            autoFocus
          />
          <button
            onClick={confirmSaveFavorite}
            className="mt-4 w-full bg-accent hover:bg-accent-soft active:scale-[0.98] transition-all duration-150 text-accent-ink font-semibold rounded-full py-3 cursor-pointer"
          >
            Сохранить
          </button>
        </Sheet>
      )}

      {amountSheet && (
        <FoodAmountSheet
          title={amountSheet.title}
          name={amountSheet.name}
          per100={amountSheet.per100}
          grams={amountSheet.grams}
          meal={amountSheet.meal}
          submitLabel={amountSheet.mode === "edit" ? "Сохранить" : "Записать"}
          onSubmit={submitAmount}
          onFavorite={(grams, meal) => {
            const k = grams / 100;
            const per = amountSheet.per100;
            const item: CustomFoodItem = {
              name: amountSheet.name,
              grams,
              kcal: per.kcal * k,
              p: per.p * k,
              f: per.f * k,
              c: per.c * k,
            };
            persistFavorites([favoriteSingle(amountSheet.name, meal, item), ...favorites]);
          }}
          onClose={() => setAmountSheet(null)}
        />
      )}

      {editFood && <EditCustomFoodSheet food={editFood} onSave={saveEditedFood} onClose={() => setEditFood(null)} />}
    </div>
  );
}
