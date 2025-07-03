import React from 'react';
import { useItemsStore } from '../state/useItemsStore';
import { RARITY_COLORS, RARITY_NAMES } from '../utils/constants';

interface CraftingStep {
  stepNumber: number;
  itemId: string;
  itemName: string;
  quantity: number;
  tier: number;
  rarity: number;
  ingredients: Array<{
    id: string;
    name: string;
    quantity: number;
    tier: number;
    rarity: number;
  }>;
  outputQuantity: number;
  skillRequirement: string | null;
  buildingRequirement: string | null;
}

const BuildSteps: React.FC = () => {
  const { 
    buildList, 
    items, 
    inventory, 
    setInventoryItem, 
    getEffectiveInventoryQuantity 
  } = useItemsStore();

  const getCraftingSteps = (): CraftingStep[] => {
    // First, collect all crafting requirements with proper aggregation
    const craftingRequirements = new Map<string, {
      itemId: string;
      totalQuantity: number;
      recipeIndex: number;
      dependencies: Set<string>;
    }>();

    const collectRequirements = (itemId: string, quantity: number, recipeIndex: number = 0, visited: Set<string> = new Set()) => {
      // Prevent infinite loops
      if (visited.has(itemId)) return;
      visited.add(itemId);

      const item = items[itemId];
      if (!item || !item.recipes || item.recipes.length === 0) return;

      // Check if we already have enough of this item
      const currentHave = getEffectiveInventoryQuantity(itemId);
      const actualQuantityNeeded = Math.max(0, quantity - currentHave);
      
      // If we have enough, don't need to craft it
      if (actualQuantityNeeded <= 0) return;

      const recipe = item.recipes[recipeIndex] || item.recipes[0];
      if (!recipe) return;

      // Add/update this item's requirements (only the quantity we actually need)
      const existing = craftingRequirements.get(itemId);
      if (existing) {
        existing.totalQuantity += actualQuantityNeeded;
      } else {
        craftingRequirements.set(itemId, {
          itemId,
          totalQuantity: actualQuantityNeeded,
          recipeIndex,
          dependencies: new Set()
        });
      }

      // Process dependencies and track them
      recipe.consumed_items.forEach(ingredient => {
        const ingredientItem = items[ingredient.id.toString()];
        if (ingredientItem && ingredientItem.recipes && ingredientItem.recipes.length > 0) {
          const requiredQuantity = Math.ceil(actualQuantityNeeded / recipe.output_quantity) * ingredient.quantity;
          
          // Track dependency
          craftingRequirements.get(itemId)!.dependencies.add(ingredient.id.toString());
          
          // Recursively collect requirements
          collectRequirements(ingredient.id.toString(), requiredQuantity, 0, new Set(visited));
        }
      });
    };

    // Collect requirements for all build list items
    buildList.forEach(buildItem => {
      collectRequirements(buildItem.itemId, buildItem.quantity, buildItem.recipeIndex);
    });

    // Topological sort to get correct crafting order
    const sortedItems: string[] = [];
    const processed = new Set<string>();
    const processing = new Set<string>();

    const topologicalSort = (itemId: string): void => {
      if (processed.has(itemId) || processing.has(itemId)) return;
      processing.add(itemId);

      const requirement = craftingRequirements.get(itemId);
      if (requirement) {
        // Process all dependencies first
        requirement.dependencies.forEach(depId => {
          if (craftingRequirements.has(depId)) {
            topologicalSort(depId);
          }
        });
      }

      processing.delete(itemId);
      processed.add(itemId);
      sortedItems.push(itemId);
    };

    // Sort all crafting requirements
    Array.from(craftingRequirements.keys()).forEach(itemId => {
      topologicalSort(itemId);
    });

    // Convert to CraftingStep objects
    const steps: CraftingStep[] = [];
    sortedItems.forEach((itemId, index) => {
      const requirement = craftingRequirements.get(itemId);
      if (!requirement) return;

      const item = items[itemId];
      const recipe = item.recipes[requirement.recipeIndex] || item.recipes[0];
      
      const ingredients = recipe.consumed_items.map(ing => {
        const ingItem = items[ing.id.toString()];
        const totalCrafts = Math.ceil(requirement.totalQuantity / recipe.output_quantity);
        return {
          id: ing.id.toString(),
          name: ingItem?.name || `Item ${ing.id}`,
          quantity: totalCrafts * ing.quantity,
          tier: ingItem?.tier || 0,
          rarity: ingItem?.rarity || 1
        };
      });

      steps.push({
        stepNumber: index + 1,
        itemId,
        itemName: item.name,
        quantity: requirement.totalQuantity,
        tier: item.tier,
        rarity: item.rarity,
        ingredients,
        outputQuantity: recipe.output_quantity,
        skillRequirement: recipe.skill_requirement ? 
          `${recipe.skill_requirement.skill_name} ${recipe.skill_requirement.skill_level}` : null,
        buildingRequirement: recipe.building_requirement
      });
    });

    return steps;
  };

  const steps = getCraftingSteps();

  const handleInventoryChange = (itemId: string, value: string) => {
    const quantity = parseInt(value) || 0;
    setInventoryItem(itemId, quantity);
  };

  const canCompleteStep = (step: CraftingStep): boolean => {
    // First check if we already have enough of the main item
    const currentHaveMainItem = getEffectiveInventoryQuantity(step.itemId);
    if (currentHaveMainItem >= step.quantity) {
      return true; // We already have enough, step is complete
    }

    // Otherwise check if we can craft it by having all ingredients
    return step.ingredients.every(ingredient => {
      const effectiveHave = getEffectiveInventoryQuantity(ingredient.id);
      
      // Check if we have enough directly in inventory
      if (effectiveHave >= ingredient.quantity) {
        return true;
      }
      
      // Check if this ingredient can be crafted from previous steps
      const ingredientItem = items[ingredient.id];
      if (ingredientItem && ingredientItem.recipes && ingredientItem.recipes.length > 0) {
        // This is a craftable item - assume we can make it if we can complete its recipe
        const ingredientRecipe = ingredientItem.recipes[0];
        const canCraftIngredient = ingredientRecipe.consumed_items.every(subIngredient => {
          const subEffectiveHave = getEffectiveInventoryQuantity(subIngredient.id.toString());
          return subEffectiveHave >= subIngredient.quantity;
        });
        
        if (canCraftIngredient) {
          return true;
        }
      }
      
      return false;
    });
  };

  if (buildList.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="bg-slate-50 rounded-lg p-6 border-2 border-dashed border-slate-300">
          <div className="text-2xl mb-2">📋</div>
          <div className="text-lg font-medium text-slate-600 mb-2">No crafting steps</div>
          <div className="text-sm text-slate-500">
            Add items to your build list to see crafting steps
          </div>
        </div>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="bg-slate-50 rounded-lg p-6 border-2 border-dashed border-slate-300">
          <div className="text-2xl mb-2">🏗️</div>
          <div className="text-lg font-medium text-slate-600 mb-2">No crafting needed</div>
          <div className="text-sm text-slate-500">
            All items in your build list are base materials
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 overflow-auto">
      {/* Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
        <div className="text-2xl font-bold text-blue-800">{steps.length}</div>
        <div className="text-sm text-blue-600 font-medium">Crafting Steps</div>
        <div className="text-xs text-blue-500 mt-1">Follow these steps in order</div>
      </div>

      {/* Steps */}
      <div className="space-y-4">
        {steps.map((step, index) => {
          const stepCanComplete = canCompleteStep(step);
          
          return (
            <div
              key={`${step.itemId}-${step.stepNumber}`}
              className={`rounded-lg border-2 p-4 shadow-sm transition-all ${
                stepCanComplete 
                  ? 'bg-green-50 border-green-300' 
                  : 'bg-white border-slate-200'
              }`}
            >
              {/* Step Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm ${
                    stepCanComplete 
                      ? 'bg-green-600 text-white' 
                      : 'bg-blue-600 text-white'
                  }`}>
                    {stepCanComplete ? '✓' : step.stepNumber}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{step.itemName}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        Tier {step.tier >= 0 ? step.tier : 'Base'}
                      </span>
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${RARITY_COLORS[step.rarity as keyof typeof RARITY_COLORS]} bg-slate-100`}>
                        {RARITY_NAMES[step.rarity as keyof typeof RARITY_NAMES]}
                      </span>
                      {stepCanComplete && (
                        <span className="text-xs font-semibold px-2 py-1 rounded bg-green-100 text-green-800">
                          Ready to Craft
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-800">{step.quantity}</div>
                  <div className="text-xs text-slate-600">needed</div>
                </div>
              </div>

              {/* Crafting Info */}
            <div className="bg-slate-50 rounded-lg p-3 mb-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-slate-700">Crafts needed:</span>
                  <span className="ml-2 text-slate-800">{Math.ceil(step.quantity / step.outputQuantity)}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Each craft makes:</span>
                  <span className="ml-2 text-slate-800">{step.outputQuantity}</span>
                </div>
              </div>
              
              {/* Requirements */}
              <div className="mt-2 space-y-1">
                {step.skillRequirement && (
                  <div className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded inline-block mr-2">
                    🎯 Requires: {step.skillRequirement}
                  </div>
                )}
                {step.buildingRequirement && (
                  <div className="text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded inline-block">
                    🏗️ Building: {step.buildingRequirement}
                  </div>
                )}
              </div>
            </div>

            {/* Ingredients */}
            <div>
              <h4 className="font-medium text-slate-700 mb-2 text-sm">Required materials:</h4>
              <div className="space-y-2">
                {step.ingredients.map((ingredient) => {
                  const currentHave = inventory[ingredient.id] || 0;
                  const effectiveHave = getEffectiveInventoryQuantity(ingredient.id);
                  const hasEnough = effectiveHave >= ingredient.quantity;
                  const missing = Math.max(0, ingredient.quantity - effectiveHave);
                  
                  return (
                    <div
                      key={ingredient.id}
                      className={`rounded-lg p-3 border-2 transition-all ${
                        hasEnough 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-medium text-slate-800">{ingredient.name}</div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs bg-slate-200 px-1 py-0.5 rounded">
                                T{ingredient.tier >= 0 ? ingredient.tier : 'B'}
                              </span>
                              <span className={`text-xs px-1 py-0.5 rounded ${RARITY_COLORS[ingredient.rarity as keyof typeof RARITY_COLORS]} bg-slate-200`}>
                                {RARITY_NAMES[ingredient.rarity as keyof typeof RARITY_NAMES]}
                              </span>
                            </div>
                          </div>
                          {hasEnough && <span className="text-green-600 font-bold text-lg">✓</span>}
                        {!hasEnough && effectiveHave > 0 && (
                          <span className="text-orange-600 font-bold text-sm">Partial</span>
                        )}
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-slate-800">
                            {ingredient.quantity.toLocaleString()}
                          </div>
                          <div className="text-xs text-slate-600">needed</div>
                        </div>
                      </div>

                      {/* Inventory Management */}
                      <div className="grid grid-cols-4 gap-2 text-center text-xs">
                        <div className="bg-green-100 border border-green-300 rounded p-2">
                          <div className="text-green-700 font-medium mb-1">HAVE</div>
                          <input
                            type="number"
                            value={currentHave}
                            onChange={(e) => handleInventoryChange(ingredient.id, e.target.value)}
                            className="w-full text-green-800 font-bold bg-transparent border-0 text-center focus:outline-none focus:ring-2 focus:ring-green-500 rounded"
                            min="0"
                            placeholder="0"
                          />
                        </div>

                        <div className={`border rounded p-2 ${
                          effectiveHave >= ingredient.quantity 
                            ? 'bg-green-100 border-green-300' 
                            : 'bg-purple-100 border-purple-300'
                        }`}>
                          <div className={`font-medium ${
                            effectiveHave >= ingredient.quantity ? 'text-green-700' : 'text-purple-700'
                          }`}>
                            TOTAL
                          </div>
                          <div className={`font-bold ${
                            effectiveHave >= ingredient.quantity ? 'text-green-800' : 'text-purple-800'
                          }`}>
                            {effectiveHave.toLocaleString()}
                          </div>
                        </div>

                        <div className="bg-blue-100 border border-blue-300 rounded p-2">
                          <div className="text-blue-700 font-medium">NEED</div>
                          <div className="text-blue-800 font-bold">{ingredient.quantity.toLocaleString()}</div>
                        </div>

                        <div className={`border rounded p-2 ${
                          missing > 0 
                            ? 'bg-red-100 border-red-300' 
                            : 'bg-green-100 border-green-300'
                        }`}>
                          <div className={`font-medium ${
                            missing > 0 ? 'text-red-700' : 'text-green-700'
                          }`}>
                            {missing > 0 ? 'MISS' : 'READY'}
                          </div>
                          <div className={`font-bold ${
                            missing > 0 ? 'text-red-800' : 'text-green-800'
                          }`}>
                            {missing > 0 ? missing.toLocaleString() : '✓'}
                          </div>
                        </div>
                      </div>

                      {/* Effective Inventory Note */}
                      {effectiveHave > currentHave && (
                        <div className="mt-2 text-xs text-purple-600 bg-purple-50 rounded px-2 py-1">
                          +{(effectiveHave - currentHave).toLocaleString()} from higher-tier items
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Progress indicator */}
            {index < steps.length - 1 && (
              <div className="flex justify-center mt-4">
                <div className="w-px h-6 bg-blue-300"></div>
                <div className="absolute bg-blue-600 rounded-full w-2 h-2 mt-2"></div>
              </div>
            )}
          </div>
          );
        })}
      </div>

      {/* Completion Message */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
        <div className="text-green-800 font-bold">🎉 Build Complete!</div>
        <div className="text-green-600 text-sm mt-1">
          After completing all {steps.length} steps, you'll have your items ready
        </div>
      </div>
    </div>
  );
};

export default BuildSteps; 