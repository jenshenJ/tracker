import { useMemo, useState } from "react";
import { ChevronRight, Star, Trash2, X } from "lucide-react";
import type { CustomFoodItem, FavoriteMeal, FoodEntry, Meal } from "../types";
import { MEALS } from "../constants";
import { favTotals, favoriteToEntries, scaleItem } from "../lib/favorites";
import { Sheet } from "./Sheet";

interface Props {
  favorites: FavoriteMeal[];
  /** Записать развёрнутый приём пищи в дневник. */
  onLog: (entries: FoodEntry[]) => void;
  onDelete: (id: number) => void;
}

/** Шторка предпросмотра: правка веса/состава перед записью избранного приёма пищи. */
function Preview({
  fav,
  onLog,
  onClose,
}: {
  fav: FavoriteMeal;
  onLog: (entries: FoodEntry[]) => void;
  onClose: () => void;
}) {
  const [items, setItems] = useState<CustomFoodItem[]>(fav.items);
  const [meal, setMeal] = useState<Meal>(fav.meal);

  const setGrams = (i: number, raw: string) => {
    const g = parseFloat(raw);
    setItems((prev) => prev.map((it, idx) => (idx === i ? scaleItem(it, Number.isFinite(g) ? g : 0) : it)));
  };
  const removeItem = (i: number) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const t = useMemo(() => favTotals(items), [items]);
  const canLog = items.some((it) => it.grams > 0);

  return (
    <Sheet title={fav.name} icon={<Star className="w-4 h-4 text-accent" strokeWidth={1.6} />} onClose={onClose}>
      <select
        value={meal}
        onChange={(e) => setMeal(e.target.value as Meal)}
        className="w-full bg-surface rounded-full px-4 py-2.5 text-sm mb-4"
        aria-label="Приём пищи"
      >
        {MEALS.map((m) => (
          <option key={m}>{m}</option>
        ))}
      </select>

      {items.length === 0 && <p className="text-sm text-dim py-4 text-center">Все пункты убраны.</p>}

      <ul>
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-3 border-b border-line py-3 first:border-t">
            <div className="min-w-0 flex-1">
              <div className="text-sm truncate">{it.name}</div>
              <div className="text-xs text-dim disp">
                {Math.round(it.kcal)} ккал · Б {Math.round(it.p)} · Ж {Math.round(it.f)} · У {Math.round(it.c)}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <input
                type="number"
                inputMode="decimal"
                value={it.grams}
                onChange={(e) => setGrams(i, e.target.value)}
                className="w-16 bg-transparent border-b border-line focus:border-accent transition-colors px-1 py-1 disp text-base text-right outline-none"
                aria-label={`Граммы — ${it.name}`}
              />
              <span className="text-dim text-xs">г</span>
            </div>
            <button
              onClick={() => removeItem(i)}
              className="text-dim hover:text-danger cursor-pointer p-1.5 shrink-0"
              aria-label={`Убрать «${it.name}»`}
            >
              <X className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>

      <div className="text-sm text-body mt-4 disp">
        Итого: {Math.round(t.kcal)} ккал · Б {Math.round(t.p)} · Ж {Math.round(t.f)} · У {Math.round(t.c)}
      </div>

      <button
        onClick={() => onLog(favoriteToEntries(items, meal))}
        disabled={!canLog}
        className="mt-4 w-full bg-accent hover:bg-accent-soft active:scale-[0.98] disabled:opacity-50 transition-all duration-150 text-accent-ink font-semibold rounded-full py-3 cursor-pointer"
      >
        Записать
      </button>
    </Sheet>
  );
}

/** Избранные приёмы пищи: типовой набор продуктов в один тап (с предпросмотром). */
export function FavoriteMeals({ favorites, onLog, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<FavoriteMeal | null>(null);

  if (favorites.length === 0) return null;

  return (
    <section className="border-b border-line py-4 first:border-t">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between cursor-pointer"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2.5 text-sm text-body font-medium">
          <Star className="w-4 h-4 text-accent" strokeWidth={1.6} /> Избранное
          <span className="text-dim text-xs disp">{favorites.length}</span>
        </span>
        <ChevronRight className={`w-4 h-4 text-dim transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="flex flex-wrap gap-2 mt-4">
          {favorites.map((f) => (
            <div
              key={f.id}
              className="shrink-0 flex items-center rounded-full bg-surface hover:bg-raised-hover transition-colors duration-150"
            >
              <button
                onClick={() => setActive(f)}
                className="flex items-center gap-1.5 pl-3.5 pr-2 py-2 text-sm cursor-pointer"
                title={`${f.name} · ${f.items.length} поз. · ${Math.round(favTotals(f.items).kcal)} ккал`}
              >
                <span className="truncate max-w-[11rem]">{f.name}</span>
                <span className="text-xs text-dim disp">{Math.round(favTotals(f.items).kcal)}</span>
              </button>
              <button
                onClick={() => onDelete(f.id)}
                className="text-dim hover:text-danger cursor-pointer pr-2.5 pl-1 py-2 shrink-0"
                aria-label={`Удалить «${f.name}» из избранного`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {active && (
        <Preview
          fav={active}
          onClose={() => setActive(null)}
          onLog={(entries) => {
            onLog(entries);
            setActive(null);
          }}
        />
      )}
    </section>
  );
}
