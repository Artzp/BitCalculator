import React, { useState, useMemo } from 'react';
import { useItemsStore } from '../state/useItemsStore';
import { calculateMaterials, MaterialRequirement } from '../utils/calculator';
import { RARITY_COLORS, RARITY_NAMES } from '../utils/constants';

const Calculator: React.FC = () => {
  const { getSelectedItem, selectedItemId, items } = useItemsStore();
  const selectedItem = getSelectedItem();
  const [quantity, setQuantity] = useState<number>(1);
  const [selectedRecipeIndex, setSelectedRecipeIndex] = useState<number>(0);

  const calculation = useMemo(() => {
    if (!selectedItem || !selectedItemId) return null;
    return calculateMaterials(items, selectedItemId, quantity, selectedRecipeIndex);
  }, [items, selectedItemId, selectedItem, quantity, selectedRecipeIndex]);

  if (!selectedItem || !selectedItemId) {
    return (
      <div className="text-center py-16">
        <div className="bg-slate-100 rounded-xl p-8 border-2 border-slate-200">
          <div className="text-xl font-medium text-slate-600">Select an item to use the calculator</div>
        </div>
      </div>
    );
  }

  if (!selectedItem.recipes || selectedItem.recipes.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="bg-slate-100 rounded-xl p-8 border-2 border-slate-200">
          <div className="text-xl font-medium text-slate-600">This item cannot be crafted (base item)</div>
        </div>
      </div>
    );
  }

  const selectedRecipe = selectedItem.recipes[selectedRecipeIndex];

  const MaterialsList: React.FC<{ 
    materials: MaterialRequirement[], 
    title: string,
    emptyMessage: string,
    bgColor?: string,
    titleColor?: string
  }> = ({ materials, title, emptyMessage, bgColor = "bg-slate-50", titleColor = "text-slate-800" }) => (
    <div className={`${bgColor} rounded-xl p-6 border-2 border-slate-200 shadow-sm`}>
      <h4 className={`text-2xl font-bold mb-5 ${titleColor} border-b border-slate-200 pb-3`}>{title}</h4>
      {materials.length > 0 ? (
        <div className="space-y-3">
          {materials.map((material) => (
            <div key={material.itemId} className="flex justify-between items-center py-4 px-5 bg-white rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200">
              <div className="flex-1">
                <span className="text-slate-800 font-bold text-lg block mb-2">{material.itemName}</span>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-slate-600 font-medium bg-slate-100 px-3 py-1 rounded-full">
                    Tier {material.tier >= 0 ? material.tier : 'Base'}
                  </span>
                  <span className={`font-semibold px-3 py-1 rounded-full ${RARITY_COLORS[material.rarity as keyof typeof RARITY_COLORS]} bg-slate-100`}>
                    {RARITY_NAMES[material.rarity as keyof typeof RARITY_NAMES]}
                  </span>
                </div>
              </div>
              <div className="text-right ml-4">
                <div className="text-slate-800 font-bold text-2xl bg-blue-100 text-blue-800 px-4 py-2 rounded-lg shadow-sm">
                  {material.quantity.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="bg-white rounded-lg p-6 border border-slate-200">
            <div className="text-lg font-medium text-slate-600">{emptyMessage}</div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Calculator Controls */}
      <div className="bg-slate-50 rounded-xl p-6 border-2 border-slate-200 shadow-sm">
        <h3 className="text-3xl font-bold text-blue-600 mb-6 border-b border-slate-200 pb-3">Material Calculator</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-lg font-bold text-slate-700 mb-3">
              Quantity to Make
            </label>
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-lg text-slate-800 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            />
          </div>
          
          {selectedItem.recipes.length > 1 && (
            <div>
              <label className="block text-lg font-bold text-slate-700 mb-3">
                Recipe
              </label>
              <select
                value={selectedRecipeIndex}
                onChange={(e) => setSelectedRecipeIndex(parseInt(e.target.value))}
                className="w-full px-4 py-3 bg-white border-2 border-slate-300 rounded-lg text-slate-800 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              >
                {selectedItem.recipes.map((recipe, index) => {
                  const skillText = recipe.skill_requirement 
                    ? `${recipe.skill_requirement.skill_name} ${recipe.skill_requirement.skill_level}`
                    : 'No skill required';
                  return (
                    <option key={index} value={index}>
                      Recipe {index + 1} ({skillText}, Produces {recipe.output_quantity})
                    </option>
                  );
                })}
              </select>
            </div>
          )}
        </div>
        
        {/* Recipe Requirements Display */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Skill Requirement */}
          {selectedRecipe.skill_requirement && (
            <div className="p-4 bg-blue-100 rounded-lg border-2 border-blue-200 shadow-sm">
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl">⭐</span>
                <span className="text-lg text-blue-800 font-bold">
                  Required Skill: {selectedRecipe.skill_requirement.skill_name} {selectedRecipe.skill_requirement.skill_level}
                </span>
              </div>
            </div>
          )}
          
          {/* Building Requirement */}
          {selectedRecipe.building_requirement && (
            <div className="p-4 bg-purple-100 rounded-lg border-2 border-purple-200 shadow-sm">
              <div className="flex items-center justify-center gap-3">
                <span className="text-2xl">🏭</span>
                <span className="text-lg text-purple-800 font-bold">
                  Required Building: {selectedRecipe.building_requirement}
                </span>
              </div>
            </div>
          )}
        </div>
        
        {calculation && (
          <div className="mt-6 p-5 bg-green-100 rounded-lg border-2 border-green-200 shadow-sm">
            <div className="text-center">
              <span className="text-xl text-green-800 font-medium">
                To make <span className="font-bold text-green-900 text-2xl">{quantity.toLocaleString()}</span> {' '}
                <span className="font-bold text-green-900 text-xl">{calculation.targetItem}</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Materials Lists */}
      {calculation && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <MaterialsList
            materials={calculation.baseMaterials}
            title="📦 Base Materials Needed"
            emptyMessage="No base materials required"
            bgColor="bg-green-50"
            titleColor="text-green-800"
          />
          
          <MaterialsList
            materials={calculation.intermediateMaterials}
            title="⚙️ Intermediate Items Needed"
            emptyMessage="No intermediate items required"
            bgColor="bg-orange-50"
            titleColor="text-orange-800"
          />
        </div>
      )}
    </div>
  );
};

export default Calculator; 