import React from 'react';
import { useItemsStore } from '../state/useItemsStore';
import { RARITY_COLORS, RARITY_NAMES } from '../utils/constants';
import RecipeTree from './RecipeTree';
import ShoppingList from './ShoppingList';

const ItemDetail: React.FC = () => {
  const { getSelectedItem, selectedItemId } = useItemsStore();
  const selectedItem = getSelectedItem();

  if (!selectedItem || !selectedItemId) {
    return (
      <div className="text-center py-16">
        <div className="bg-slate-100 rounded-xl p-8 border-2 border-slate-200">
          <div className="text-xl font-medium text-slate-600">No item selected</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Item Header */}
      <div className="bg-slate-50 rounded-xl p-6 border-2 border-slate-200 shadow-sm">
        <h3 className="text-3xl font-bold text-blue-600 mb-4 border-b border-slate-200 pb-3">{selectedItem.name}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
            <span className="text-slate-500 font-medium text-sm block mb-1">Tier</span>
            <span className="text-slate-800 font-bold text-lg">
              {selectedItem.tier >= 0 ? selectedItem.tier : 'Base'}
            </span>
          </div>
          <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
            <span className="text-slate-500 font-medium text-sm block mb-1">Rarity</span>
            <span className={`font-bold text-lg ${RARITY_COLORS[selectedItem.rarity as keyof typeof RARITY_COLORS]}`}>
              {RARITY_NAMES[selectedItem.rarity as keyof typeof RARITY_NAMES]}
            </span>
          </div>
          {selectedItem.extraction_skill >= 0 && (
            <div className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm">
              <span className="text-slate-500 font-medium text-sm block mb-1">Extraction Skill</span>
              <span className="text-slate-800 font-bold text-lg">{selectedItem.extraction_skill}</span>
            </div>
          )}
        </div>
      </div>

      {/* Recipe Information */}
      <div className="space-y-6">
        <h4 className="text-2xl font-bold mb-6 text-slate-800 border-b border-slate-200 pb-3">🌳 Recipe Tree</h4>
        {selectedItem.recipes.length > 0 ? (
          <div className="space-y-6">
            {selectedItem.recipes.map((recipe, index) => (
              <div key={index} className="bg-slate-50 rounded-xl p-6 border-2 border-slate-200 shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                  <div className="bg-blue-600 px-4 py-2 rounded-lg shadow-sm">
                    <span className="text-white font-bold text-lg">
                      Recipe {index + 1}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {recipe.skill_requirement && (
                      <div className="bg-blue-600 px-4 py-2 rounded-lg shadow-sm">
                        <span className="text-white font-medium">
                          ⭐ {recipe.skill_requirement.skill_name} {recipe.skill_requirement.skill_level}
                        </span>
                      </div>
                    )}
                    <div className="bg-amber-600 px-4 py-2 rounded-lg shadow-sm">
                      <span className="text-white font-medium">
                        Produces {recipe.output_quantity}
                      </span>
                    </div>
                    {recipe.building_requirement && (
                      <div className="bg-purple-600 px-4 py-2 rounded-lg shadow-sm">
                        <span className="text-white font-medium">
                          🏭 {recipe.building_requirement}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="bg-white rounded-lg p-4 border border-slate-200">
                    <RecipeTree itemId={selectedItemId} quantity={1} recipeIndex={index} />
                  </div>
                  <ShoppingList itemId={selectedItemId} quantity={1} recipeIndex={index} />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="bg-slate-100 rounded-xl p-8 border-2 border-slate-200">
              <div className="text-xl font-medium text-slate-600">This item has no crafting recipes</div>
              <div className="text-lg text-slate-500 mt-2">It can only be obtained through extraction, drops, or trading</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemDetail; 