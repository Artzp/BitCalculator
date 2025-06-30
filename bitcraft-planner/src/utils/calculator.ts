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
  
  function processItem(itemId: string, quantity: number, recipeIdx: number = 0) {
    const item = items[itemId];
    if (!item) return;
    
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
    
    // Process each ingredient
    recipe.consumed_items.forEach(ingredient => {
      const requiredQuantity = craftingOperations * ingredient.quantity;
      processItem(ingredient.id.toString(), requiredQuantity);
    });
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