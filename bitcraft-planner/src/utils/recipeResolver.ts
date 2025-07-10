import { ItemsData } from '../types/Item';
import { Inventory } from '../state/useItemsStore';
import { 
  RecipeResolverResult, 
  ResolverIngredient, 
  MaterialSummary,
  RecipeResolverOptions 
} from '../types/RecipeResolver';
import { getEffectiveInventoryQuantity } from './inventoryLogic';

/**
 * Recipe Resolver with Inventory Pruning
 * 
 * This system resolves crafting dependencies for a target item, using the existing
 * recipes data and user inventory to determine what needs to be crafted and what can be skipped.
 * 
 * Core Logic:
 * - Recursively resolves item dependencies
 * - Prunes crafting paths when items are already present in inventory
 * - Builds a step-by-step plan of what needs to be crafted, skipped, or gathered
 */

export class RecipeResolver {
  private items: ItemsData;
  private inventory: Inventory;
  private visited: Set<string> = new Set();
  private materialMap: Map<string, MaterialSummary> = new Map();

  constructor(items: ItemsData, inventory: Inventory) {
    this.items = items;
    this.inventory = inventory;
  }

  /**
   * Main resolver method that creates the complete dependency tree
   */
  resolve(options: RecipeResolverOptions): RecipeResolverResult {
    this.visited.clear();
    this.materialMap.clear();

    const { targetItemId, targetQuantity, recipeIndex = 0, maxDepth = 20 } = options;
    
    const targetItem = this.items[targetItemId];
    if (!targetItem) {
      throw new Error(`Item with ID ${targetItemId} not found`);
    }

    const result = this.resolveItem(targetItemId, targetQuantity, recipeIndex, 0, maxDepth);
    
    // Build flat materials summary
    const totalMaterialsFlat = Array.from(this.materialMap.values())
      .sort((a, b) => a.tier - b.tier || a.itemName.localeCompare(b.itemName));

    return {
      item: targetItem.name,
      itemId: targetItemId,
      itemName: targetItem.name,
      needed: targetQuantity,
      available: this.getInventoryQuantity(targetItemId),
      craft: result.craft,
      status: result.status,
      ingredients: result.ingredients,
      totalMaterialsFlat
    };
  }

  /**
   * Recursively resolve item dependencies with inventory pruning
   */
  private resolveItem(
    itemId: string, 
    quantity: number, 
    recipeIndex: number = 0,
    depth: number = 0,
    maxDepth: number = 20
  ): ResolverIngredient {
    // Prevent infinite loops and excessive depth
    const visitKey = `${itemId}-${depth}`;
    if (this.visited.has(visitKey) || depth > maxDepth) {
      return this.createSkippedResult(itemId, quantity);
    }
    this.visited.add(visitKey);

    const item = this.items[itemId];
    if (!item) {
      return this.createMissingResult(itemId, quantity);
    }

    const inventoryQuantity = this.getInventoryQuantity(itemId);
    const effectiveInventoryQuantity = this.getEffectiveInventoryQuantity(itemId);

    // Check if we have enough in inventory (full or partial coverage)
    // If we have enough, completely prune this branch - don't process any ingredients
    if (effectiveInventoryQuantity >= quantity) {
      this.addToMaterialMap(itemId, quantity, inventoryQuantity, false, 'already_available');
      return {
        item: item.name,
        itemId,
        itemName: item.name,
        needed: quantity,
        available: effectiveInventoryQuantity,
        craft: false,
        status: 'already_available',
        ingredients: [] // PRUNED: No sub-ingredients when we already have this item
      };
    }

    // Check if this is a base item (no recipes)
    if (!item.recipes || item.recipes.length === 0) {
      this.addToMaterialMap(itemId, quantity, inventoryQuantity, false, 'missing');
      return {
        item: item.name,
        itemId,
        itemName: item.name,
        needed: quantity,
        available: inventoryQuantity,
        craft: false,
        status: 'missing',
        ingredients: []
      };
    }

    // Get the recipe to use
    const recipe = item.recipes[recipeIndex] || item.recipes[0];
    if (!recipe) {
      this.addToMaterialMap(itemId, quantity, inventoryQuantity, false, 'missing');
      return {
        item: item.name,
        itemId,
        itemName: item.name,
        needed: quantity,
        available: inventoryQuantity,
        craft: false,
        status: 'missing',
        ingredients: []
      };
    }

    // Calculate how much we still need to craft after using inventory
    const stillNeeded = Math.max(0, quantity - effectiveInventoryQuantity);
    const craftingOperations = Math.ceil(stillNeeded / recipe.output_quantity);
    const willCraft = craftingOperations > 0;

    // Add this item to materials map
    this.addToMaterialMap(itemId, quantity, inventoryQuantity, willCraft, willCraft ? 'needs_crafting' : 'already_available');

    // Resolve ingredients recursively
    const ingredients: ResolverIngredient[] = [];
    
    if (willCraft) {
      recipe.consumed_items.forEach(ingredient => {
        const requiredQuantity = craftingOperations * ingredient.quantity;
        const resolvedIngredient = this.resolveItem(
          ingredient.id.toString(), 
          requiredQuantity, 
          0, // Use default recipe for ingredients
          depth + 1,
          maxDepth
        );
        ingredients.push(resolvedIngredient);
      });
    }

    return {
      item: item.name,
      itemId,
      itemName: item.name,
      needed: quantity,
      available: effectiveInventoryQuantity,
      craft: willCraft,
      status: willCraft ? 'needs_crafting' : 'already_available',
      ingredients
    };
  }

  private createSkippedResult(itemId: string, quantity: number): ResolverIngredient {
    const item = this.items[itemId];
    const itemName = item?.name || 'Unknown Item';
    
    return {
      item: itemName,
      itemId,
      itemName,
      needed: quantity,
      available: 0,
      craft: false,
      status: 'skipped_nested',
      ingredients: []
    };
  }

  private createMissingResult(itemId: string, quantity: number): ResolverIngredient {
    return {
      item: 'Unknown Item',
      itemId,
      itemName: 'Unknown Item',
      needed: quantity,
      available: 0,
      craft: false,
      status: 'missing',
      ingredients: []
    };
  }

  private addToMaterialMap(
    itemId: string, 
    needed: number, 
    inventory: number, 
    craft: boolean, 
    status: MaterialSummary['status']
  ): void {
    const item = this.items[itemId];
    const existing = this.materialMap.get(itemId);
    
    if (existing) {
      existing.needed += needed;
      // Update craft status if any instance needs crafting
      if (craft) existing.craft = true;
      // Update status to prioritize needs_crafting over other statuses
      if (status === 'needs_crafting') existing.status = status;
    } else {
      this.materialMap.set(itemId, {
        itemId,
        itemName: item?.name || 'Unknown Item',
        needed,
        inventory,
        craft,
        status,
        tier: item?.tier || 0,
        rarity: item?.rarity || 1
      });
    }
  }

  private getInventoryQuantity(itemId: string): number {
    return this.inventory[itemId] || 0;
  }

  private getEffectiveInventoryQuantity(itemId: string): number {
    return getEffectiveInventoryQuantity(this.items, this.inventory, itemId);
  }
}

/**
 * Convenience function to create and use resolver
 */
export function resolveRecipeWithInventoryPruning(
  items: ItemsData,
  inventory: Inventory,
  options: RecipeResolverOptions
): RecipeResolverResult {
  const resolver = new RecipeResolver(items, inventory);
  return resolver.resolve(options);
} 