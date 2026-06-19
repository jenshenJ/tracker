import { useMemo, useState } from "react";
import { ChefHat, ChevronRight, Loader2, Plus, Search, Sparkles, X } from "lucide-react";
import type { CustomFood, CustomFoodItem, FoodSearchResult } from "../types";
import { FOOD_DB } from "../constants/foodDb";
import { AiError, askAi, parseJsonArray } from "../lib/ai";
import { foodSearchPrompt } from "../lib/prompts";
import { nextId } from "../lib/id";

interface Props {
  /** Свои блюда — чтобы их тоже можно было класть в новое блюдо как ингредиент. */
  customFoods: CustomFood[];
  onSave: (food: CustomFood) => void;
  /** Встроенный режим: без собственного сворачиваемого заголовка (всегда раскрыт). */
  embedded?: boolean;
}

/** Ингредиент в конструкторе: КБЖУ на 100 г + выбранная граммовка. */
interface Ing {
  name: string;
  kcal: number;
  p: number;
  f: number;
  c: number;
  grams: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Конструктор «Своё блюдо»: собрать из продуктов (поиск + AI), сохранить как одно блюдо. */
export function DishBuilder({ customFoods, onSave, embedded }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [items, setItems] = useState<Ing[]>([]);
  const [q, setQ] = useState("");
  const [aiResults, setAiResults] = useState<FoodSearchResult[] | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const local = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (s.length < 2) return [];
    const own = customFoods
      .filter((x) => x.name.toLowerCase().includes(s))
      .map((x) => ({ name: x.name, kcal: x.kcal, p: x.p, f: x.f, c: x.c, portion: x.portion ?? 100, own: true }));
    const builtin = FOOD_DB.filter((x) => x[0].toLowerCase().includes(s)).map(([n, kcal, p, f, c]) => ({
      name: n,
      kcal,
      p,
      f,
      c,
      portion: 100,
      own: false,
    }));
    return [...own, ...builtin].slice(0, 6);
  }, [q, customFoods]);

  const addIng = (i: Ing) => {
    setItems((prev) => [...prev, i]);
    setQ("");
    setAiResults(null);
    setAiError("");
  };

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
      setAiError(e instanceof AiError ? e.message : "Не получилось распознать. Попробуйте переформулировать.");
    } finally {
      setAiLoading(false);
    }
  };

  const setGrams = (idx: number, val: string) => {
    const g = parseFloat(val.replace(",", ".")) || 0;
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, grams: g } : it)));
  };

  const total = useMemo(() => {
    let grams = 0,
      kcal = 0,
      p = 0,
      f = 0,
      c = 0;
    for (const it of items) {
      const k = it.grams / 100;
      grams += it.grams;
      kcal += it.kcal * k;
      p += it.p * k;
      f += it.f * k;
      c += it.c * k;
    }
    return { grams, kcal, p, f, c };
  }, [items]);

  const valid = name.trim().length >= 2 && items.length > 0 && total.grams > 0;

  const save = () => {
    if (!valid) return;
    const per = 100 / total.grams;
    const dishItems: CustomFoodItem[] = items.map((it) => {
      const k = it.grams / 100;
      return {
        name: it.name,
        grams: Math.round(it.grams),
        kcal: Math.round(it.kcal * k),
        p: round1(it.p * k),
        f: round1(it.f * k),
        c: round1(it.c * k),
      };
    });
    onSave({
      id: nextId(),
      name: name.trim(),
      kcal: Math.round(total.kcal * per),
      p: round1(total.p * per),
      f: round1(total.f * per),
      c: round1(total.c * per),
      portion: Math.round(total.grams),
      items: dishItems,
    });
    setName("");
    setItems([]);
    setQ("");
    setAiResults(null);
    setOpen(false);
  };

  const body = (
    <div className={embedded ? "" : "mt-4"}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название, например «Плов мамин»"
            className="w-full bg-surface rounded-full px-4 py-3 text-sm"
            aria-label="Название блюда"
          />

          {/* состав */}
          {items.length > 0 && (
            <ul className="mt-4 space-y-1">
              {items.map((it, idx) => (
                <li key={idx} className="flex items-center gap-2 border-b border-line py-2 first:border-t">
                  <span className="text-sm flex-1 min-w-0 truncate">{it.name}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={it.grams || ""}
                    onChange={(e) => setGrams(idx, e.target.value)}
                    className="w-16 shrink-0 bg-transparent border-b border-line focus:border-accent transition-colors text-right disp px-1 py-0.5 outline-none"
                    aria-label={`Граммы: ${it.name}`}
                  />
                  <span className="text-xs text-dim shrink-0">г</span>
                  <span className="text-xs text-dim shrink-0 disp w-16 text-right">
                    {Math.round((it.kcal * it.grams) / 100)} ккал
                  </span>
                  <button
                    onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-dim hover:text-danger cursor-pointer p-1 shrink-0"
                    aria-label={`Убрать ${it.name}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* поиск ингредиента */}
          <div className="flex gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-dim absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setAiResults(null);
                  setAiError("");
                }}
                placeholder="добавить продукт…"
                className="w-full bg-surface rounded-full pl-11 pr-4 py-2.5 text-sm"
                aria-label="Поиск ингредиента"
              />
            </div>
            <button
              onClick={aiSearch}
              disabled={aiLoading || q.trim().length < 2}
              className="bg-raised hover:bg-raised-hover disabled:opacity-50 transition-all duration-150 rounded-full px-4 cursor-pointer flex items-center gap-1.5 text-sm font-medium"
              aria-label="Поиск ингредиента через AI"
            >
              {aiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-accent" />}
              <span className="hidden sm:inline">AI</span>
            </button>
          </div>

          {local.length > 0 && (
            <ul className="mt-2">
              {local.map((r, i) => (
                <li key={i} className="border-b border-line first:border-t">
                  <button
                    onClick={() => addIng({ name: r.name, kcal: r.kcal, p: r.p, f: r.f, c: r.c, grams: r.portion })}
                    className="w-full text-left py-2.5 cursor-pointer flex justify-between items-baseline gap-3 hover:text-accent transition-colors"
                  >
                    <span className="text-sm truncate">
                      {r.name}
                      {r.own && <span className="text-accent text-xs ml-2">своё</span>}
                    </span>
                    <span className="text-xs text-dim shrink-0 disp">{Math.round(r.kcal)} ккал/100г</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {aiError && (
            <p role="alert" className="text-sm text-danger mt-2">
              {aiError}
            </p>
          )}

          {aiResults && (
            <ul className="mt-2">
              {aiResults.map((r, i) => (
                <li key={i} className="border-b border-line first:border-t">
                  <button
                    onClick={() => addIng({ name: r.name, kcal: r.kcal, p: r.p, f: r.f, c: r.c, grams: r.portion ?? 100 })}
                    className="w-full text-left py-2.5 cursor-pointer hover:text-accent transition-colors"
                  >
                    <div className="flex justify-between items-baseline gap-3">
                      <span className="text-sm">{r.name}</span>
                      <span className="text-xs text-dim shrink-0 disp">{Math.round(r.kcal)} ккал/100г</span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* итог + сохранение */}
          {items.length > 0 && (
            <div className="text-xs text-dim mt-4 disp">
              Итого: {Math.round(total.grams)} г · {Math.round(total.kcal)} ккал · Б {Math.round(total.p)} · Ж{" "}
              {Math.round(total.f)} · У {Math.round(total.c)}
            </div>
          )}
          <button
            onClick={save}
            disabled={!valid}
            className="mt-3 w-full bg-accent hover:bg-accent-soft disabled:opacity-50 active:scale-[0.98] transition-all duration-150 text-accent-ink font-semibold rounded-full py-3 cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Сохранить блюдо в базу
          </button>
          <p className="text-xs text-dim mt-2">
            Блюдо появится в поиске; при записи можно взять целую порцию ({total.grams ? Math.round(total.grams) : "—"} г) или
            изменить вес.
          </p>
    </div>
  );

  if (embedded) return body;

  return (
    <section className="border-y border-line py-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between cursor-pointer" aria-expanded={open}>
        <span className="flex items-center gap-2.5 text-sm text-body font-medium">
          <ChefHat className="w-4 h-4 text-accent" strokeWidth={1.6} /> Своё блюдо — собрать из продуктов
        </span>
        <ChevronRight className={`w-4 h-4 text-dim transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </button>
      {open && body}
    </section>
  );
}
