// Recipe Resolver with Inventory Pruning Types

export interface ResolverIngredient {
  item: string;
  itemId: string;
  itemName: string;
  needed: number;
  available: number;
  craft: boolean;
  status: 'already_available' | 'needs_crafting' | 'missing' | 'skipped_nested';
  ingredients: ResolverIngredient[];
}

export interface RecipeResolverResult {
  item: string;
  itemId: string;
  itemName: string;
  needed: number;
  available: number;
  craft: boolean;
  status: 'already_available' | 'needs_crafting' | 'missing' | 'skipped_nested';
  ingredients: ResolverIngredient[];
  totalMaterialsFlat: MaterialSummary[];
}

export interface MaterialSummary {
  itemId: string;
  itemName: string;
  needed: number;
  inventory: number;
  craft: boolean;
  status: 'already_available' | 'needs_crafting' | 'missing' | 'skipped_nested';
  tier: number;
  rarity: number;
}

export interface RecipeResolverOptions {
  targetItemId: string;
  targetQuantity: number;
  recipeIndex?: number;
  maxDepth?: number;
} 