import type { Profile } from "../types";

interface Props {
  profile: Profile;
  entries: Array<[string, number]>;
}

/** SVG-график: фактический вес против плановой линии до цели. */
export function WeightChart({ profile, entries }: Props) {
  const W = 340,
    H = 170,
    P = { l: 30, r: 8, t: 10, b: 20 };
  const t0 = new Date(profile.startDate + "T12:00:00").getTime();
  const t1 = new Date(profile.goalDate + "T12:00:00").getTime();
  const yMin = profile.goalWeight - 2,
    yMax = profile.startWeight + 2;
  const x = (s: string) => P.l + ((new Date(s + "T12:00:00").getTime() - t0) / (t1 - t0)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - (v - yMin) / (yMax - yMin)) * (H - P.t - P.b);
  const pts = entries.map(([d, v]) => `${x(d).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const gridY = [95, 100, 105, 110, 115].filter((v) => v >= yMin && v <= yMax);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full mt-3" role="img" aria-label="График веса относительно плановой линии">
      {gridY.map((v) => (
        <g key={v}>
          <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} stroke="var(--color-line)" strokeWidth="1" strokeDasharray="3 4" />
          <text x={2} y={y(v) + 4} fill="var(--color-dim)" fontSize="10">
            {v}
          </text>
        </g>
      ))}
      {/* плановая линия */}
      <line
        x1={x(profile.startDate)}
        y1={y(profile.startWeight)}
        x2={x(profile.goalDate)}
        y2={y(profile.goalWeight)}
        stroke="#22C55E"
        strokeWidth="2"
        strokeDasharray="6 5"
        opacity="0.8"
      />
      <circle cx={x(profile.goalDate)} cy={y(profile.goalWeight)} r="4" fill="#22C55E" />
      <text x={x(profile.goalDate) - 6} y={y(profile.goalWeight) - 8} fill="#22C55E" fontSize="10" textAnchor="end">
        {profile.goalWeight} кг
      </text>
      {/* фактические данные */}
      {entries.length > 1 && (
        <polyline points={pts} fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      )}
      {entries.slice(-1).map(([d, v]) => (
        <circle key={d} cx={x(d)} cy={y(v)} r="4.5" fill="#F97316" stroke="var(--color-surface)" strokeWidth="2" />
      ))}
      {entries.length === 0 && (
        <text x={W / 2} y={H / 2} fill="var(--color-dim)" fontSize="12" textAnchor="middle">
          Записывайте вес — линия появится здесь
        </text>
      )}
    </svg>
  );
}
