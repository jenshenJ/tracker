import type { ReactElement, SVGProps } from "react";
import { exerciseGroup } from "../constants/exercises";

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

/* присед: штанга на плечах, согнутые ноги */
const Squat = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="4" y1="6" x2="20" y2="6" />
    <circle cx="12" cy="9" r="1.8" />
    <path d="M12 11v4l-4 3" />
    <path d="M12 15l4 3" />
    <line x1="3" y1="21" x2="21" y2="21" />
  </svg>
);

/* мост: корпус-дуга со штангой на тазу */
const Bridge = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="4.5" cy="13" r="1.8" />
    <path d="M6.5 14 12 12l5 2 2 4" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <rect x="10.8" y="6" width="2.4" height="2.4" rx="0.5" />
    <line x1="3" y1="20" x2="21" y2="20" />
  </svg>
);

/* планка: прямой корпус на локтях */
const Plank = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="4.5" cy="10" r="1.8" />
    <path d="M6.5 11.5 19 14" />
    <path d="M6.5 13.5v4" />
    <path d="M19 14v3.5" />
    <line x1="3" y1="20" x2="21" y2="20" />
  </svg>
);

/* кардио: пульс */
const Cardio = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M3 12h4l2-5 4 10 2-5h6" />
  </svg>
);

/* подтягивания: турник и руки */
const PullUps = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="3" y1="4" x2="21" y2="4" />
    <path d="M8 4v4l4 3 4-3V4" />
    <circle cx="12" cy="13.5" r="1.8" />
    <path d="M12 15.5v3" />
  </svg>
);

/* гантель: дефолт */
const DumbbellIcon = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="2.5" y="9" width="3" height="6" rx="0.8" />
    <rect x="18.5" y="9" width="3" height="6" rx="0.8" />
    <line x1="5.5" y1="12" x2="18.5" y2="12" />
  </svg>
);

/* жим гантелей лёжа: скамья + две гантели */
const BenchDb = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="2" y1="17" x2="22" y2="17" />
    <rect x="5" y="5.5" width="2.6" height="4.5" rx="0.6" />
    <rect x="16.4" y="5.5" width="2.6" height="4.5" rx="0.6" />
    <line x1="6.3" y1="10" x2="6.3" y2="13" />
    <line x1="17.7" y1="10" x2="17.7" y2="13" />
  </svg>
);

/* жим гантелей 30°: наклон + гантели */
const BenchDb30 = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="3" y1="19" x2="21" y2="19" />
    <line x1="5" y1="19" x2="17" y2="9" />
    <rect x="9" y="3.5" width="2.6" height="4.5" rx="0.6" />
    <rect x="16" y="3.5" width="2.6" height="4.5" rx="0.6" />
  </svg>
);

/* брусья: две стойки + корпус между */
const Dips = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="4" y1="8" x2="8" y2="8" />
    <line x1="16" y1="8" x2="20" y2="8" />
    <line x1="6" y1="8" x2="6" y2="20" />
    <line x1="18" y1="8" x2="18" y2="20" />
    <circle cx="12" cy="6" r="1.8" />
    <path d="M12 8v6l-2 4" />
  </svg>
);

/* отжимания: низкий корпус над полом */
const PushUps = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="5" cy="9" r="1.8" />
    <path d="M7 10.5 19 13" />
    <path d="M8 11.5v5" />
    <path d="M19 13v3.5" />
    <line x1="3" y1="20" x2="21" y2="20" />
  </svg>
);

/* разводка: руки-дуги раскрываются */
const Flyes = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="13" r="1.8" />
    <path d="M10.5 11.5C8 9.5 6 9 3.5 9.5" />
    <path d="M13.5 11.5C16 9.5 18 9 20.5 9.5" />
    <rect x="2" y="7.8" width="2.2" height="3.4" rx="0.5" />
    <rect x="19.8" y="7.8" width="2.2" height="3.4" rx="0.5" />
    <line x1="6" y1="19" x2="18" y2="19" />
  </svg>
);

/* пек-дек: рычаги сводятся к центру */
const PecDeck = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="6" r="1.8" />
    <path d="M7 9c0 4 1.5 6 3.5 7" />
    <path d="M17 9c0 4-1.5 6-3.5 7" />
    <line x1="12" y1="9" x2="12" y2="19" />
  </svg>
);

/* кроссовер: тросы из верхних углов к центру */
const CableCross = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="3" y1="4" x2="6" y2="4" />
    <line x1="18" y1="4" x2="21" y2="4" />
    <path d="M4.5 4 12 14 19.5 4" />
    <circle cx="12" cy="8" r="1.6" />
    <path d="M12 14v5" />
  </svg>
);

/* тяга гантели в наклоне: скамья + рука с гантелью */
const DbRow = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="4" y1="16" x2="20" y2="16" />
    <line x1="6" y1="16" x2="6" y2="20" />
    <line x1="18" y1="16" x2="18" y2="20" />
    <circle cx="9" cy="6" r="1.7" />
    <path d="M10.5 7.5 15 9" />
    <path d="M12 9v3.5" />
    <rect x="10.7" y="12.5" width="2.6" height="3" rx="0.6" />
  </svg>
);

/* тяга штанги в наклоне: наклонный корпус + гриф */
const BarbellRow = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="16" cy="5" r="1.8" />
    <path d="M14.5 6.5 8 10l-1 6" />
    <path d="M10 11v4.5" />
    <line x1="4" y1="15.5" x2="16" y2="15.5" />
    <rect x="4.5" y="13.8" width="1.8" height="3.4" rx="0.5" />
    <rect x="13.7" y="13.8" width="1.8" height="3.4" rx="0.5" />
    <line x1="3" y1="20" x2="21" y2="20" />
  </svg>
);

/* т-гриф: рычаг от пола */
const TbarRow = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="4" y1="19" x2="20" y2="19" />
    <line x1="5" y1="19" x2="17" y2="7" />
    <circle cx="18.2" cy="5.8" r="1.6" />
    <line x1="12" y1="12" x2="15" y2="15" />
    <circle cx="16" cy="4" r="0.1" />
  </svg>
);

/* пуловер: лёжа, руки за голову дугой */
const Pullover = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="4" y1="16" x2="20" y2="16" />
    <circle cx="8" cy="12.5" r="1.7" />
    <path d="M9.5 11.5C12 8 15 7 18 8.5" />
    <rect x="17.4" y="6.8" width="2.4" height="3.4" rx="0.6" transform="rotate(25 18.6 8.5)" />
  </svg>
);

/* гиперэкстензия: наклонная опора + разгиб корпуса */
const Hyper = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4 19l7-7" />
    <line x1="9" y1="19" x2="4" y2="19" />
    <path d="M11 12l6-2" />
    <circle cx="18.8" cy="9.3" r="1.7" />
    <line x1="3" y1="21" x2="21" y2="21" />
  </svg>
);

/* становая: гриф у пола + наклон */
const Deadlift = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="13" cy="4.5" r="1.8" />
    <path d="M12 6.5 9 11l-1 4" />
    <path d="M9 11l4 4.5" />
    <line x1="4" y1="16" x2="17" y2="16" />
    <circle cx="6" cy="16" r="2.4" />
    <circle cx="15" cy="16" r="2.4" />
    <line x1="2" y1="20.5" x2="22" y2="20.5" />
  </svg>
);

/* жим стоя: штанга над головой */
const Ohp = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="5" y1="4.5" x2="19" y2="4.5" />
    <rect x="6.2" y="2.8" width="1.8" height="3.4" rx="0.5" />
    <rect x="16" y="2.8" width="1.8" height="3.4" rx="0.5" />
    <circle cx="12" cy="9.5" r="1.8" />
    <path d="M9 7.5 9 4.5M15 7.5 15 4.5" />
    <path d="M12 11.5v6" />
  </svg>
);

/* жим гантелей сидя: спинка + две гантели вверх */
const DbShoulderPress = ({ className }: P) => (
  <svg {...base} className={className}>
    <rect x="5.5" y="3" width="2.4" height="4" rx="0.6" />
    <rect x="16.1" y="3" width="2.4" height="4" rx="0.6" />
    <circle cx="12" cy="9" r="1.8" />
    <path d="M6.7 7v3l3 1.5M17.3 7v3l-3 1.5" />
    <path d="M12 11v5l-3 4M12 16l3 4" />
  </svg>
);

/* подъёмы перед собой: рука вперёд с гантелью */
const FrontRaise = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="8" cy="5.5" r="1.8" />
    <path d="M8 7.5v11" />
    <path d="M8 10h9" />
    <rect x="17.5" y="8.2" width="2.6" height="3.6" rx="0.6" />
  </svg>
);

/* махи в наклоне: корпус в наклоне, руки в стороны */
const RearDelt = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="14" cy="5" r="1.8" />
    <path d="M12.5 6.5 8 10v8" />
    <path d="M9.5 11 4 13.5M9.5 11l6 3" />
    <rect x="2.2" y="12.6" width="2.4" height="3.2" rx="0.6" />
    <rect x="15.5" y="13" width="2.4" height="3.2" rx="0.6" />
  </svg>
);

/* тяга к лицу: канат к голове */
const FacePull = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="3" y1="8" x2="3" y2="12" />
    <path d="M3 10h7" />
    <path d="M10 10l5-2.5M10 10l5 2.5" />
    <circle cx="18" cy="10" r="2.2" />
  </svg>
);

/* шраги: штанга + стрелки вверх у плеч */
const Shrugs = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="5" r="1.8" />
    <path d="M12 7v5" />
    <line x1="6" y1="13.5" x2="18" y2="13.5" />
    <path d="M7 10.5l0-2.5M5.8 9.2 7 8l1.2 1.2" />
    <path d="M17 10.5l0-2.5M15.8 9.2 17 8l1.2 1.2" />
  </svg>
);

/* подъём штанги на бицепс: гриф + дуга */
const BbCurl = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="4.5" r="1.8" />
    <path d="M12 6.5v10" />
    <path d="M8 16c-1.5-1-2-3-1.5-5" />
    <path d="M16 16c1.5-1 2-3 1.5-5" />
    <line x1="5" y1="16.5" x2="19" y2="16.5" />
  </svg>
);

/* молотки: вертикальные гантели по бокам */
const HammerCurl = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="4.5" r="1.8" />
    <path d="M12 6.5v11" />
    <path d="M8.5 9v4M15.5 9v4" />
    <rect x="6.8" y="12.5" width="3.4" height="2.4" rx="0.6" />
    <rect x="13.8" y="12.5" width="3.4" height="2.4" rx="0.6" />
  </svg>
);

/* сгибания на блоке: трос снизу */
const CableCurl = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="9" cy="5.5" r="1.8" />
    <path d="M9 7.5v10" />
    <path d="M9 12l5-1" />
    <path d="M14 11l3 8" />
    <line x1="15" y1="20" x2="19" y2="20" />
  </svg>
);

/* скамья Скотта: наклонная опора + рука */
const PreacherCurl = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="9" cy="5" r="1.8" />
    <path d="M10.5 7 14 9.5 14 13" />
    <path d="M5 11l8 3" />
    <line x1="7" y1="12" x2="7" y2="20" />
    <line x1="13" y1="14" x2="13" y2="20" />
  </svg>
);

/* разгибания из-за головы: согнутая рука вверх */
const OverheadExt = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="8" r="1.8" />
    <path d="M12 10v8" />
    <path d="M12 6.5V4l4-1" />
    <rect x="15.2" y="1.6" width="2.6" height="3" rx="0.6" />
  </svg>
);

/* жим узким хватом: гриф с узкими метками */
const CloseBench = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="2" y1="17" x2="22" y2="17" />
    <line x1="4" y1="8" x2="20" y2="8" />
    <line x1="10" y1="6.5" x2="10" y2="9.5" />
    <line x1="14" y1="6.5" x2="14" y2="9.5" />
  </svg>
);

/* разгибание в наклоне: рука назад */
const Kickback = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="7" cy="6" r="1.8" />
    <path d="M8.5 7.5 13 10l-1 8" />
    <path d="M13 10l6 1.5" />
    <rect x="18.2" y="9.8" width="2.6" height="3" rx="0.6" />
  </svg>
);

/* гоблет-присед: гантель у груди + присед */
const GobletSquat = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="5" r="1.7" />
    <rect x="10.6" y="8" width="2.8" height="3" rx="0.6" />
    <path d="M12 11v3l-3.5 3" />
    <path d="M12 14l3.5 3" />
    <line x1="4" y1="20" x2="20" y2="20" />
  </svg>
);

/* гакк: крутая наклонная платформа */
const HackSquat = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="4" y1="20" x2="20" y2="20" />
    <line x1="6" y1="20" x2="18" y2="5" />
    <circle cx="10" cy="10" r="1.7" />
    <path d="M10 12l1.5 3.5L8 18" />
  </svg>
);

/* выпады: шаг с согнутыми коленями */
const Lunges = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="11" cy="4.5" r="1.8" />
    <path d="M11 6.5v6" />
    <path d="M11 12.5 7 16v4" />
    <path d="M11 12.5l5 2.5 2 5" />
    <line x1="3" y1="21" x2="21" y2="21" />
  </svg>
);

/* болгарские выпады: задняя нога на опоре */
const BulgarianSplit = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="9" cy="4.5" r="1.8" />
    <path d="M9 6.5v6" />
    <path d="M9 12.5 6 16v4" />
    <path d="M9 12.5l6 1.5 3 1.5" />
    <rect x="16" y="15.5" width="5" height="4.5" />
    <line x1="2" y1="20" x2="14" y2="20" />
  </svg>
);

/* сгибания ног: лёжа, голень вверх */
const LegCurl = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="3" y1="15" x2="15" y2="15" />
    <circle cx="5" cy="12.5" r="1.7" />
    <path d="M15 15l4-4" />
    <circle cx="19.8" cy="10.2" r="1.2" />
    <line x1="4" y1="19" x2="20" y2="19" />
  </svg>
);

/* румынская тяга: прямые ноги, гриф у колен */
const Rdl = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="14" cy="4.5" r="1.8" />
    <path d="M13 6.5 9 9.5" />
    <path d="M9 9.5V19" />
    <path d="M9 10l4 3" />
    <line x1="5" y1="13.5" x2="14" y2="13.5" />
    <rect x="5.3" y="12" width="1.6" height="3" rx="0.5" />
    <line x1="3" y1="21" x2="21" y2="21" />
  </svg>
);

/* отведение бедра: нога в сторону */
const Abduction = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="10" cy="4.5" r="1.8" />
    <path d="M10 6.5v7" />
    <path d="M10 13.5 8.5 20" />
    <path d="M10 13.5l8 4" />
    <path d="M16 15l2-2M18 17.5l2-1" />
  </svg>
);

/* махи на блоке: нога назад + трос */
const CableKickback2 = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="9" cy="4.5" r="1.8" />
    <path d="M9 6.5v7" />
    <path d="M9 13.5 8 20" />
    <path d="M9 13.5l7 3.5" />
    <path d="M16 17l4 1.5" />
    <line x1="20" y1="20" x2="22" y2="20" />
  </svg>
);

/* подъём на носки сидя: колено + упор */
const SeatedCalf = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="7" cy="5" r="1.7" />
    <path d="M7 7v5l5 1" />
    <rect x="10" y="9.5" width="5" height="2.5" rx="0.6" />
    <path d="M12 13v4l2 2" />
    <line x1="4" y1="21" x2="20" y2="21" />
  </svg>
);

/* скручивания: лёжа, корпус согнут */
const Crunches = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="6.5" cy="10" r="1.8" />
    <path d="M8 11.5c2 1.5 3.5 2.5 5 3" />
    <path d="M13 14.5l3-4 3 2" />
    <path d="M19 12.5l1 6" />
    <line x1="3" y1="19.5" x2="21" y2="19.5" />
  </svg>
);

/* подъёмы ног: лёжа, ноги вертикально */
const LegRaises = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="5" cy="15" r="1.8" />
    <path d="M7 16h7" />
    <path d="M14 16V5" />
    <line x1="3" y1="19.5" x2="21" y2="19.5" />
  </svg>
);

/* русские скручивания: сидя V + поворот */
const RussianTwist = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="10" cy="5" r="1.8" />
    <path d="M10 7l1 6" />
    <path d="M11 13l6 4" />
    <path d="M11 13l-5 5" />
    <path d="M14 8c2 0 3.5 1 4 3" />
    <path d="M17 12l1.5-0.5.5 1.8" />
  </svg>
);

/* ролик: колесо + вытянутый корпус */
const AbWheel = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="6" cy="16" r="3" />
    <circle cx="14" cy="7" r="1.7" />
    <path d="M8.5 14.5 13 9" />
    <path d="M15 8.5l5 5 1 5" />
    <line x1="3" y1="21" x2="21" y2="21" />
  </svg>
);

/* дорожка: наклонное полотно + стойка */
const Treadmill = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="3" y1="18" x2="19" y2="16" />
    <path d="M19 16V6" />
    <path d="M19 6h-4" />
    <circle cx="10" cy="7" r="1.6" />
    <path d="M10 8.5l1 4-3 3M11 12l3 2" />
  </svg>
);

/* велотренажёр */
const Bike = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="6" cy="16" r="3.2" />
    <circle cx="18" cy="16" r="3.2" />
    <path d="M6 16 10 9h5" />
    <path d="M15 9l3 7" />
    <circle cx="12" cy="15" r="1.4" />
    <path d="M10 9 8 7h-2" />
  </svg>
);

/* эллипс: овалы педалей + поручни */
const Elliptical = ({ className }: P) => (
  <svg {...base} className={className}>
    <ellipse cx="12" cy="17" rx="7" ry="2.6" />
    <path d="M8 16V7M16 16V7" />
    <path d="M8 7l3-2M16 7l-3-2" />
  </svg>
);

/* гребля: рельса + сиденье + тяга */
const RowingMachine = ({ className }: P) => (
  <svg {...base} className={className}>
    <line x1="3" y1="18" x2="21" y2="18" />
    <circle cx="9" cy="9" r="1.7" />
    <path d="M9 10.5l-2 4" />
    <rect x="5.5" y="14.5" width="4" height="2" rx="0.8" />
    <path d="M10.5 12h6" />
    <line x1="17.5" y1="10.5" x2="17.5" y2="13.5" />
  </svg>
);

/* скакалка: дуга вокруг фигуры */
const JumpRope = ({ className }: P) => (
  <svg {...base} className={className}>
    <circle cx="12" cy="6" r="1.8" />
    <path d="M12 8v6l-2 5M12 14l2 5" />
    <path d="M5 13c0 5 3.5 8 7 8s7-3 7-8" />
    <line x1="5" y1="11" x2="5" y2="13.5" />
    <line x1="19" y1="11" x2="19" y2="13.5" />
  </svg>
);

/* степпер: ступени */
const Stairs = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M3 20h5v-4h5v-4h5V8h3" />
    <circle cx="13" cy="4.5" r="1.6" />
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
  squat: Squat,
  hipThrust: Bridge,
  plank: Plank,
  pullups: PullUps,
  benchDb: BenchDb,
  benchDb30: BenchDb30,
  dips: Dips,
  pushups: PushUps,
  flyes: Flyes,
  pecdeck: PecDeck,
  cableCross: CableCross,
  dbRow: DbRow,
  barbellRow: BarbellRow,
  tbarRow: TbarRow,
  pullover: Pullover,
  hyper: Hyper,
  deadlift: Deadlift,
  ohp: Ohp,
  dbShoulderPress: DbShoulderPress,
  frontRaise: FrontRaise,
  rearDelt: RearDelt,
  facePull: FacePull,
  shrugs: Shrugs,
  bbCurl: BbCurl,
  hammerCurl: HammerCurl,
  cableCurl: CableCurl,
  preacherCurl: PreacherCurl,
  overheadExt: OverheadExt,
  closeBench: CloseBench,
  kickback: Kickback,
  gobletSquat: GobletSquat,
  hackSquat: HackSquat,
  lunges: Lunges,
  bulgarianSplit: BulgarianSplit,
  legCurl: LegCurl,
  rdl: Rdl,
  abduction: Abduction,
  cableKickback: CableKickback2,
  seatedCalf: SeatedCalf,
  crunches: Crunches,
  legRaises: LegRaises,
  russianTwist: RussianTwist,
  abWheel: AbWheel,
  treadmill: Treadmill,
  bike: Bike,
  elliptical: Elliptical,
  rowingMachine: RowingMachine,
  jumpRope: JumpRope,
  stairs: Stairs,
};

/** Фолбэк-иконки по группе мышц. */
const GROUP_ICONS: Record<string, (p: P) => ReactElement> = {
  chest: Bench0,
  back: PullUps,
  shoulders: LatRaise,
  biceps: Curl,
  triceps: TriPush,
  legs: Squat,
  glutes: Bridge,
  calves: Calf,
  core: Plank,
  cardio: Cardio,
};

export function ExerciseIcon({ id, className }: { id: string; className?: string }) {
  const Icon = EXERCISE_ICONS[id] ?? GROUP_ICONS[exerciseGroup(id) ?? ""] ?? DumbbellIcon;
  return <Icon className={className} />;
}
