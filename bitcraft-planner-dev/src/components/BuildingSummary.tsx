import React, { useState } from 'react';
import {
  getAllBuildingTypes,
  getBuildingsByCategory,
  getBuildingRecipeCount,
  getBuildingUniqueItemCount,
  getBuildingCategory,
  BUILDING_CATEGORIES
} from '../utils/buildingTypes';
import BuildingRequirement from './BuildingRequirement';

const BuildingSummary: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const buildingsByCategory = getBuildingsByCategory();
  const allBuildings = getAllBuildingTypes();

  const totalRecipes = allBuildings.reduce((sum, building) => sum + getBuildingRecipeCount(building), 0);
  const totalUniqueItems = allBuildings.reduce((sum, building) => sum + getBuildingUniqueItemCount(building), 0);

  const categoryStats = Object.entries(buildingsByCategory).map(([category, buildings]) => {
    const categoryRecipes = buildings.reduce((sum, building) => sum + getBuildingRecipeCount(building), 0);
    const categoryItems = buildings.reduce((sum, building) => sum + getBuildingUniqueItemCount(building), 0);
    return {
      category,
      buildings: buildings.length,
      recipes: categoryRecipes,
      items: categoryItems,
      buildingList: buildings
    };
  });

  const filteredBuildings = selectedCategory 
    ? buildingsByCategory[selectedCategory] || []
    : allBuildings;

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-bold text-blue-800 mb-2">🏗️ Building Overview</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-800">{allBuildings.length}</div>
            <div className="text-sm text-blue-600">Building Types</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-800">{totalRecipes.toLocaleString()}</div>
            <div className="text-sm text-blue-600">Total Recipes</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-800">{totalUniqueItems.toLocaleString()}</div>
            <div className="text-sm text-blue-600">Unique Items</div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-700">Filter by Category:</span>
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${
              selectedCategory === null
                ? 'bg-blue-100 text-blue-700 border-blue-200'
                : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
            }`}
          >
            All ({allBuildings.length})
          </button>
          {categoryStats.map(({ category, buildings }) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1 rounded text-sm font-medium border transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-100 text-blue-700 border-blue-200'
                  : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'
              }`}
            >
              {category} ({buildings})
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            {showDetails ? '🔼 Hide Details' : '🔽 Show Details'}
          </button>
        </div>
      </div>

      {/* Category Stats (when category is selected) */}
      {selectedCategory && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <h4 className="font-semibold text-green-800 mb-2">{selectedCategory} Category</h4>
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <div className="font-bold text-green-800">
                {buildingsByCategory[selectedCategory]?.length || 0}
              </div>
              <div className="text-green-600">Buildings</div>
            </div>
            <div>
              <div className="font-bold text-green-800">
                {categoryStats.find(s => s.category === selectedCategory)?.recipes.toLocaleString() || 0}
              </div>
              <div className="text-green-600">Recipes</div>
            </div>
            <div>
              <div className="font-bold text-green-800">
                {categoryStats.find(s => s.category === selectedCategory)?.items.toLocaleString() || 0}
              </div>
              <div className="text-green-600">Items</div>
            </div>
          </div>
        </div>
      )}

      {/* Buildings List */}
      <div className="space-y-2">
        <h4 className="font-semibold text-gray-800">
          {selectedCategory ? `${selectedCategory} Buildings` : 'All Buildings'} 
          <span className="text-gray-500 font-normal ml-1">({filteredBuildings.length})</span>
        </h4>
        
        <div className="space-y-1 max-h-96 overflow-y-auto">
          {filteredBuildings
            .sort((a, b) => getBuildingRecipeCount(b) - getBuildingRecipeCount(a))
            .map((building) => (
              <div
                key={building}
                className="bg-white border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <BuildingRequirement
                    buildingName={building}
                    showDetails={showDetails}
                  />
                  <div className="flex gap-3 text-sm">
                    <div className="text-center">
                      <div className="font-bold text-blue-600">{getBuildingRecipeCount(building)}</div>
                      <div className="text-xs text-gray-500">recipes</div>
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-green-600">{getBuildingUniqueItemCount(building)}</div>
                      <div className="text-xs text-gray-500">items</div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default BuildingSummary; 