const pad = (n: number) => String(n).padStart(2, "0");

/** Дата → "YYYY-MM-DD" (локальное время). */
export const dstr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayStr = () => dstr(new Date());

export const RU_DAYS = ["вс", "пн", "вт", "ср", "чт", "пт", "сб"];
const RU_MON = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];

/** "2026-06-11" → "чт, 11 июн". */
export const fmtDate = (s: string) => {
  const d = new Date(s + "T12:00:00");
  return `${RU_DAYS[d.getDay()]}, ${d.getDate()} ${RU_MON[d.getMonth()]}`;
};

/** Полных дней между двумя датами "YYYY-MM-DD". */
export const daysBetween = (a: string, b: string) =>
  Math.round((+new Date(b + "T12:00:00") - +new Date(a + "T12:00:00")) / 86400000);

/** День недели (0 = вс) для даты "YYYY-MM-DD". */
export const dayOfWeek = (s: string) => new Date(s + "T12:00:00").getDay();
