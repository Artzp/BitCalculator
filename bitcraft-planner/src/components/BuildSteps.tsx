import React, { useMemo, useState } from 'react';
import { useItemsStore } from '../state/useItemsStore';
import VisualRecipeTree from './VisualRecipeTree';

const BuildSteps: React.FC = () => {
  const { buildList, getAllPossibleMaterials, inventory } = useItemsStore();
  const [showVisualTree, setShowVisualTree] = useState(false);

  // Use the store's material calculation method instead of manual calculation
  const allMaterials = useMemo(() => {
    const materials = getAllPossibleMaterials();
    // Sort by completion status (incomplete first), then by tier, then by name
    return materials.sort((a, b) => {
      // First sort by completion (incomplete items first)
      const aComplete = a.missing === 0;
      const bComplete = b.missing === 0;
      if (aComplete !== bComplete) {
        return aComplete ? 1 : -1;
      }
      // Then sort base items last
      if (a.isBaseItem !== b.isBaseItem) {
        return a.isBaseItem ? 1 : -1;
      }
      // Then by tier
      if (a.tier !== b.tier) {
        return b.tier - a.tier;
      }
      // Finally by name
      return a.itemName.localeCompare(b.itemName);
    });
  }, [getAllPossibleMaterials, inventory]);

  if (buildList.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <div className="text-4xl mb-3">📋</div>
        <p className="font-semibold text-lg">Your build list is empty</p>
        <p className="text-sm mt-1">Add items from the catalog to get started</p>
      </div>
    );
  }

  return (
    <>
      {/* Visual Tree Button */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">
          Build Steps ({allMaterials.length})
        </h3>
        <button
          onClick={() => setShowVisualTree(true)}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          Visual Tree
        </button>
      </div>
      
      <div className="space-y-3">
        {allMaterials.map((material, index) => (
        <div key={`${material.itemId}-${index}`} className={`bg-slate-700/50 backdrop-blur-sm rounded-lg border transition-all duration-200 hover:bg-slate-700/70 ${
          material.missing === 0 
            ? 'border-green-500/50 bg-green-900/20' 
            : 'border-slate-600/30 hover:border-slate-500/50'
        }`}>
          <div className="p-4">
            {/* Header Row */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex-1 min-w-0 flex items-center gap-3">
                <h3 className="font-semibold text-white text-lg truncate">{material.itemName}</h3>
                {material.missing === 0 && (
                  <span className="text-green-400 text-xl">✓</span>
                )}
              </div>
              <div className="flex-shrink-0 ml-3">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  material.isBaseItem 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {material.isBaseItem ? 'Raw Material' : 'Intermediate'}
                </span>
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Required</div>
                <div className="text-white font-semibold text-lg">{material.quantity.toLocaleString()}</div>
              </div>
              <div className="text-center">
                <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Have</div>
                <div className="text-blue-300 font-semibold text-lg">{material.have.toLocaleString()}</div>
              </div>
              <div className="text-center">
                <div className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">Missing</div>
                <div className={`font-semibold text-lg ${
                  material.missing > 0 ? 'text-red-300' : 'text-green-300'
                }`}>
                  {material.missing > 0 ? material.missing.toLocaleString() : '✓'}
                </div>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-400">Progress</span>
                <span className="text-xs text-slate-400">
                  {material.quantity > 0 ? Math.round((material.have / material.quantity) * 100) : 0}%
                </span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    material.have >= material.quantity 
                      ? 'bg-gradient-to-r from-green-500 to-emerald-400' 
                      : 'bg-gradient-to-r from-blue-500 to-cyan-400'
                  }`}
                  style={{ 
                    width: `${material.quantity > 0 ? Math.min(100, (material.have / material.quantity) * 100) : 0}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        ))}
      </div>
      
      {/* Visual Recipe Tree Modal */}
      <VisualRecipeTree 
        isOpen={showVisualTree}
        onClose={() => setShowVisualTree(false)}
      />
    </>
  );
};

export default BuildSteps; 