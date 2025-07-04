import React from 'react';
import { useItemsStore } from '../state/useItemsStore';
import { RARITY_COLORS, RARITY_NAMES } from '../utils/constants';
import { correctBuildingRequirement, getBuildingCorrectionInfo } from '../utils/buildingCorrections';

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
  buildingCorrectionInfo?: {
    wasCorrected: boolean;
    originalBuilding: string | null;
  };
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
        buildingRequirement: correctBuildingRequirement(item.name, recipe.building_requirement),
        buildingCorrectionInfo: getBuildingCorrectionInfo(item.name, recipe.building_requirement)
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
      <div className="text-center py-6">
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="text-xl mb-2">📋</div>
          <div className="text-sm font-medium text-slate-600 mb-1">No crafting steps</div>
          <div className="text-xs text-slate-500">
            Add items to your build list to see crafting steps
          </div>
        </div>
      </div>
    );
  }

  if (steps.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="text-xl mb-2">🏗️</div>
          <div className="text-sm font-medium text-slate-600 mb-1">No crafting needed</div>
          <div className="text-xs text-slate-500">
            All items in your build list are base materials
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 overflow-auto">
      {/* Header - Compact */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
        <div className="text-lg font-bold text-blue-800">{steps.length}</div>
        <div className="text-xs text-blue-600 font-medium">Crafting Steps</div>
      </div>

      {/* Steps - Compact */}
      <div className="space-y-2">
        {steps.map((step, index) => {
          const stepCanComplete = canCompleteStep(step);
          
          return (
            <details
              key={`${step.itemId}-${step.stepNumber}`}
              className={`rounded-lg border transition-all ${
                stepCanComplete 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-white border-slate-200'
              }`}
            >
              <summary className="p-2 cursor-pointer hover:bg-slate-50 rounded-lg list-none">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`rounded-full w-6 h-6 flex items-center justify-center font-bold text-xs ${
                      stepCanComplete 
                        ? 'bg-green-600 text-white' 
                        : 'bg-blue-600 text-white'
                    }`}>
                      {stepCanComplete ? '✓' : step.stepNumber}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 text-sm">{step.itemName}</div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-xs font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          T{step.tier >= 0 ? step.tier : 'B'}
                        </span>
                        <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${RARITY_COLORS[step.rarity as keyof typeof RARITY_COLORS] || 'text-gray-400'} bg-slate-100`}>
                          {(RARITY_NAMES[step.rarity as keyof typeof RARITY_NAMES] || 'Unknown').charAt(0)}
                        </span>
                        {step.buildingRequirement && (
                          <span className="text-xs font-medium text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
                            🏗️ {step.buildingRequirement}
                          </span>
                        )}
                        {step.skillRequirement && (
                          <span className="text-xs font-medium text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
                            🎯 {step.skillRequirement}
                          </span>
                        )}
                        {stepCanComplete && (
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-green-100 text-green-800">
                            Ready
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-800">{step.quantity}</div>
                    <div className="text-xs text-slate-600">needed</div>
                    <div className="text-xs text-slate-500">
                      {Math.ceil(step.quantity / step.outputQuantity)} crafts
                    </div>
                  </div>
                </div>
              </summary>

              <div className="p-2 pt-0">
                {/* Crafting Info - Prominent Building/Skill Requirements */}
                <div className="bg-slate-50 rounded p-2 mb-2">
                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div>
                      <span className="font-medium text-slate-700">Crafts:</span>
                      <span className="ml-1 text-slate-800">{Math.ceil(step.quantity / step.outputQuantity)}</span>
                    </div>
                    <div>
                      <span className="font-medium text-slate-700">Per craft:</span>
                      <span className="ml-1 text-slate-800">{step.outputQuantity}</span>
                    </div>
                  </div>
                  
                  {/* Requirements - More Prominent */}
                  <div className="space-y-1">
                    {step.buildingRequirement && (
                      <div className="space-y-1">
                        <div className="text-xs text-purple-700 bg-purple-100 px-2 py-1 rounded font-medium border border-purple-200">
                          🏗️ Building Required: {step.buildingRequirement}
                        </div>
                        {step.buildingCorrectionInfo?.wasCorrected && (
                          <div className="text-xs text-orange-700 bg-orange-100 px-2 py-1 rounded font-medium border border-orange-200">
                            ⚠️ Auto-corrected from: {step.buildingCorrectionInfo.originalBuilding}
                          </div>
                        )}
                      </div>
                    )}
                    {step.skillRequirement && (
                      <div className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded font-medium border border-blue-200">
                        🎯 Skill Required: {step.skillRequirement}
                      </div>
                    )}
                    {!step.buildingRequirement && !step.skillRequirement && (
                      <div className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded font-medium border border-green-200">
                        ✋ No special requirements - craft anywhere
                      </div>
                    )}
                  </div>
                </div>

                {/* Ingredients - Compact */}
                <div>
                  <h4 className="font-medium text-slate-700 mb-1 text-xs">Materials:</h4>
                  <div className="space-y-1">
                    {step.ingredients.map((ingredient) => {
                      const currentHave = inventory[ingredient.id] || 0;
                      const effectiveHave = getEffectiveInventoryQuantity(ingredient.id);
                      const hasEnough = effectiveHave >= ingredient.quantity;
                      const missing = Math.max(0, ingredient.quantity - effectiveHave);
                      
                      return (
                        <div
                          key={ingredient.id}
                          className={`rounded p-2 border text-xs ${
                            hasEnough 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-red-50 border-red-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div>
                                <div className="font-medium text-slate-800">{ingredient.name}</div>
                                <div className="flex items-center gap-1">
                                  <span className="text-xs bg-slate-200 px-1 py-0.5 rounded">
                                    T{ingredient.tier >= 0 ? ingredient.tier : 'B'}
                                  </span>
                                  <span className={`text-xs px-1 py-0.5 rounded ${RARITY_COLORS[ingredient.rarity as keyof typeof RARITY_COLORS] || 'text-gray-400'} bg-slate-200`}>
                                    {(RARITY_NAMES[ingredient.rarity as keyof typeof RARITY_NAMES] || 'Unknown').charAt(0)}
                                  </span>
                                </div>
                              </div>
                              {hasEnough && <span className="text-green-600 font-bold">✓</span>}
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-slate-800">
                                {ingredient.quantity.toLocaleString()}
                              </div>
                              <div className="text-xs text-slate-600">needed</div>
                            </div>
                          </div>

                          {/* Compact inventory grid */}
                          <div className="grid grid-cols-4 gap-1 text-xs">
                            <div className="bg-green-100 border border-green-200 rounded p-1 text-center">
                              <div className="text-green-700 font-medium">HAVE</div>
                              <input
                                type="number"
                                value={currentHave}
                                onChange={(e) => handleInventoryChange(ingredient.id, e.target.value)}
                                className="w-full text-green-800 font-bold bg-transparent border-0 text-center focus:outline-none focus:ring-1 focus:ring-green-500 rounded text-xs"
                                min="0"
                                placeholder="0"
                              />
                            </div>

                            <div className={`border rounded p-1 text-center ${
                              effectiveHave >= ingredient.quantity 
                                ? 'bg-green-100 border-green-200' 
                                : 'bg-purple-100 border-purple-200'
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

                            <div className="bg-blue-100 border border-blue-200 rounded p-1 text-center">
                              <div className="text-blue-700 font-medium">NEED</div>
                              <div className="text-blue-800 font-bold">{ingredient.quantity.toLocaleString()}</div>
                            </div>

                            <div className={`border rounded p-1 text-center ${
                              missing > 0 
                                ? 'bg-red-100 border-red-200' 
                                : 'bg-green-100 border-green-200'
                            }`}>
                              <div className={`font-medium ${
                                missing > 0 ? 'text-red-700' : 'text-green-700'
                              }`}>
                                {missing > 0 ? 'MISS' : 'OK'}
                              </div>
                              <div className={`font-bold ${
                                missing > 0 ? 'text-red-800' : 'text-green-800'
                              }`}>
                                {missing > 0 ? missing.toLocaleString() : '✓'}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </details>
          );
        })}
      </div>

      {/* Completion Message - Compact */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-center">
        <div className="text-green-800 font-semibold text-sm">🎉 Build Complete!</div>
        <div className="text-green-600 text-xs mt-1">
          Complete all {steps.length} steps to finish your build
        </div>
      </div>
      
      {/* Data Correction Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
        <div className="text-blue-800 font-medium text-xs">
          📝 Some building requirements have been auto-corrected for accuracy
        </div>
        <div className="text-blue-600 text-xs mt-1">
          Orange warnings show where data was fixed (e.g., molten metals moved from Fishing Station to Smithing Station)
        </div>
      </div>
    </div>
  );
};

export default BuildSteps; 