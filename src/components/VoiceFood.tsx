import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, RotateCcw, Sparkles, Trash2, X } from "lucide-react";
import type { FoodEntry, Meal } from "../types";
import { MEALS, defaultMeal } from "../constants";
import { AiError, askAi, parseJsonArray } from "../lib/ai";
import { foodVoicePrompt } from "../lib/prompts";
import { nextId } from "../lib/id";

interface Props {
  onConfirm: (entries: FoodEntry[]) => void;
  onClose: () => void;
}

/** Распознанный из речи продукт: КБЖУ на 100 г + оценка съеденной порции. */
interface VoiceItem {
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

type Status = "input" | "parsing" | "results" | "error";

const num = (s: string) => parseFloat(String(s).replace(",", ".")) || 0;
const round = (n: number) => Math.round(n);

/** Через сколько мс тишины автоматически завершаем запись. */
const SILENCE_MS = 2800;

/* ── Минимальные типы Web Speech API (нет в стандартном lib.dom) ── */
interface SpeechAlt {
  transcript: string;
}
interface SpeechResult {
  readonly length: number;
  isFinal: boolean;
  [index: number]: SpeechAlt | undefined;
}
interface SpeechEvent {
  resultIndex: number;
  results: ArrayLike<SpeechResult>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

function getRecognitionCtor(): (new () => Recognition) | null {
  const w = window as unknown as {
    SpeechRecognition?: new () => Recognition;
    webkitSpeechRecognition?: new () => Recognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Голосовой ввод еды: диктовка (Web Speech API) или текст → AI разбирает в список → запись. */
export function VoiceFood({ onConfirm, onClose }: Props) {
  const [status, setStatus] = useState<Status>("input");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [meal, setMeal] = useState<Meal>(defaultMeal());

  const recRef = useRef<Recognition | null>(null);
  const manualStopRef = useRef(false);
  const silenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [speechSupported] = useState(() => getRecognitionCtor() !== null);

  const clearSilence = () => {
    if (silenceRef.current) {
      clearTimeout(silenceRef.current);
      silenceRef.current = null;
    }
  };

  const stopListening = () => {
    manualStopRef.current = true;
    clearSilence();
    recRef.current?.stop();
    setListening(false);
    setInterim("");
  };

  /* перезапускаем таймер тишины: завершим запись, если пользователь замолчал */
  const armSilence = () => {
    clearSilence();
    silenceRef.current = setTimeout(stopListening, SILENCE_MS);
  };

  const startListening = () => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    /* Web Speech API работает только в защищённом контексте (HTTPS или localhost) */
    if (!window.isSecureContext) {
      setError("Голос работает только по HTTPS или с localhost. По сетевому IP браузер блокирует микрофон — откройте сайт по защищённому адресу или опишите еду текстом ниже.");
      setListening(false);
      return;
    }
    setError("");
    manualStopRef.current = false;
    const rec = new Ctor();
    rec.lang = "ru-RU";
    rec.interimResults = true;
    rec.continuous = true; // слушаем дальше, не обрываемся на первой паузе
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      let live = "";
      let done = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        const text = r?.[0]?.transcript;
        if (!text) continue; // у некоторых событий альтернатива ещё не заполнена
        if (r.isFinal) done += text;
        else live += text;
      }
      if (done) setTranscript((t) => (t ? `${t} ${done}`.trim() : done.trim()));
      setInterim(live);
      armSilence(); // пока речь идёт — отодвигаем автостоп
    };
    rec.onerror = (ev) => {
      setInterim("");
      /* показываем только то, что пользователь может починить — отказ в доступе к микрофону.
         Прочие коды (network, no-speech, aborted и т.п.) не мешают: текст уже можно ввести/поправить. */
      if (ev?.error === "not-allowed" || ev?.error === "service-not-allowed")
        setError("Нет доступа к микрофону. Разрешите его в настройках браузера или опишите еду текстом ниже.");
    };
    rec.onend = () => {
      /* реагируем только на текущий экземпляр (в StrictMode их временно два) */
      if (recRef.current !== rec) return;
      clearSilence();
      recRef.current = null;
      setListening(false);
      setInterim("");
    };
    recRef.current = rec;
    setListening(true);
    armSilence();
    const tryStart = (retry: boolean) => {
      try {
        rec.start();
      } catch {
        /* движок ещё не освободился (частый случай при двойном маунте) — пробуем ещё раз */
        if (retry) setTimeout(() => tryStart(false), 250);
        else setListening(false);
      }
    };
    tryStart(true);
  };

  /* автозапуск записи при открытии (тап по микрофону = жест пользователя) */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (speechSupported) startListening();
    return () => {
      manualStopRef.current = true;
      clearSilence();
      const rec = recRef.current;
      recRef.current = null; // чтобы onend этого экземпляра не перезапустил запись
      rec?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parse = async () => {
    const text = transcript.trim();
    if (text.length < 2) return;
    if (listening) stopListening();
    setStatus("parsing");
    setError("");
    setRows([]);
    try {
      const out = await askAi(foodVoicePrompt(text), 1500);
      const items = parseJsonArray<VoiceItem>(out);
      const next: Row[] = items
        .filter((it) => it && typeof it.name === "string" && it.kcal > 0)
        .map((it) => ({
          id: nextId(),
          name: it.name.trim(),
          per100: { kcal: it.kcal, p: it.p || 0, f: it.f || 0, c: it.c || 0 },
          grams: String(Math.max(1, Math.round(it.grams || 100))),
          on: true,
        }));
      if (!next.length) throw new AiError("Не разобрал, что вы съели. Попробуйте сказать иначе.");
      setRows(next);
      setStatus("results");
    } catch (e) {
      console.error(e);
      setError(e instanceof AiError ? e.message : "Не получилось разобрать. Попробуйте ещё раз.");
      setStatus("error");
    }
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

  const reset = () => {
    setStatus("input");
    setRows([]);
    setError("");
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
            <Mic className="w-4 h-4 text-accent" strokeWidth={1.8} /> Голосом
          </span>
          <button onClick={onClose} className="text-dim hover:text-fg cursor-pointer p-1" aria-label="Закрыть">
            <X className="w-5 h-5" />
          </button>
        </div>

        {(status === "input" || status === "error") && (
          <div>
            {speechSupported && (
              <button
                onClick={listening ? stopListening : startListening}
                className={`mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full cursor-pointer transition-all duration-150 ${
                  listening ? "bg-danger/15 text-danger animate-pulse" : "bg-accent text-accent-ink hover:bg-accent-soft"
                }`}
                aria-label={listening ? "Остановить запись" : "Начать запись"}
              >
                {listening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
              </button>
            )}

            <p className="text-xs text-dim text-center mb-3">
              {listening
                ? "Слушаю… говорите спокойно. Остановлю сам через пару секунд тишины или жмите микрофон"
                : speechSupported
                  ? "Жмите микрофон, чтобы продиктовать ещё"
                  : "Опишите, что вы съели — AI посчитает КБЖУ"}
            </p>

            <textarea
              value={transcript + (interim ? ` ${interim}` : "")}
              onChange={(e) => setTranscript(e.target.value)}
              rows={3}
              placeholder="напр. тарелка гречки, куриная грудка грамм 150 и овощной салат"
              className="w-full bg-surface rounded-2xl px-4 py-3 text-sm outline-none resize-none"
              aria-label="Что вы съели"
            />

            {error && (
              <p role="alert" className="text-sm text-danger mt-3">
                {error}
              </p>
            )}

            <button
              onClick={parse}
              disabled={transcript.trim().length < 2}
              className="mt-4 w-full bg-accent hover:bg-accent-soft disabled:opacity-50 active:scale-[0.98] transition-all duration-150 text-accent-ink font-semibold rounded-full py-3 cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Разобрать
            </button>
          </div>
        )}

        {status === "parsing" && (
          <p className="text-sm text-dim flex items-center gap-2 py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Разбираю и считаю КБЖУ…
          </p>
        )}

        {status === "results" && (
          <div>
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="eyebrow">Что вы съели</span>
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
              <button onClick={reset} className="text-sm text-accent cursor-pointer flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4" /> Сказать заново
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
              КБЖУ оценены по вашим словам — проверьте граммы и поправьте, если нужно.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
