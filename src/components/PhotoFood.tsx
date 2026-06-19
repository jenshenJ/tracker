import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, RotateCcw, Trash2, X } from "lucide-react";
import type { FoodEntry, Meal } from "../types";
import { MEALS, defaultMeal } from "../constants";
import { AiError, askAi, parseJsonArray } from "../lib/ai";
import { foodPhotoPrompt } from "../lib/prompts";
import { fileToAiImage } from "../lib/image";
import { nextId } from "../lib/id";

interface Props {
  onConfirm: (entries: FoodEntry[]) => void;
  onClose: () => void;
}

/** Распознанный с фото продукт: КБЖУ на 100 г + оценка порции. */
interface PhotoItem {
  name: string;
  kcal: number;
  p: number;
  f: number;
  c: number;
  grams: number;
}

interface Row {
  id: number;
  name: string;
  per100: { kcal: number; p: number; f: number; c: number };
  grams: string;
  on: boolean;
}

type Status = "idle" | "analyzing" | "results" | "error";

const num = (s: string) => parseFloat(String(s).replace(",", ".")) || 0;
const round = (n: number) => Math.round(n);

/** Распознавание еды по фотографии: съёмка/выбор → AI-зрение → редактируемый список → запись. */
export function PhotoFood({ onConfirm, onClose }: Props) {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [preview, setPreview] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [meal, setMeal] = useState<Meal>(defaultMeal());
  const fileRef = useRef<HTMLInputElement>(null);

  /* при открытии сразу предлагаем камеру/галерею */
  useEffect(() => {
    fileRef.current?.click();
  }, []);

  const analyze = async (file: File) => {
    setStatus("analyzing");
    setError("");
    setRows([]);
    try {
      const { image, dataUrl } = await fileToAiImage(file);
      setPreview(dataUrl);
      const text = await askAi(foodPhotoPrompt(), 1500, { image });
      const items = parseJsonArray<PhotoItem>(text);
      const next: Row[] = items
        .filter((it) => it && typeof it.name === "string" && it.kcal > 0)
        .map((it) => ({
          id: nextId(),
          name: it.name.trim(),
          per100: { kcal: it.kcal, p: it.p || 0, f: it.f || 0, c: it.c || 0 },
          grams: String(Math.max(1, Math.round(it.grams || 100))),
          on: true,
        }));
      if (!next.length) throw new AiError("На фото не нашлось еды. Попробуйте снимок поближе и при хорошем свете.");
      setRows(next);
      setStatus("results");
    } catch (e) {
      console.error(e);
      setError(e instanceof AiError ? e.message : "Не получилось распознать. Попробуйте другое фото.");
      setStatus("error");
    }
  };

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // позволяем выбрать тот же файл повторно
    if (file) void analyze(file);
    else if (status === "idle") onClose(); // отмена выбора на пустом экране — закрываем
  };

  const portion = (r: Row) => {
    const k = num(r.grams) / 100;
    return { kcal: r.per100.kcal * k, p: r.per100.p * k, f: r.per100.f * k, c: r.per100.c * k };
  };

  const chosen = rows.filter((r) => r.on && num(r.grams) > 0);
  const sum = chosen.reduce(
    (acc, r) => {
      const p = portion(r);
      return { kcal: acc.kcal + p.kcal, p: acc.p + p.p, f: acc.f + p.f, c: acc.c + p.c };
    },
    { kcal: 0, p: 0, f: 0, c: 0 },
  );

  const confirm = () => {
    if (!chosen.length) return;
    const entries: FoodEntry[] = chosen.map((r) => {
      const p = portion(r);
      return { id: nextId(), meal, name: r.name, grams: num(r.grams), kcal: p.kcal, p: p.p, f: p.f, c: p.c };
    });
    onConfirm(entries);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-md bg-canvas border-t border-line sm:border sm:rounded-3xl rounded-t-3xl p-5 max-h-[92vh] overflow-y-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Camera className="w-4 h-4 text-accent" strokeWidth={1.8} /> Еда по фото
          </span>
          <button onClick={onClose} className="text-dim hover:text-fg cursor-pointer p-1" aria-label="Закрыть">
            <X className="w-5 h-5" />
          </button>
        </div>

        <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} className="hidden" />

        {preview && (
          <img src={preview} alt="Снимок еды" className="w-full max-h-56 object-cover rounded-2xl mb-4" />
        )}

        {status === "idle" && (
          <p className="text-sm text-dim flex items-center gap-2 py-6 justify-center">
            <Camera className="w-4 h-4" /> Откройте камеру или выберите фото…
          </p>
        )}

        {status === "analyzing" && (
          <p className="text-sm text-dim flex items-center gap-2 py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Распознаю блюда и считаю КБЖУ…
          </p>
        )}

        {status === "error" && (
          <div className="py-2">
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
            <button
              onClick={() => fileRef.current?.click()}
              className="mt-3 text-sm text-accent cursor-pointer flex items-center gap-1.5"
            >
              <RotateCcw className="w-4 h-4" /> Другое фото
            </button>
          </div>
        )}

        {status === "results" && (
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="eyebrow">Что на тарелке</span>
              <select
                value={meal}
                onChange={(e) => setMeal(e.target.value as Meal)}
                className="bg-surface rounded-full px-4 py-2 text-sm"
                aria-label="Приём пищи"
              >
                {MEALS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </div>

            <ul>
              {rows.map((r) => {
                const p = portion(r);
                return (
                  <li key={r.id} className="border-b border-line first:border-t py-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={r.on}
                        onChange={(e) => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, on: e.target.checked } : x)))}
                        className="w-4 h-4 accent-[var(--color-accent)] shrink-0"
                        aria-label={`Включить «${r.name}»`}
                      />
                      <div className={`flex-1 min-w-0 ${r.on ? "" : "opacity-40"}`}>
                        <input
                          value={r.name}
                          onChange={(e) => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)))}
                          className="w-full bg-transparent text-sm outline-none border-b border-transparent focus:border-line"
                          aria-label="Название"
                        />
                        <div className="text-xs text-dim disp mt-1">
                          {round(p.kcal)} ккал · Б {round(p.p)} · Ж {round(p.f)} · У {round(p.c)}
                        </div>
                      </div>
                      <div className="flex items-end gap-1 shrink-0">
                        <input
                          type="number"
                          inputMode="decimal"
                          value={r.grams}
                          onChange={(e) => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, grams: e.target.value } : x)))}
                          className="w-16 bg-transparent border-b border-line focus:border-accent transition-colors px-1 py-1 disp text-lg font-medium outline-none text-right"
                          aria-label={`Граммы «${r.name}»`}
                        />
                        <span className="text-dim text-xs pb-1.5">г</span>
                      </div>
                      <button
                        onClick={() => setRows((rs) => rs.filter((x) => x.id !== r.id))}
                        className="text-dim hover:text-danger cursor-pointer p-1 shrink-0"
                        aria-label={`Убрать «${r.name}»`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="flex items-center justify-between mt-4">
              <button
                onClick={() => fileRef.current?.click()}
                className="text-sm text-accent cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" /> Другое фото
              </button>
              <span className="disp text-sm text-muted">
                итого {round(sum.kcal)} ккал · Б {round(sum.p)}
              </span>
            </div>

            <button
              onClick={confirm}
              disabled={!chosen.length}
              className="mt-4 w-full bg-accent hover:bg-accent-soft disabled:opacity-50 active:scale-[0.98] transition-all duration-150 text-accent-ink font-semibold rounded-full py-3 cursor-pointer"
            >
              Записать {chosen.length || ""} {chosen.length ? "поз." : ""}
            </button>
            <p className="text-xs text-dim mt-3">
              КБЖУ оценены по фото — проверьте граммы и поправьте, если нужно.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
