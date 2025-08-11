import { Recipe } from '../types/Item';

// Compute expected output per craft using possibilities if present; fallback to output_quantity
export function getEffectiveOutputPerCraft(recipe: Recipe | undefined | null): number {
  if (!recipe) return 1;
  const { possibilities, output_quantity } = recipe;
  if (possibilities && Object.keys(possibilities).length > 0) {
    let expected = 0;
    for (const key of Object.keys(possibilities)) {
      const qty = Number(key);
      const prob = (possibilities as Record<string, number>)[key];
      if (!Number.isFinite(qty) || !Number.isFinite(prob)) continue;
      expected += qty * prob;
    }
    if (expected > 0) return expected;
  }
  return output_quantity || 1;
}
