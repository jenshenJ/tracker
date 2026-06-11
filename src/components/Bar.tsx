interface BarProps {
  value: number;
  max: number;
  /** tailwind-класс цвета заливки, напр. "bg-accent" */
  color?: string;
}

/** Тонкая editorial-линия прогресса; краснеет при переборе. */
export function Bar({ value, max, color = "bg-accent" }: BarProps) {
  const pct = Math.min(100, (value / max) * 100);
  const over = value > max;
  return (
    <div className="h-0.5 bg-line overflow-hidden">
      <div className={`h-full transition-all duration-300 ${over ? "bg-danger" : color}`} style={{ width: pct + "%" }} />
    </div>
  );
}
