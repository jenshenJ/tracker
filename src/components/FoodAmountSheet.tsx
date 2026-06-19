import { useMemo, useState, type ReactNode } from "react";
import { Star } from "lucide-react";
import type { Meal } from "../types";
import { MEALS } from "../constants";
import { Sheet } from "./Sheet";

interface Props {
  title: string;
  icon?: ReactNode;
  name: string;
  /** КБЖУ на 100 г. */
  per100: { kcal: number; p: number; f: number; c: number };
  grams: number;
  meal: Meal;
  submitLabel: string;
  onClose: () => void;
  onSubmit: (grams: number, meal: Meal) => void;
  /** Если задано — показываем звезду «в избранное» с текущей граммовкой/приёмом. */
  onFavorite?: (grams: number, meal: Meal) => void;
}

/** Модалка ввода граммовки и приёма пищи с пересчётом КБЖУ — для записи/правки одного продукта. */
export function FoodAmountSheet({ title, icon, name, per100, grams: g0, meal: m0, submitLabel, onClose, onSubmit, onFavorite }: Props) {
  const [grams, setGrams] = useState(String(g0));
  const [meal, setMeal] = useState<Meal>(m0);
  const [favSaved, setFavSaved] = useState(false);
  const g = parseFloat(grams) || 0;

  const t = useMemo(() => {
    const k = g / 100;
    return { kcal: per100.kcal * k, p: per100.p * k, f: per100.f * k, c: per100.c * k };
  }, [g, per100]);

  return (
    <Sheet title={title} icon={icon} onClose={onClose}>
      <div className="flex items-start justify-between gap-2 mb-4">
        <div className="text-sm font-medium">{name}</div>
        {onFavorite && (
          <button
            onClick={() => {
              onFavorite(g, meal);
              setFavSaved(true);
            }}
            disabled={favSaved || !g}
            className={`cursor-pointer p-1 -mt-0.5 shrink-0 transition-colors disabled:cursor-default ${favSaved ? "text-accent" : "text-dim hover:text-accent"}`}
            aria-label={favSaved ? "В избранном" : "В избранное"}
            title={favSaved ? "Добавлено в избранное" : "В избранное"}
          >
            <Star className="w-4 h-4" strokeWidth={1.7} fill={favSaved ? "currentColor" : "none"} />
          </button>
        )}
      </div>
      <div className="flex gap-3 items-end">
        <input
          type="number"
          inputMode="decimal"
          value={grams}
          onChange={(e) => {
            setGrams(e.target.value);
            setFavSaved(false);
          }}
          className="w-24 shrink-0 bg-transparent border-b border-line focus:border-accent transition-colors px-1 py-1.5 disp text-2xl font-medium outline-none"
          aria-label="Граммы"
          autoFocus
        />
        <span className="text-dim text-sm pb-2">г</span>
        <select
          value={meal}
          onChange={(e) => {
            setMeal(e.target.value as Meal);
            setFavSaved(false);
          }}
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
          = {Math.round(t.kcal)} ккал · Б {Math.round(t.p)} · Ж {Math.round(t.f)} · У {Math.round(t.c)}
        </div>
      )}
      <button
        onClick={() => onSubmit(g, meal)}
        disabled={!g}
        className="mt-4 w-full bg-accent hover:bg-accent-soft active:scale-[0.98] disabled:opacity-50 transition-all duration-150 text-accent-ink font-semibold rounded-full py-3 cursor-pointer"
      >
        {submitLabel}
      </button>
    </Sheet>
  );
}
