import type { GoalMode } from "../types";

export interface Targets {
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
}

const round50 = (n: number) => Math.round(n / 50) * 50;
const round5 = (n: number) => Math.round(n / 5) * 5;

/**
 * Рекомендуемое КБЖУ по текущему весу и режиму цели.
 * Эвристика для тренирующегося человека: сброс ≈ −20% от поддержки,
 * рекомпозиция ≈ поддержка, набор ≈ +10–15%.
 */
export function recommendTargets(weightKg: number, goal: GoalMode): Targets {
  const factors: Record<GoalMode, { kcal: number; protein: number; fat: number }> = {
    cut: { kcal: 21, protein: 1.6, fat: 0.65 },
    recomp: { kcal: 26, protein: 1.8, fat: 0.8 },
    bulk: { kcal: 31, protein: 1.8, fat: 0.9 },
  };
  const f = factors[goal];
  const kcal = Math.max(1400, round50(weightKg * f.kcal));
  const protein = round5(weightKg * f.protein);
  const fat = round5(weightKg * f.fat);
  const carbs = Math.max(0, round5((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, fat, carbs };
}
