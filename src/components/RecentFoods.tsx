import { useMemo, useState } from "react";
import { ChevronRight, History, Repeat } from "lucide-react";
import type { DayLog } from "../types";
import { frequentFoods, recentFoods, type QuickFood } from "../lib/foods";

interface Props {
  days: Record<string, DayLog>;
  /** Выбрать продукт — открыть редактор веса/приёма пищи (без мгновенной записи). */
  onPick: (q: QuickFood) => void;
}

/** Сворачиваемая карточка со списком быстрых продуктов. */
function QuickCard({
  title,
  Icon,
  items,
  onPick,
}: {
  title: string;
  Icon: typeof History;
  items: QuickFood[];
  onPick: (q: QuickFood) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="border-b border-line py-4 first:border-t">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between cursor-pointer" aria-expanded={open}>
        <span className="flex items-center gap-2.5 text-sm text-body font-medium">
          <Icon className="w-4 h-4 text-accent" strokeWidth={1.6} /> {title}
          <span className="text-dim text-xs disp">{items.length}</span>
        </span>
        <ChevronRight className={`w-4 h-4 text-dim transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
      </button>

      {open && (
        <div className="flex flex-wrap gap-2 mt-4">
          {items.map((q, i) => (
            <button
              key={i}
              onClick={() => onPick(q)}
              className="shrink-0 flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm cursor-pointer bg-surface hover:bg-raised-hover transition-colors duration-150"
              title={`${q.name} · ${Math.round(q.grams)} г · ${Math.round(q.kcal)} ккал`}
            >
              <span className="truncate max-w-[11rem]">{q.name}</span>
              <span className="text-xs text-dim disp">{Math.round(q.grams)}г</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

/** Недавнее и частое: выбор повторяющейся еды с правкой веса перед записью. */
export function RecentFoods({ days, onPick }: Props) {
  const recent = useMemo(() => recentFoods(days, 12), [days]);
  const frequent = useMemo(() => frequentFoods(days, 12), [days]);

  if (recent.length === 0 && frequent.length === 0) return null;

  return (
    <div>
      {recent.length > 0 && <QuickCard title="Недавнее" Icon={History} items={recent} onPick={onPick} />}
      {frequent.length > 0 && <QuickCard title="Часто" Icon={Repeat} items={frequent} onPick={onPick} />}
    </div>
  );
}
