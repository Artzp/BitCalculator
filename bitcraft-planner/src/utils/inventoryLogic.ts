import { ItemsData } from '../types/Item';
import { Inventory } from '../state/useItemsStore';

// Find all items that use a specific component in their recipes
export const findItemsUsingComponent = (items: ItemsData, componentId: string): string[] => {
  const itemsUsingComponent: string[] = [];
  
  Object.entries(items).forEach(([itemId, item]) => {
    if (item.recipes && item.recipes.length > 0) {
      item.recipes.forEach(recipe => {
        if (recipe.consumed_items) {
          recipe.consumed_items.forEach(ingredient => {
            if (ingredient.id.toString() === componentId) {
              itemsUsingComponent.push(itemId);
            }
          });
        }
      });
    }
  });
  
  return itemsUsingComponent;
};

// Calculate effective inventory quantity considering component substitution
export const getEffectiveInventoryQuantity = (
  items: ItemsData,
  inventory: Inventory,
  targetItemId: string
): number => {
  // Direct inventory amount
  let totalAvailable = inventory[targetItemId] || 0;
  
  // Find items that use this component and check if we have any of those
  const itemsUsingThisComponent = findItemsUsingComponent(items, targetItemId);
  
  itemsUsingThisComponent.forEach(itemId => {
    const availableQuantity = inventory[itemId] || 0;
    if (availableQuantity > 0) {
      // Calculate how many of the component this higher-tier item provides
      const item = items[itemId];
      if (item && item.recipes && item.recipes.length > 0) {
        // Use the first recipe to determine component ratio
        const recipe = item.recipes[0];
        const componentUsage = recipe.consumed_items.find(
          ingredient => ingredient.id.toString() === targetItemId
        );
        
        if (componentUsage) {
          // Each higher-tier item provides componentUsage.quantity of the component
          // Adjusted for the recipe output quantity
          const componentProvidedPerItem = Math.floor(
            (componentUsage.quantity * availableQuantity) / recipe.output_quantity
          );
          totalAvailable += componentProvidedPerItem;
        }
      }
    }
  });
  
  return totalAvailable;
};

// Calculate missing materials with component substitution logic
export const calculateMissingMaterials = (
  items: ItemsData,
  inventory: Inventory,
  materialNeeds: Map<string, number>
): Array<{
  itemId: string;
  needed: number;
  have: number;
  effectiveHave: number;
  missing: number;
  substitutes: Array<{ itemId: string; quantity: number; itemName: string }>;
}> => {
  return Array.from(materialNeeds.entries()).map(([itemId, needed]) => {
    const directHave = inventory[itemId] || 0;
    const effectiveHave = getEffectiveInventoryQuantity(items, inventory, itemId);
    const missing = Math.max(0, needed - effectiveHave);
    
    // Find substitutes
    const substitutes: Array<{ itemId: string; quantity: number; itemName: string }> = [];
    const itemsUsingThisComponent = findItemsUsingComponent(items, itemId);
    
    itemsUsingThisComponent.forEach(substituteItemId => {
      const availableQuantity = inventory[substituteItemId] || 0;
      if (availableQuantity > 0) {
        const substituteItem = items[substituteItemId];
        if (substituteItem) {
          substitutes.push({
            itemId: substituteItemId,
            quantity: availableQuantity,
            itemName: substituteItem.name
          });
        }
      }
    });
    
    return {
      itemId,
      needed,
      have: directHave,
      effectiveHave,
      missing,
      substitutes
    };
  });
}; 