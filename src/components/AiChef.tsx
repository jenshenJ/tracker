import { useState } from "react";
import { ChefHat, ChevronRight, Loader2, Plus, Sparkles } from "lucide-react";
import type { DayLog, MealIdea, Profile, Totals } from "../types";
import { SCHED_LABEL, defaultMeal } from "../constants";
import { AiError, askAi, parseJsonArray } from "../lib/ai";
import { chefPrompt } from "../lib/prompts";
import { nextId } from "../lib/id";
import { storage } from "../lib/storage";

interface Props {
  day: DayLog;
  saveDay: (d: DayLog) => void;
  totals: Totals;
  profile: Profile;
}

export function AiChef({ day, saveDay, totals, profile }: Props) {
  const [pantry, setPantry] = useState(() => storage.loadPantry());
  const [ideas, setIdeas] = useState<MealIdea[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  const leftKcal = Math.max(0, Math.round(profile.kcalTarget - totals.kcal));
  const leftP = Math.max(0, Math.round(profile.proteinTarget - totals.p));
  const todayWorkout = profile.schedule[new Date().getDay()];

  const suggest = async () => {
    if (pantry.trim().length < 3) return;
    setLoading(true);
    setError("");
    setIdeas(null);
    storage.savePantry(pantry.trim());
    try {
      const text = await askAi(chefPrompt(profile, day, totals, pantry.trim()), 1600);
      setIdeas(parseJsonArray<MealIdea>(text));
    } catch (e) {
      console.error(e);
      setError(e instanceof AiError ? e.message : "Не получилось придумать. Попробуйте ещё раз или уточните список продуктов.");
    } finally {
      setLoading(false);
    }
  };

  const logIdea = (idea: MealIdea) => {
    const meal = defaultMeal();
    const foods = idea.items.map((it) => ({
      id: nextId(),
      meal,
      name: `${it.name} (${idea.title})`,
      grams: it.grams,
      kcal: it.kcal,
      p: it.p,
      f: it.f,
      c: it.c,
    }));
    saveDay({ ...day, foods: [...day.foods, ...foods] });
    setIdeas(null);
  };

  return (
    <section className="border-y border-line py-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between cursor-pointer" aria-expanded={open}>
        <span className="flex items-center gap-2.5 text-sm text-body font-medium">
          <ChefHat className="w-4 h-4 text-accent" strokeWidth={1.6} /> Что приготовить из того, что есть?
        </span>
        <ChevronRight className={`w-4 h-4 text-dim transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="mt-4">
          <div className="text-xs text-muted mb-3">
            Остаток: <b className="text-fg disp">{leftKcal} ккал</b> · белка добрать <b className="text-fg disp">{leftP} г</b>
            {todayWorkout && (
              <>
                {" "}
                · сегодня: <b className="text-accent">{SCHED_LABEL[todayWorkout]}</b>
              </>
            )}
          </div>
          <textarea
            value={pantry}
            onChange={(e) => setPantry(e.target.value)}
            rows={3}
            placeholder="курица, гречка, яйца, творог, помидоры, сыр…"
            className="w-full bg-surface rounded-2xl px-4 py-3 text-sm resize-none"
            aria-label="Продукты в наличии"
          />
          <button
            onClick={suggest}
            disabled={loading || pantry.trim().length < 3}
            className="mt-3 w-full bg-accent hover:bg-accent-soft disabled:opacity-50 active:scale-[0.98] transition-all duration-150 text-accent-ink font-semibold rounded-full py-3 flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {loading ? "Думаю…" : "Предложить блюда"}
          </button>
          {error && (
            <p role="alert" className="text-sm text-danger mt-3">
              {error}
            </p>
          )}

          {ideas && (
            <ul className="mt-4 space-y-5">
              {ideas.map((idea, i) => (
                <li key={i} className="border-t border-line pt-4">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="disp font-medium text-base">{idea.title}</span>
                    <span className="text-xs text-dim shrink-0 disp">
                      {Math.round(idea.kcal)} ккал · Б {Math.round(idea.p)}
                    </span>
                  </div>
                  <p className="text-sm text-body mt-1.5">{idea.how}</p>
                  <ul className="mt-2 text-xs text-muted space-y-1">
                    {idea.items.map((it, j) => (
                      <li key={j}>
                        {it.name} — {Math.round(it.grams)} г ({Math.round(it.kcal)} ккал)
                      </li>
                    ))}
                  </ul>
                  <div className="text-xs text-dim mt-2 disp">
                    Итого: Б {Math.round(idea.p)} · Ж {Math.round(idea.f)} · У {Math.round(idea.c)}
                  </div>
                  <button
                    onClick={() => logIdea(idea)}
                    className="mt-3 w-full bg-raised hover:bg-raised-hover transition-colors duration-150 rounded-full py-2.5 text-sm font-medium cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Записать в дневник
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
