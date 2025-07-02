import React from 'react';
import { useItemsStore } from '../state/useItemsStore';
import { RARITY_COLORS } from '../utils/constants';
import { calculateMissingMaterials } from '../utils/inventoryLogic';

interface ShoppingListProps {
  itemId: string;
  quantity: number;
  recipeIndex?: number;
}

interface MaterialNeed {
  itemId: string;
  needed: number;
  have: number;
  missing: number;
}

const ShoppingList: React.FC<ShoppingListProps> = ({ 
  itemId, 
  quantity, 
  recipeIndex = 0 
}) => {
  const { items, inventory } = useItemsStore();

  // Calculate all material needs recursively
  const calculateMaterialNeeds = (
    itemId: string, 
    quantity: number, 
    recipeIndex: number = 0,
    visited: Set<string> = new Set(),
    needs: Map<string, number> = new Map()
  ): Map<string, number> => {
    
    // Prevent infinite loops
    if (visited.has(itemId)) {
      return needs;
    }
    
    const item = items[itemId];
    if (!item) {
      return needs;
    }

    // If no recipes (base material), add to needs
    if (!item.recipes || item.recipes.length === 0) {
      const currentNeed = needs.get(itemId) || 0;
      needs.set(itemId, currentNeed + quantity);
      return needs;
    }

    const recipe = item.recipes[recipeIndex];
    if (!recipe) {
      return needs;
    }

    visited.add(itemId);

    // Process ingredients
    recipe.consumed_items.forEach(ingredient => {
      const ingredientQuantity = Math.ceil((quantity / recipe.output_quantity) * ingredient.quantity);
      calculateMaterialNeeds(
        ingredient.id.toString(), 
        ingredientQuantity, 
        0, 
        new Set(visited),
        needs
      );
    });

    return needs;
  };

  const materialNeeds = calculateMaterialNeeds(itemId, quantity, recipeIndex);
  
  // Convert to array with smart inventory information
  const shoppingListData = calculateMissingMaterials(items, inventory, materialNeeds);
  
  const shoppingList = shoppingListData
    .filter(item => item.missing > 0) // Only show items we're missing
    .sort((a, b) => {
      const itemA = items[a.itemId];
      const itemB = items[b.itemId];
      if (!itemA || !itemB) return 0;
      // Sort by tier first, then by name
      if (itemA.tier !== itemB.tier) {
        return itemA.tier - itemB.tier;
      }
      return itemA.name.localeCompare(itemB.name);
    });

  const totalMissingItems = shoppingList.length;
  const totalMissingQuantity = shoppingList.reduce((sum, item) => sum + item.missing, 0);

  if (shoppingList.length === 0) {
    return (
      <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">✅</span>
          <h3 className="text-xl font-bold text-green-800">Ready to Craft!</h3>
        </div>
        <p className="text-green-700">
          You have all the materials needed to craft {quantity.toLocaleString()}× {items[itemId]?.name || 'this item'}.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🛒</span>
          <h3 className="text-xl font-bold text-orange-800">Shopping List</h3>
        </div>
        <div className="text-sm text-orange-700 bg-orange-200 px-3 py-1 rounded-full">
          {totalMissingItems} items • {totalMissingQuantity.toLocaleString()} total
        </div>
      </div>
      
      <p className="text-orange-700 mb-4">
        Missing materials to craft {quantity.toLocaleString()}× {items[itemId]?.name || 'this item'}:
      </p>

      <div className="space-y-2">
        {shoppingList.map(({ itemId, needed, have, effectiveHave, missing, substitutes }) => {
          const item = items[itemId];
          if (!item) return null;

          return (
            <div 
              key={itemId}
              className="bg-white border border-orange-200 rounded-lg p-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span 
                    className={`w-4 h-4 rounded-full ${RARITY_COLORS[item.rarity as keyof typeof RARITY_COLORS] || 'bg-gray-400'}`}
                  />
                  <div>
                    <span className="font-medium text-gray-800">{item.name}</span>
                    <span className="text-sm text-gray-500 ml-2">Tier {item.tier}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-gray-600">
                    Need: <span className="font-bold">{needed.toLocaleString()}</span>
                  </div>
                  <div className="text-green-600">
                    Have: <span className="font-bold">{effectiveHave.toLocaleString()}</span>
                    {effectiveHave > have && (
                      <span className="text-xs ml-1">({have} direct)</span>
                    )}
                  </div>
                  <div className="text-red-600 bg-red-100 px-2 py-1 rounded">
                    Missing: <span className="font-bold">{missing.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              {/* Show substitute items */}
              {substitutes.length > 0 && (
                <div className="mt-2 pt-2 border-t border-orange-100">
                  <div className="text-xs text-green-600">
                    💡 <strong>Can substitute with:</strong> {substitutes.map(sub => `${sub.quantity}× ${sub.itemName}`).join(', ')}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-3 bg-orange-100 rounded-lg">
        <p className="text-sm text-orange-800">
          💡 <strong>Tip:</strong> Use the Inventory Manager tab to input what materials you currently have, 
          then this list will automatically update to show only what you're missing.
        </p>
      </div>
    </div>
  );
};

export default ShoppingList; 