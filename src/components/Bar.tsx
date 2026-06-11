interface BarProps {
  value: number;
  max: number;
  color: string;
}

/** Горизонтальный прогресс-бар; краснеет при переборе. */
export function Bar({ value, max, color }: BarProps) {
  const pct = Math.min(100, (value / max) * 100);
  const over = value > max;
  return (
    <div className="h-2.5 rounded-full bg-raised overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ${over ? "bg-red-500" : color}`}
        style={{ width: pct + "%" }}
      />
    </div>
  );
}
