import React, { useState } from 'react';
import { useItemsStore } from '../state/useItemsStore';
import { RARITY_COLORS, RARITY_NAMES } from '../utils/constants';

const BuildList: React.FC = () => {
  const { 
    buildList, 
    items, 
    removeFromBuildList, 
    updateBuildListItem, 
    clearBuildList 
  } = useItemsStore();

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const handleQuantityChange = (itemId: string, newQuantity: number, recipeIndex: number) => {
    if (newQuantity <= 0) {
      removeFromBuildList(itemId);
    } else {
      updateBuildListItem(itemId, newQuantity, recipeIndex);
    }
  };

  if (buildList.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="text-xl mb-2">📋</div>
          <div className="text-sm font-medium text-slate-600 mb-1">No items in build list</div>
          <div className="text-xs text-slate-500">
            Select items from the left panel to add them
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 overflow-auto">
      {/* Clear All Button - Compact */}
      <div className="flex justify-end mb-2">
        <button
          onClick={clearBuildList}
          className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded font-medium transition-colors"
        >
          Clear All
        </button>
      </div>

      {/* Build Items - Compact */}
      {buildList.map((buildItem) => {
        const item = items[buildItem.itemId];
        if (!item) return null;

        const isExpanded = expandedItems.has(buildItem.itemId);
        const recipe = item.recipes?.[buildItem.recipeIndex];

        return (
          <div
            key={buildItem.itemId}
            className="bg-slate-50 rounded-lg border border-slate-200 p-2"
          >
            {/* Item Header - Compact */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-800 text-sm">{item.name}</h3>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${RARITY_COLORS[item.rarity as keyof typeof RARITY_COLORS] || 'text-gray-400'} bg-slate-100`}>
                  {(RARITY_NAMES[item.rarity as keyof typeof RARITY_NAMES] || 'Unknown').charAt(0)}
                </span>
              </div>
              <button
                onClick={() => removeFromBuildList(buildItem.itemId)}
                className="text-red-600 hover:text-red-800 font-bold text-xs px-1.5 py-0.5 rounded hover:bg-red-100 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Quantity Controls - Compact */}
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Qty</label>
                <input
                  type="number"
                  min="1"
                  value={buildItem.quantity}
                  onChange={(e) => handleQuantityChange(
                    buildItem.itemId, 
                    Math.max(1, parseInt(e.target.value) || 1),
                    buildItem.recipeIndex
                  )}
                  className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {item.recipes && item.recipes.length > 1 && (
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Recipe</label>
                  <select
                    value={buildItem.recipeIndex}
                    onChange={(e) => handleQuantityChange(
                      buildItem.itemId,
                      buildItem.quantity,
                      parseInt(e.target.value)
                    )}
                    className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {item.recipes.map((recipe, index) => {
                      const skillText = recipe.skill_requirement 
                        ? `${recipe.skill_requirement.skill_name} ${recipe.skill_requirement.skill_level}`
                        : 'No skill';
                      return (
                        <option key={index} value={index}>
                          Recipe {index + 1} ({skillText})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}
            </div>

            {/* Recipe Info - Compact */}
            {recipe && (
              <div className="text-xs text-slate-600 bg-white rounded px-2 py-1 border border-slate-200">
                <div className="flex justify-between items-center">
                  <span>Makes {recipe.output_quantity}</span>
                  <span>Crafts: {Math.ceil(buildItem.quantity / recipe.output_quantity)}</span>
                </div>
                {recipe.skill_requirement && (
                  <div className="mt-1 text-blue-600 font-medium">
                    Req: {recipe.skill_requirement.skill_name} {recipe.skill_requirement.skill_level}
                  </div>
                )}
              </div>
            )}

            {/* Toggle Details - Compact */}
            {recipe && recipe.consumed_items.length > 0 && (
              <button
                onClick={() => toggleExpanded(buildItem.itemId)}
                className="w-full mt-2 text-xs text-blue-600 hover:text-blue-800 font-medium py-1 border-t border-slate-200 transition-colors"
              >
                {isExpanded ? '▲ Hide' : '▼ Show'} Ingredients
              </button>
            )}

            {/* Expanded Recipe Details - Compact */}
            {isExpanded && recipe && (
              <div className="mt-2 pt-2 border-t border-slate-200">
                <div className="text-xs font-medium text-slate-700 mb-1">Ingredients:</div>
                <div className="space-y-1">
                  {recipe.consumed_items.map((ingredient) => {
                    const ingredientItem = items[ingredient.id.toString()];
                    const craftsNeeded = Math.ceil(buildItem.quantity / recipe.output_quantity);
                    const totalNeeded = craftsNeeded * ingredient.quantity;
                    
                    return (
                      <div
                        key={ingredient.id}
                        className="flex justify-between items-center bg-white px-2 py-1 rounded border border-slate-200 text-xs"
                      >
                        <span className="font-medium truncate">
                          {ingredientItem?.name || `Item ${ingredient.id}`}
                        </span>
                        <span className="text-slate-600 flex-shrink-0">
                          {totalNeeded.toLocaleString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default BuildList; 