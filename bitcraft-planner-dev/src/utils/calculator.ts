import { ItemsData } from '../types/Item';

export interface MaterialRequirement {
  itemId: string;
  itemName: string;
  quantity: number;
  tier: number;
  rarity: number;
  isBaseItem: boolean;
}

export interface CalculationResult {
  targetItem: string;
  targetQuantity: number;
  baseMaterials: MaterialRequirement[];
  intermediateMaterials: MaterialRequirement[];
  totalMaterials: MaterialRequirement[];
}

export function calculateMaterials(
  items: ItemsData,
  targetItemId: string,
  targetQuantity: number,
  recipeIndex: number = 0
): CalculationResult {
  const materials = new Map<string, MaterialRequirement>();
  const intermediates = new Map<string, MaterialRequirement>();
  const processing = new Set<string>(); // Track items currently being processed to prevent cycles
  
  function processItem(itemId: string, quantity: number, recipeIdx: number = 0) {
    const item = items[itemId];
    if (!item) return;
    
    // Check for circular dependency
    if (processing.has(itemId)) {
      console.warn(`Circular dependency detected for item: ${item.name} (${itemId})`);
      return;
    }
    
    // If no recipes, this is a base item
    if (!item.recipes || item.recipes.length === 0) {
      const existing = materials.get(itemId);
      materials.set(itemId, {
        itemId,
        itemName: item.name,
        quantity: (existing?.quantity || 0) + quantity,
        tier: item.tier,
        rarity: item.rarity,
        isBaseItem: true
      });
      return;
    }
    
    const recipe = item.recipes[recipeIdx];
    if (!recipe) return;
    
    // Add this item as intermediate (except for the target item)
    if (itemId !== targetItemId) {
      const existing = intermediates.get(itemId);
      intermediates.set(itemId, {
        itemId,
        itemName: item.name,
        quantity: (existing?.quantity || 0) + quantity,
        tier: item.tier,
        rarity: item.rarity,
        isBaseItem: false
      });
    }
    
    // Calculate how many crafting operations we need
    const craftingOperations = Math.ceil(quantity / recipe.output_quantity);
    
    // Mark this item as being processed
    processing.add(itemId);
    
    // Process each ingredient
    recipe.consumed_items.forEach(ingredient => {
      const requiredQuantity = craftingOperations * ingredient.quantity;
      processItem(ingredient.id.toString(), requiredQuantity, 0); // Always use recipe index 0 for ingredients
    });
    
    // Remove from processing set when done
    processing.delete(itemId);
  }
  
  processItem(targetItemId, targetQuantity, recipeIndex);
  
  const baseMaterials = Array.from(materials.values()).sort((a, b) => 
    a.tier - b.tier || a.itemName.localeCompare(b.itemName)
  );
  
  const intermediateMaterials = Array.from(intermediates.values()).sort((a, b) => 
    a.tier - b.tier || a.itemName.localeCompare(b.itemName)
  );
  
  const totalMaterials = [...baseMaterials, ...intermediateMaterials].sort((a, b) => 
    a.tier - b.tier || a.itemName.localeCompare(b.itemName)
  );
  
  return {
    targetItem: items[targetItemId]?.name || 'Unknown',
    targetQuantity,
    baseMaterials,
    intermediateMaterials,
    totalMaterials
  };
} 