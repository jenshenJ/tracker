import type { ReactNode } from "react";
import { X } from "lucide-react";

interface Props {
  title: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}

/** Нижняя шторка: затемнение + поднимающаяся панель с заголовком и контентом. */
export function Sheet({ title, icon, onClose, children }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="w-full max-w-md bg-canvas border-t border-line sm:border sm:rounded-3xl rounded-t-3xl p-5 max-h-[92vh] overflow-y-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="flex items-center gap-2 text-sm font-medium">
            {icon}
            {title}
          </span>
          <button onClick={onClose} className="text-dim hover:text-fg cursor-pointer p-1" aria-label="Закрыть">
            <X className="w-5 h-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
