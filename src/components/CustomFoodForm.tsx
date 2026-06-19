import { useState } from "react";
import type { CustomFood } from "../types";
import { nextId } from "../lib/id";
import { DishBuilder } from "./DishBuilder";

interface Props {
  /** Существующие свои блюда — нужны конструктору для поиска ингредиентов. */
  customFoods: CustomFood[];
  onSave: (food: CustomFood) => void;
}

type Mode = "manual" | "build";

/** Контент «Своё блюдо» для шторки: КБЖУ вручную (основной способ) или сборка из продуктов. */
export function CustomFoodForm({ customFoods, onSave }: Props) {
  const [mode, setMode] = useState<Mode>("manual");
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [p, setP] = useState("");
  const [f, setF] = useState("");
  const [c, setC] = useState("");

  const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;
  const valid = name.trim().length >= 2 && num(kcal) > 0;

  const saveManual = () => {
    if (!valid) return;
    onSave({ id: nextId(), name: name.trim(), kcal: num(kcal), p: num(p), f: num(f), c: num(c) });
    setName("");
    setKcal("");
    setP("");
    setF("");
    setC("");
  };

  const fields: Array<[string, string, (v: string) => void]> = [
    ["ккал", kcal, setKcal],
    ["Б", p, setP],
    ["Ж", f, setF],
    ["У", c, setC],
  ];

  const tab = (m: Mode, label: string) => (
    <button
      onClick={() => setMode(m)}
      className={`flex-1 rounded-full py-2 text-sm font-medium cursor-pointer transition-colors duration-150 ${
        mode === m ? "bg-accent text-accent-ink" : "bg-surface text-muted hover:text-fg"
      }`}
      aria-pressed={mode === m}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {tab("manual", "КБЖУ вручную")}
        {tab("build", "Из продуктов")}
      </div>

      {mode === "manual" ? (
        <>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Название, например «Плов мамин»"
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
          <p className="text-xs text-dim mt-2">Значения на 100 г. Блюдо появится в обычном поиске.</p>
          <button
            onClick={saveManual}
            disabled={!valid}
            className="mt-3 w-full bg-accent hover:bg-accent-soft disabled:opacity-50 active:scale-[0.98] transition-all duration-150 text-accent-ink font-semibold rounded-full py-3 cursor-pointer"
          >
            Сохранить в базу
          </button>
        </>
      ) : (
        <DishBuilder embedded customFoods={customFoods} onSave={onSave} />
      )}
    </div>
  );
}
