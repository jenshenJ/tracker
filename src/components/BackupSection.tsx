import { useRef, useState } from "react";
import { Download, Loader2, Upload } from "lucide-react";
import type { BackupFile, Profile } from "../types";
import { todayStr } from "../lib/date";
import { storage } from "../lib/storage";

interface Props {
  profile: Profile;
}

export function BackupSection({ profile }: Props) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const exportAll = () => {
    setBusy(true);
    setMsg("");
    try {
      const out: BackupFile = {
        app: "tracker95",
        exportedAt: new Date().toISOString(),
        profile,
        weights: storage.loadWeights(),
        pantry: storage.loadPantry(),
        days: storage.allDays(),
        customFoods: storage.loadCustomFoods(),
        workouts: storage.loadWorkouts(),
        customPrograms: storage.loadCustomPrograms(),
        activeProgram: storage.loadActiveProgram(),
      };
      const blob = new Blob([JSON.stringify(out, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `tracker95-backup-${todayStr()}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      setMsg(`Выгружено: ${Object.keys(out.weights).length} взвешиваний, ${Object.keys(out.days).length} дней дневника.`);
    } catch (e) {
      console.error(e);
      setMsg("Не получилось выгрузить. Попробуйте ещё раз.");
    } finally {
      setBusy(false);
    }
  };

  const importAll = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setMsg("");
    try {
      const data = JSON.parse(await file.text()) as BackupFile;
      if (data.app !== "tracker95") throw new Error("wrong file");
      if (data.profile) storage.saveProfile(data.profile);
      if (data.weights) storage.saveWeights(data.weights);
      if (typeof data.pantry === "string") storage.savePantry(data.pantry);
      if (Array.isArray(data.customFoods)) storage.saveCustomFoods(data.customFoods);
      if (data.workouts) storage.saveWorkouts(data.workouts);
      if (Array.isArray(data.customPrograms)) storage.saveCustomPrograms(data.customPrograms);
      if (data.activeProgram) storage.saveActiveProgram(data.activeProgram);
      for (const [k, v] of Object.entries(data.days ?? {})) storage.saveDayRaw(k, v);
      setMsg("Данные восстановлены. Перезагружаю…");
      setTimeout(() => window.location.reload(), 800);
    } catch (e) {
      console.error(e);
      setMsg("Файл не похож на бэкап этого приложения.");
      setBusy(false);
    }
  };

  return (
    <section>
      <div className="eyebrow">Резервная копия</div>
      <p className="text-xs text-dim mt-2">
        Все данные — цели, вес, дневник еды и активности — одним JSON-файлом. Восстановление перезапишет текущие данные данными
        из файла.
      </p>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <button
          onClick={exportAll}
          disabled={busy}
          className="bg-raised hover:bg-raised-hover disabled:opacity-50 transition-colors duration-150 rounded-full py-3 text-sm font-medium cursor-pointer flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" strokeWidth={1.6} />} Выгрузить
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="bg-raised hover:bg-raised-hover disabled:opacity-50 transition-colors duration-150 rounded-full py-3 text-sm font-medium cursor-pointer flex items-center justify-center gap-2"
        >
          <Upload className="w-4 h-4" strokeWidth={1.6} /> Восстановить
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            importAll(e.target.files?.[0]);
            e.target.value = "";
          }}
          aria-label="Файл бэкапа"
        />
      </div>
      {msg && <p className="text-xs text-muted mt-3">{msg}</p>}
    </section>
  );
}
