import { useState } from "react";
import { Pencil } from "lucide-react";
import type { CustomFood } from "../types";
import { Sheet } from "./Sheet";

interface Props {
  food: CustomFood;
  onSave: (food: CustomFood) => void;
  onClose: () => void;
}

/** Правка своего блюда в базе: название и КБЖУ на 100 г (и порция по умолчанию). */
export function EditCustomFoodSheet({ food, onSave, onClose }: Props) {
  const [name, setName] = useState(food.name);
  const [kcal, setKcal] = useState(String(food.kcal));
  const [p, setP] = useState(String(food.p));
  const [f, setF] = useState(String(food.f));
  const [c, setC] = useState(String(food.c));

  const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;
  const valid = name.trim().length >= 2 && num(kcal) > 0;

  const fields: Array<[string, string, (v: string) => void]> = [
    ["ккал", kcal, setKcal],
    ["Б", p, setP],
    ["Ж", f, setF],
    ["У", c, setC],
  ];

  const save = () => {
    if (!valid) return;
    onSave({ ...food, name: name.trim(), kcal: num(kcal), p: num(p), f: num(f), c: num(c) });
  };

  return (
    <Sheet title="Изменить блюдо" icon={<Pencil className="w-4 h-4 text-accent" strokeWidth={1.6} />} onClose={onClose}>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Название"
        className="w-full bg-surface rounded-full px-4 py-3 text-sm"
        aria-label="Название блюда"
      />
      <div className="grid grid-cols-4 gap-3 mt-3">
        {fields.map(([label, val, set]) => (
          <label key={label} className="block border-b border-line focus-within:border-accent transition-colors">
            <span className="text-xs text-dim">{label}</span>
            <input
              type="number"
              inputMode="decimal"
              value={val}
              onChange={(e) => set(e.target.value)}
              placeholder="0"
              className="w-full min-w-0 bg-transparent disp text-lg font-medium outline-none py-1"
              aria-label={`${label} на 100 г`}
            />
          </label>
        ))}
      </div>
      <p className="text-xs text-dim mt-2">Значения на 100 г. Изменения не затронут уже сделанные записи в дневнике.</p>
      <button
        onClick={save}
        disabled={!valid}
        className="mt-3 w-full bg-accent hover:bg-accent-soft disabled:opacity-50 active:scale-[0.98] transition-all duration-150 text-accent-ink font-semibold rounded-full py-3 cursor-pointer"
      >
        Сохранить
      </button>
    </Sheet>
  );
}
