import type { FoodSearchResult } from "../types";

/** Открытая база Open Food Facts: лукап продукта по штрихкоду (КБЖУ на 100 г). */

const num = (v: unknown): number | null => {
  const n = typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) ? n : null;
};
const round1 = (n: number) => Math.round(n * 10) / 10;

interface OffNutriments {
  "energy-kcal_100g"?: number | string;
  energy_100g?: number | string;
  proteins_100g?: number | string;
  fat_100g?: number | string;
  carbohydrates_100g?: number | string;
}
interface OffResponse {
  status?: number;
  product?: {
    product_name?: string;
    product_name_ru?: string;
    generic_name?: string;
    generic_name_ru?: string;
    brands?: string;
    nutriments?: OffNutriments;
  };
}

/* ── Локальный кэш штрихкодов: ранее найденные/введённые вручную сохраняются на устройстве ── */

const BC_KEY = "t95:barcodes";

function readBarcodes(): Record<string, FoodSearchResult> {
  try {
    return JSON.parse(localStorage.getItem(BC_KEY) ?? "{}") as Record<string, FoodSearchResult>;
  } catch {
    return {};
  }
}

/** Ранее сохранённый продукт по штрихкоду (или null). */
export function cachedBarcode(code: string): FoodSearchResult | null {
  const clean = code.replace(/\D/g, "");
  if (clean.length < 6) return null;
  return readBarcodes()[clean] ?? null;
}

/** Запомнить продукт за штрихкодом (после ручного ввода или удачного лукапа). */
export function saveBarcode(code: string, food: FoodSearchResult): void {
  const clean = code.replace(/\D/g, "");
  if (clean.length < 6) return;
  try {
    const map = readBarcodes();
    map[clean] = { ...food, portion: food.portion ?? 100 };
    localStorage.setItem(BC_KEY, JSON.stringify(map));
  } catch (e) {
    console.error("barcode cache write failed", e);
  }
}

/**
 * Ищет продукт по штрихкоду: сначала локальный кэш, затем Open Food Facts.
 * Возвращает КБЖУ на 100 г или null, если продукт не найден / без данных о калорийности.
 */
export async function lookupBarcode(code: string): Promise<FoodSearchResult | null> {
  const clean = code.replace(/\D/g, "");
  if (clean.length < 6) return null;

  const local = cachedBarcode(clean);
  if (local) return local;

  const url = `https://world.openfoodfacts.org/api/v2/product/${clean}.json?fields=product_name,product_name_ru,generic_name,generic_name_ru,brands,nutriments`;
  const res = await fetch(url);
  /* OFF отдаёт 404 на ненайденный товар (с status:0) — это «не найдено», а не сбой сети */
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`off ${res.status}`);
  const data = (await res.json()) as OffResponse;
  if (data.status !== 1 || !data.product) return null;

  const p = data.product;
  const n = p.nutriments ?? {};
  const energyKj = num(n.energy_100g);
  const kcal = num(n["energy-kcal_100g"]) ?? (energyKj != null ? energyKj / 4.184 : null);
  const prot = num(n.proteins_100g) ?? 0;
  const fat = num(n.fat_100g) ?? 0;
  const carb = num(n.carbohydrates_100g) ?? 0;

  /* совсем пустой продукт — считаем «не найден» */
  if (kcal == null && prot === 0 && fat === 0 && carb === 0) return null;

  const brand = p.brands ? p.brands.split(",")[0].trim() : "";
  const name = (
    p.product_name_ru ||
    p.product_name ||
    p.generic_name_ru ||
    p.generic_name ||
    brand ||
    `Штрихкод ${clean}`
  ).trim();
  const food: FoodSearchResult = {
    name,
    kcal: Math.round(kcal ?? 0),
    p: round1(prot),
    f: round1(fat),
    c: round1(carb),
    portion: 100,
  };
  saveBarcode(clean, food); // запомним для оффлайн-повтора
  return food;
}
