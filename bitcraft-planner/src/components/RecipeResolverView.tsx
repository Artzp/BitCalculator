import React, { useState } from 'react';
import { useItemsStore } from '../state/useItemsStore';
import { resolveRecipeWithInventoryPruning } from '../utils/recipeResolver';
import { RecipeResolverResult, ResolverIngredient, MaterialSummary } from '../types/RecipeResolver';

interface RecipeResolverViewProps {
  targetItemId?: string;
  targetQuantity?: number;
  recipeIndex?: number;
}

const RecipeResolverView: React.FC<RecipeResolverViewProps> = ({
  targetItemId,
  targetQuantity = 1,
  recipeIndex = 0
}) => {
  const { items, inventory } = useItemsStore();
  const [viewMode, setViewMode] = useState<'tree' | 'table'>('tree');
  
  if (!targetItemId) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <div className="text-gray-500 text-sm">
          Select an item from your build list to see the detailed recipe resolution
        </div>
      </div>
    );
  }

  let resolverResult: RecipeResolverResult | null = null;
  let error: string | null = null;

  try {
    resolverResult = resolveRecipeWithInventoryPruning(items, inventory, {
      targetItemId,
      targetQuantity,
      recipeIndex
    });
  } catch (e) {
    error = e instanceof Error ? e.message : 'Unknown error occurred';
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-700 text-sm font-medium">Error resolving recipe:</div>
        <div className="text-red-600 text-sm mt-1">{error}</div>
      </div>
    );
  }

  if (!resolverResult) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <div className="text-gray-500 text-sm">Unable to resolve recipe</div>
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'already_available': return '✅';
      case 'needs_crafting': return '🔧';
      case 'missing': return '❌';
      case 'skipped_nested': return '⏭️';
      default: return '❓';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'already_available': return 'text-green-600 bg-green-50';
      case 'needs_crafting': return 'text-blue-600 bg-blue-50';
      case 'missing': return 'text-red-600 bg-red-50';
      case 'skipped_nested': return 'text-gray-600 bg-gray-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const renderIngredientTree = (ingredient: ResolverIngredient, depth: number = 0): React.ReactNode => {
    const indentation = depth * 20;
    const hasIngredients = ingredient.ingredients.length > 0;

    return (
      <div key={`${ingredient.itemId}-${depth}`} className="mb-2">
        <div 
          className="flex items-center space-x-2 py-2 px-3 rounded-lg border border-gray-200 bg-white"
          style={{ marginLeft: `${indentation}px` }}
        >
          <span className="text-lg">{getStatusIcon(ingredient.status)}</span>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <span className="font-medium text-gray-900 truncate">
                {ingredient.itemName}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(ingredient.status)}`}>
                {ingredient.status.replace('_', ' ')}
              </span>
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
              <span>Need: <span className="font-medium">{ingredient.needed}</span></span>
              <span>Have: <span className="font-medium">{ingredient.available}</span></span>
              {ingredient.craft && (
                <span className="text-blue-600 font-medium">Will Craft</span>
              )}
            </div>
          </div>
        </div>
        
        {hasIngredients && (
          <div className="mt-2">
            {ingredient.ingredients.map((subIngredient, index) => 
              renderIngredientTree(subIngredient, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  const renderFlatTable = (materials: MaterialSummary[]) => {
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Item
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Needed
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Inventory
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Craft
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {materials.map((material) => (
              <tr key={material.itemId} className="hover:bg-gray-50">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{getStatusIcon(material.status)}</span>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {material.itemName}
                      </div>
                      <div className="text-xs text-gray-500">
                        Tier {material.tier} • Rarity {material.rarity}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {material.needed}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                  {material.inventory}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm">
                  {material.craft ? (
                    <span className="text-blue-600 font-medium">✅ Yes</span>
                  ) : (
                    <span className="text-gray-500">❌ No</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(material.status)}`}>
                    {material.status.replace('_', ' ')}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-lg">
        <h3 className="text-lg font-bold mb-1">
          📘 Recipe Resolver with Inventory Pruning
        </h3>
        <div className="text-purple-100 text-sm">
          Analyzing: <span className="font-medium">{resolverResult.itemName}</span> × {resolverResult.needed}
        </div>
        <div className="flex items-center space-x-4 mt-2 text-sm">
          <div className="flex items-center space-x-1">
            <span>{getStatusIcon(resolverResult.status)}</span>
            <span className="text-purple-100">
              {resolverResult.status.replace('_', ' ')}
            </span>
          </div>
          <div className="text-purple-100">
            Have: <span className="font-medium">{resolverResult.available}</span>
          </div>
          {resolverResult.craft && (
            <div className="text-purple-100">
              <span className="font-medium">Will need crafting</span>
            </div>
          )}
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex bg-gray-100 rounded-lg p-1">
        <button
          onClick={() => setViewMode('tree')}
          className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all duration-200 ${
            viewMode === 'tree'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          🌳 Tree View
        </button>
        <button
          onClick={() => setViewMode('table')}
          className={`flex-1 py-2 px-4 rounded-md font-medium text-sm transition-all duration-200 ${
            viewMode === 'table'
              ? 'bg-white text-gray-800 shadow-sm'
              : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          📋 Flat Table
        </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {viewMode === 'tree' ? (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700 mb-3">
              Dependency Tree (with inventory pruning):
            </div>
            {renderIngredientTree(resolverResult)}
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700 mb-3">
              Materials Summary ({resolverResult.totalMaterialsFlat.length} items):
            </div>
            {renderFlatTable(resolverResult.totalMaterialsFlat)}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="text-xs font-medium text-gray-700 mb-2">Status Legend:</div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center space-x-1">
            <span>✅</span>
            <span>Already Available</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>🔧</span>
            <span>Needs Crafting</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>❌</span>
            <span>Missing (no recipe)</span>
          </div>
          <div className="flex items-center space-x-1">
            <span>⏭️</span>
            <span>Skipped (nested)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecipeResolverView; 