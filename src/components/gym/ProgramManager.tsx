import { useState } from "react";
import { Check, ChevronRight, Copy, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import type { WorkoutProgram } from "../../types";
import { BUILTIN_PROGRAMS, programWeekdays } from "../../constants/programs";
import { exerciseMeasure, exerciseName } from "../../constants/exercises";
import { RU_DAYS } from "../../lib/date";
import { timeTarget } from "../../lib/gym";

interface Props {
  custom: WorkoutProgram[];
  activeId: string;
  onActivate: (p: WorkoutProgram) => void;
  onEdit: (p: WorkoutProgram) => void;
  onDelete: (id: string) => void;
  onCreate: () => void;
  onAi: () => void;
  onClose: () => void;
}

/** Список программ: встроенные + свои, активация, правка, удаление. */
export function ProgramManager({ custom, activeId, onActivate, onEdit, onDelete, onCreate, onAi, onClose }: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const all = [...custom, ...BUILTIN_PROGRAMS];

  return (
    <div className="space-y-8">
      <div className="flex items-baseline justify-between">
        <div className="eyebrow">Программы</div>
        <button onClick={onClose} className="text-xs text-dim hover:text-fg cursor-pointer">
          назад
        </button>
      </div>

      <ul>
        {all.map((p) => {
          const isActive = p.id === activeId;
          const isOpen = open === p.id;
          const wd = programWeekdays(p);
          return (
            <li key={p.id} className="border-b border-line py-3.5 first:border-t">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setOpen(isOpen ? null : p.id)}
                  className="flex-1 min-w-0 text-left cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <div className="text-sm flex items-center gap-2">
                    <span className={isActive ? "text-accent font-medium" : ""}>{p.name}</span>
                    {isActive && <Check className="w-3.5 h-3.5 text-accent" />}
                    {!p.builtin && <span className="text-xs text-dim">своя</span>}
                  </div>
                  <div className="text-xs text-dim mt-0.5">
                    {wd.map((d) => RU_DAYS[d]).join("/")} · {p.weeks === 1 ? "1 неделя" : `${p.weeks} недели`}
                    {p.description ? ` · ${p.description}` : ""}
                  </div>
                </button>
                <ChevronRight
                  className={`w-4 h-4 text-dim shrink-0 transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
                />
              </div>

              {isOpen && (
                <div className="mt-3">
                  {p.days.map((d, i) => (
                    <div key={i} className="mt-2">
                      <div className="text-xs text-accent disp uppercase tracking-wider">
                        {p.weeks > 1 ? `нед. ${d.week} · ` : ""}
                        {RU_DAYS[d.weekday]}
                      </div>
                      <div className="text-xs text-muted mt-0.5">
                        {d.slots
                          .map((sl) =>
                            exerciseMeasure(sl.exerciseId) === "time"
                              ? `${exerciseName(sl.exerciseId)} ${sl.sets > 1 ? `${sl.sets}× ` : ""}${timeTarget(sl.repsMin, sl.repsMax)}`
                              : `${exerciseName(sl.exerciseId)} ${sl.sets}×${sl.repsMin}–${sl.repsMax}`
                          )
                          .join(" · ")}
                      </div>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-4">
                    {!isActive && (
                      <button
                        onClick={() => onActivate(p)}
                        className="bg-accent hover:bg-accent-soft text-accent-ink rounded-full px-5 py-2 text-sm font-semibold cursor-pointer transition-colors duration-150"
                      >
                        Сделать активной
                      </button>
                    )}
                    <button
                      onClick={() => onEdit(p)}
                      className="bg-raised hover:bg-raised-hover rounded-full px-4 py-2 text-sm cursor-pointer transition-colors duration-150 flex items-center gap-1.5"
                    >
                      {p.builtin ? <Copy className="w-3.5 h-3.5" /> : <Pencil className="w-3.5 h-3.5" />}
                      {p.builtin ? "Копия" : "Править"}
                    </button>
                    {!p.builtin && (
                      <button
                        onClick={() => onDelete(p.id)}
                        className="text-dim hover:text-danger cursor-pointer p-2 ml-auto"
                        aria-label="Удалить программу"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={onCreate}
          className="bg-raised hover:bg-raised-hover transition-colors duration-150 rounded-full py-3 text-sm font-medium cursor-pointer flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> С нуля
        </button>
        <button
          onClick={onAi}
          className="bg-accent hover:bg-accent-soft transition-colors duration-150 text-accent-ink rounded-full py-3 text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" /> Собрать с AI
        </button>
      </div>
    </div>
  );
}
