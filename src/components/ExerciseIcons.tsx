import type { ReactElement, SVGProps } from "react";

/** Фирменные line-иконки упражнений в стиле lucide (stroke 1.6, 24×24). */

const base: SVGProps<SVGSVGElement> = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

type P = { className?: string };

/* жим лёжа 0°: скамья + гриф с блинами над ней */
const Bench0 = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="2" y1="17" x2="22" y2="17" />
    <line x1="5" y1="17" x2="5" y2="20" />
    <line x1="19" y1="17" x2="19" y2="20" />
    <line x1="4" y1="8" x2="20" y2="8" />
    <rect x="6" y="5.5" width="2" height="5" rx="0.5" />
    <rect x="16" y="5.5" width="2" height="5" rx="0.5" />
  </svg>
);

/* жим лёжа 30°: наклонная скамья + гриф */
const Bench30 = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="3" y1="19" x2="21" y2="19" />
    <line x1="5" y1="19" x2="17" y2="9" />
    <line x1="9" y1="6" x2="21" y2="6" />
    <rect x="11" y="3.5" width="2" height="5" rx="0.5" />
    <rect x="17" y="3.5" width="2" height="5" rx="0.5" />
  </svg>
);

/* тяга вертикальная: верхний блок, рукоять вниз */
const LatPull = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="4" y1="4" x2="20" y2="4" />
    <line x1="12" y1="4" x2="12" y2="9" />
    <path d="M6 11c2 1.5 4 2 6 2s4-.5 6-2" />
    <line x1="8" y1="12.6" x2="8" y2="20" />
    <line x1="16" y1="12.6" x2="16" y2="20" />
  </svg>
);

/* тяга горизонтальная: трос к корпусу */
const Row = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="18" cy="7" r="2" />
    <path d="M17.5 9.5 16 15l-5 1" />
    <line x1="3" y1="12" x2="13" y2="12" />
    <line x1="3" y1="10.5" x2="3" y2="13.5" />
    <line x1="11" y1="16" x2="11" y2="20" />
    <line x1="16" y1="15" x2="17" y2="20" />
  </svg>
);

/* отведения гантелей: руки-галочка с гантелями */
const LatRaise = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="12" y1="8" x2="12" y2="20" />
    <circle cx="12" cy="5.5" r="1.8" />
    <line x1="12" y1="10" x2="5" y2="8" />
    <line x1="12" y1="10" x2="19" y2="8" />
    <rect x="2.5" y="6" width="2.4" height="3.6" rx="0.6" />
    <rect x="19.1" y="6" width="2.4" height="3.6" rx="0.6" />
  </svg>
);

/* французский жим: гриф за голову дугой */
const French = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="3" y1="16" x2="21" y2="16" />
    <circle cx="9" cy="12.5" r="1.8" />
    <path d="M11 11l4-4" />
    <path d="M15 7l3 1" />
    <rect x="17" y="5" width="2.2" height="4" rx="0.5" transform="rotate(20 18 7)" />
  </svg>
);

/* жим ногами: платформа под углом, ноги */
const LegPress = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="20" y1="4" x2="14" y2="20" />
    <line x1="19" y1="7" x2="22" y2="8" />
    <circle cx="5" cy="13" r="1.8" />
    <path d="M6.5 14.5 11 13l4.5 1.5" />
    <path d="M11 13l3 4" />
    <line x1="3" y1="20" x2="12" y2="20" />
  </svg>
);

/* подъём на носки: стопа на ступеньке */
const Calf = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="3" y1="20" x2="21" y2="20" />
    <rect x="13" y="16" width="8" height="4" />
    <path d="M9 5v7l-2 4" />
    <path d="M9 12l4 2.5 1.5 1.5" />
    <circle cx="9" cy="3.5" r="1.5" />
  </svg>
);

/* разгибания ног: сидя, голень вперёд-вверх */
const LegExt = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="5" y1="8" x2="5" y2="18" />
    <line x1="5" y1="18" x2="14" y2="18" />
    <circle cx="8" cy="6.5" r="1.8" />
    <path d="M8 9v5h6" />
    <path d="M14 14l6-3" />
    <circle cx="21" cy="10.4" r="1.2" />
  </svg>
);

/* сгибания с супинацией: рука с гантелью, дуга */
const Curl = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="9" y1="4" x2="9" y2="20" />
    <circle cx="9" cy="4" r="0.2" />
    <path d="M9 14l5 1" />
    <path d="M14 15c3 0 5-2 5-5" />
    <rect x="17.6" y="8.2" width="2.6" height="3.6" rx="0.6" />
  </svg>
);

/* разгибания рук на блоке: трос сверху, жим вниз */
const TriPush = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="12" y1="3" x2="12" y2="9" />
    <line x1="7" y1="11" x2="17" y2="11" />
    <path d="M9 11v4" />
    <path d="M15 11v4" />
    <path d="M8 18l4 2 4-2" />
  </svg>
);

export const EXERCISE_ICONS: Record<string, (p: P) => ReactElement> = {
  bench0: Bench0,
  bench30: Bench30,
  latpull: LatPull,
  row: Row,
  latraise: LatRaise,
  french: French,
  legpress: LegPress,
  calf: Calf,
  legext: LegExt,
  curl: Curl,
  tripush: TriPush,
};

export function ExerciseIcon({ id, className }: { id: string; className?: string }) {
  const Icon = EXERCISE_ICONS[id];
  return Icon ? <Icon className={className} /> : null;
}
