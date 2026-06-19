import { useEffect, useRef, useState } from "react";
import { Loader2, ScanLine, Search, X } from "lucide-react";
import type { FoodSearchResult } from "../types";
import { lookupBarcode, saveBarcode } from "../lib/barcode";

interface Props {
  onPicked: (r: FoodSearchResult) => void;
  onClose: () => void;
}

type Status = "init" | "scanning" | "nocam" | "looking" | "notfound" | "error";

const READER_ID = "bc-reader";

/* html5-qrcode грузим с CDN по требованию — без зависимости в сборке; на поддерживающих устройствах
   использует нативный BarcodeDetector браузера (быстрее и точнее). */
/* eslint-disable @typescript-eslint/no-explicit-any */
let libPromise: Promise<any> | null = null;
function loadLib(): Promise<any> {
  const w = window as any;
  if (w.Html5Qrcode) return Promise.resolve(w);
  if (!libPromise) {
    libPromise = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js";
      s.async = true;
      s.onload = () => resolve(window as any);
      s.onerror = () => {
        libPromise = null;
        reject(new Error("cdn load failed"));
      };
      document.head.appendChild(s);
    });
  }
  return libPromise;
}

const num = (s: string) => parseFloat(s.replace(",", ".")) || 0;

/** Сканер штрихкода: камера (html5-qrcode + нативный детектор) + ручной ввод; лукап в Open Food Facts. */
export function BarcodeScanner({ onPicked, onClose }: Props) {
  const [status, setStatus] = useState<Status>("init");
  const [msg, setMsg] = useState("");
  const [manual, setManual] = useState("");
  const [notFoundCode, setNotFoundCode] = useState("");
  /* ручной ввод КБЖУ для ненайденного штрихкода */
  const [fname, setFname] = useState("");
  const [fkcal, setFkcal] = useState("");
  const [fp, setFp] = useState("");
  const [ff, setFf] = useState("");
  const [fc, setFc] = useState("");

  const scannerRef = useRef<any>(null);
  const handledRef = useRef(false);

  const stopCamera = () => {
    const s = scannerRef.current;
    scannerRef.current = null;
    if (s) {
      try {
        s.stop()
          .then(() => s.clear?.())
          .catch(() => {});
      } catch {
        /* уже остановлен */
      }
    }
  };

  const doLookup = async (code: string) => {
    setStatus("looking");
    setMsg("");
    try {
      const r = await lookupBarcode(code);
      if (r) {
        onPicked(r);
        return;
      }
      setNotFoundCode(code.replace(/\D/g, ""));
      setStatus("notfound");
    } catch (e) {
      console.error(e);
      setStatus("error");
      setMsg("Не удалось получить данные. Проверьте соединение и попробуйте ещё раз.");
    }
  };

  /* запуск камеры; перезапуск через runId (retry); устойчиво к двойному монтированию StrictMode */
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    let cancelled = false;
    handledRef.current = false;

    const run = async () => {
      let lib: any;
      try {
        lib = await loadLib();
      } catch {
        if (!cancelled) {
          setStatus("nocam");
          setMsg("Не удалось загрузить сканер. Введите штрихкод вручную.");
        }
        return;
      }
      if (cancelled) return;

      /* убираем остатки прошлого запуска (видео/canvas) — иначе при двойном монтировании
         html5-qrcode дорисовывает второй кадр в тот же контейнер */
      const el = document.getElementById(READER_ID);
      if (el) el.innerHTML = "";

      try {
        const fmt = lib.Html5QrcodeSupportedFormats;
        const formats = fmt
          ? [fmt.EAN_13, fmt.EAN_8, fmt.UPC_A, fmt.UPC_E, fmt.UPC_EAN_EXTENSION, fmt.CODE_128, fmt.CODE_39, fmt.ITF].filter(
              (x: unknown) => x !== undefined,
            )
          : undefined;
        const scanner = new lib.Html5Qrcode(READER_ID, {
          formatsToSupport: formats,
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
          verbose: false,
        });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 12,
            qrbox: (vw: number, vh: number) => ({
              width: Math.round(Math.min(vw * 0.92, 340)),
              height: Math.round(Math.min(vh * 0.6, 200)),
            }),
          },
          (text: string) => {
            if (!handledRef.current) {
              handledRef.current = true;
              stopCamera();
              void doLookup(text);
            }
          },
          () => {},
        );
        if (cancelled) {
          /* размонтировали/перезапустили, пока стартовали — сразу гасим */
          try {
            await scanner.stop();
            scanner.clear?.();
          } catch {
            /* ignore */
          }
          if (scannerRef.current === scanner) scannerRef.current = null;
          return;
        }
        setStatus("scanning");
      } catch (e) {
        console.error("camera init", e);
        if (!cancelled) {
          setStatus("nocam");
          setMsg("Камера недоступна. Введите штрихкод вручную.");
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runId]);

  const close = () => {
    stopCamera();
    onClose();
  };

  const retry = () => {
    setStatus("init");
    setMsg("");
    setNotFoundCode("");
    setRunId((n) => n + 1);
  };

  const submitManualFood = () => {
    if (fname.trim().length < 2 || num(fkcal) <= 0) return;
    const food: FoodSearchResult = { name: fname.trim(), kcal: num(fkcal), p: num(fp), f: num(ff), c: num(fc), portion: 100 };
    if (notFoundCode) saveBarcode(notFoundCode, food); // запомним за штрихкодом
    onPicked(food);
  };

  const manualValid = manual.replace(/\D/g, "").length >= 6;
  const showCamera = status === "init" || status === "scanning";
  const foodValid = fname.trim().length >= 2 && num(fkcal) > 0;
  const fields: Array<[string, string, (v: string) => void]> = [
    ["ккал", fkcal, setFkcal],
    ["Б", fp, setFp],
    ["Ж", ff, setFf],
    ["У", fc, setFc],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70" onClick={close}>
      <div
        className="w-full max-w-md bg-canvas border-t border-line sm:border sm:rounded-3xl rounded-t-3xl p-5 max-h-[92vh] overflow-y-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="flex items-center gap-2 text-sm font-medium">
            <ScanLine className="w-4 h-4 text-accent" strokeWidth={1.8} /> Сканировать штрихкод
          </span>
          <button onClick={close} className="text-dim hover:text-fg cursor-pointer p-1" aria-label="Закрыть">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* область камеры (html5-qrcode рендерит видео внутрь) */}
        <div id={READER_ID} className={`overflow-hidden rounded-2xl bg-surface ${showCamera ? "" : "hidden"}`} style={{ minHeight: showCamera ? 220 : 0 }} />

        {status === "init" && (
          <p className="text-sm text-dim mt-3 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Запускаю камеру…
          </p>
        )}
        {status === "scanning" && <p className="text-xs text-dim mt-3">Наведите камеру на штрихкод — держите ровно, при хорошем свете.</p>}
        {status === "looking" && (
          <p className="text-sm text-dim flex items-center gap-2 py-4">
            <Loader2 className="w-4 h-4 animate-spin" /> Ищу в Open Food Facts…
          </p>
        )}

        {/* ШТРИХКОД НЕ НАЙДЕН → сразу предлагаем ввести КБЖУ */}
        {status === "notfound" && (
          <div className="mt-2">
            <p className="text-sm text-muted">
              Штрихкод <span className="disp">{notFoundCode}</span> не нашли в базе. Введите КБЖУ — запомним его за этим
              штрихкодом, в следующий раз найдётся сразу.
            </p>
            <input
              value={fname}
              onChange={(e) => setFname(e.target.value)}
              placeholder="Название продукта"
              className="w-full bg-surface rounded-full px-4 py-3 text-sm mt-3"
              aria-label="Название продукта"
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
            <p className="text-xs text-dim mt-2">Значения на 100 г.</p>
            <button
              onClick={submitManualFood}
              disabled={!foodValid}
              className="mt-3 w-full bg-accent hover:bg-accent-soft disabled:opacity-50 active:scale-[0.98] transition-all duration-150 text-accent-ink font-semibold rounded-full py-3 cursor-pointer"
            >
              Записать КБЖУ
            </button>
            <button onClick={retry} className="text-xs text-accent mt-3 cursor-pointer">
              ↻ Сканировать ещё раз
            </button>
          </div>
        )}

        {msg && (status === "error" || status === "nocam") && (
          <div className="mt-3">
            <p role="alert" className={`text-sm ${status === "error" ? "text-danger" : "text-muted"}`}>
              {msg}
            </p>
            <button onClick={retry} className="text-xs text-accent mt-2 cursor-pointer">
              ↻ Попробовать камеру ещё раз
            </button>
          </div>
        )}

        {/* ручной ввод штрихкода — всегда доступен (и единственный путь без камеры) */}
        {status !== "notfound" && (
          <div className="mt-4">
            <label htmlFor="bc-manual" className="text-xs text-dim">
              Или ввести штрихкод вручную
            </label>
            <div className="flex gap-2 mt-2">
              <input
                id="bc-manual"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                inputMode="numeric"
                placeholder="напр. 4607065370077"
                className="flex-1 min-w-0 bg-surface rounded-full px-4 py-2.5 text-sm disp"
              />
              <button
                onClick={() => manualValid && doLookup(manual)}
                disabled={!manualValid || status === "looking"}
                className="bg-accent hover:bg-accent-soft disabled:opacity-50 transition-all duration-150 text-accent-ink rounded-full px-5 cursor-pointer flex items-center gap-1.5 font-semibold"
              >
                <Search className="w-4 h-4" /> Найти
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
