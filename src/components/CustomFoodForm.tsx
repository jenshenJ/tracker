import { useState } from "react";
import { ChevronRight, NotebookPen } from "lucide-react";
import type { CustomFood } from "../types";
import { nextId } from "../lib/id";

interface Props {
  onSave: (food: CustomFood) => void;
}

/** Форма «своё блюдо»: название + КБЖУ на 100 г, сохраняется в базу устройства. */
export function CustomFoodForm({ onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [p, setP] = useState("");
  const [f, setF] = useState("");
  const [c, setC] = useState("");

  const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;
  const valid = name.trim().length >= 2 && num(kcal) > 0;

  const save = () => {
    if (!valid) return;
    onSave({ id: nextId(), name: name.trim(), kcal: num(kcal), p: num(p), f: num(f), c: num(c) });
    setName("");
    setKcal("");
    setP("");
    setF("");
    setC("");
    setOpen(false);
  };

  const fields: Array<[string, string, (v: string) => void]> = [
    ["ккал", kcal, setKcal],
    ["Б", p, setP],
    ["Ж", f, setF],
    ["У", c, setC],
  ];

  return (
    <section className="border-y border-line py-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between cursor-pointer" aria-expanded={open}>
        <span className="flex items-center gap-2.5 text-sm text-body font-medium">
          <NotebookPen className="w-4 h-4 text-accent" strokeWidth={1.6} /> Своё блюдо — добавить в базу
        </span>
        <ChevronRight className={`w-4 h-4 text-dim transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="mt-4">
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
            onClick={save}
            disabled={!valid}
            className="mt-3 w-full bg-accent hover:bg-accent-soft disabled:opacity-50 active:scale-[0.98] transition-all duration-150 text-accent-ink font-semibold rounded-full py-3 cursor-pointer"
          >
            Сохранить в базу
          </button>
        </div>
      )}
    </section>
  );
}
