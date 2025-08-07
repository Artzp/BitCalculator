import { ItemsData, Item, Recipe } from '../types/Item';
import { Inventory } from '../state/useItemsStore';
import { RecipeResolverResult, ResolverIngredient, MaterialSummary } from '../types/RecipeResolver';

interface ResolveOptions {
  targetItemId: string;
  targetQuantity: number;
  recipeIndex?: number;
}

/**
 * Resolves a recipe tree, pruning branches based on available inventory.
 * This function recursively calculates net material requirements.
 *
 * @param items - The complete items data from the store.
 * @param inventory - The player's current inventory.
 * @param options - The target item and quantity to resolve.
 * @param visited - A set to track visited items to prevent infinite loops.
 * @returns A RecipeResolverResult object containing the dependency tree and a flat summary.
 */
export const resolveRecipeWithInventoryPruning = (
  items: ItemsData,
  inventory: Inventory,
  options: ResolveOptions,
  visited = new Set<string>()
): RecipeResolverResult => {
  const { targetItemId, targetQuantity, recipeIndex = 0 } = options;
  const item = items[targetItemId];

  if (!item) {
    return {
      itemId: targetItemId,
      itemName: 'Unknown Item',
      quantity: targetQuantity,
      available: 0,
      needed: targetQuantity,
      craft: false,
      status: 'missing',
      children: [],
      recipeIndex,
      totalMaterialsFlat: []
    };
  }

  if (visited.has(targetItemId)) {
    // Prevent infinite recursion for circular dependencies
    return {
      itemId: targetItemId,
      itemName: item.name,
      quantity: targetQuantity,
      available: 0,
      needed: targetQuantity,
      craft: false,
      status: 'skipped_nested',
      children: [],
      recipeIndex,
      totalMaterialsFlat: [],
    };
  }
  visited.add(targetItemId);

  const available = inventory[targetItemId] || 0;
  const needed = Math.max(0, targetQuantity - available);
  const recipe = item.recipes?.[recipeIndex];
  const isBaseItem = !item.recipes || item.recipes.length === 0;

  let children: RecipeResolverResult[] = [];
  let totalMaterialsFlat: MaterialSummary[] = [];
  let status: 'already_available' | 'needs_crafting' | 'missing' | 'skipped_nested' = 'already_available';
  let craft = false;

  if (needed > 0) {
    if (recipe) {
      craft = true;
      status = 'needs_crafting';
      const craftsNeeded = Math.ceil(needed / (recipe.output_quantity || 1));

      children = recipe.consumed_items.map(ingredient => {
        const childResult = resolveRecipeWithInventoryPruning(
          items,
          inventory,
          {
            targetItemId: String(ingredient.id),
            targetQuantity: ingredient.quantity * craftsNeeded,
          },
          new Set(visited) // Pass a copy of visited set to each branch
        );
        totalMaterialsFlat.push(...childResult.totalMaterialsFlat);
        return childResult;
      });
    } else {
      status = 'missing'; // Needed, but no recipe to craft it
    }
  }
  
  // The current item itself is a material that needs to be accounted for.
  const thisMaterial: MaterialSummary = {
    itemId: targetItemId,
    itemName: item.name,
    tier: item.tier,
    rarity: item.rarity,
    isBaseItem: isBaseItem, // <-- THE FIX IS HERE
    needed: targetQuantity,
    inventory: available,
    craft: craft,
    status: status,
  };

  totalMaterialsFlat.push(thisMaterial);
  
  // Deduplicate and aggregate the flat list
  const aggregatedMaterials = new Map<string, MaterialSummary>();
  totalMaterialsFlat.forEach(mat => {
      const existing = aggregatedMaterials.get(mat.itemId);
      if (existing) {
          existing.needed += mat.needed;
      } else {
          aggregatedMaterials.set(mat.itemId, { ...mat });
      }
  });


  visited.delete(targetItemId);

  return {
    itemId: targetItemId,
    itemName: item.name,
    quantity: targetQuantity,
    available,
    needed,
    craft,
    status,
    children,
    recipeIndex,
    totalMaterialsFlat: Array.from(aggregatedMaterials.values()),
  };
};
