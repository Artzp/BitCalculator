import React, { useMemo, useState } from 'react';
import { useItemsStore } from '../state/useItemsStore';
import VisualRecipeTree from './VisualRecipeTree';

const BuildSteps: React.FC = () => {
  const { buildList, getSmartBuildSteps } = useItemsStore();
  const [showVisualTree, setShowVisualTree] = useState(false);

  // Use the new smart build steps that consider inventory at each level
  const smartSteps = useMemo(() => {
    return getSmartBuildSteps();
  }, [getSmartBuildSteps]);

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
      {/* Header with Visual Tree Button */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-white">
          Smart Build Steps ({smartSteps.length})
        </h3>
        <button
          onClick={() => setShowVisualTree(true)}
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012 2v2M7 7h10" />
          </svg>
          Visual Tree
        </button>
      </div>

      {smartSteps.length === 0 ? (
        <div className="text-center py-8 text-green-400">
          <div className="text-4xl mb-3">✅</div>
          <p className="font-semibold text-lg">All materials ready!</p>
          <p className="text-sm mt-1">You have everything needed in your inventory</p>
        </div>
      ) : (
        <div className="space-y-4">
          {smartSteps.map((step, index) => (
            <div key={`${step.itemId}-${index}`} className={`bg-slate-700/50 backdrop-blur-sm rounded-lg border transition-all duration-200 hover:bg-slate-700/70 ${
              step.isBaseItem 
                ? 'border-emerald-500/30 bg-emerald-900/10' 
                : 'border-amber-500/30 bg-amber-900/10'
            }`}>
              <div className="p-4">
                {/* Header Row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <h3 className="font-semibold text-white text-lg truncate">{step.itemName}</h3>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      step.isBaseItem 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    }`}>
                      {step.isBaseItem ? '🌿 Gather' : '🔨 Craft'}
                    </span>
                  </div>
                  <div className="flex-shrink-0 ml-3 text-right">
                    <div className="text-slate-400 text-xs">Tier {step.tier}</div>
                  </div>
                </div>

                {/* Action Summary */}
                <div className="mb-4 p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">
                      {step.isBaseItem ? 'Need to gather:' : 'Need to craft:'}
                    </span>
                    <span className="font-bold text-white text-lg">
                      {step.needToCraft.toLocaleString()}
                    </span>
                  </div>
                  {step.haveInInventory > 0 && (
                    <div className="flex items-center justify-between mt-1 text-sm">
                      <span className="text-slate-400">Already have:</span>
                      <span className="text-blue-300">{step.haveInInventory.toLocaleString()}</span>
                    </div>
                  )}
                </div>

                {/* Ingredients (for craftable items) */}
                {!step.isBaseItem && step.ingredients.length > 0 && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium text-slate-300 mb-2">Required per craft:</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {step.ingredients.map((ingredient, idx) => (
                        <div key={idx} className="flex items-center justify-between p-2 bg-slate-800/30 rounded">
                          <span className="text-slate-300 text-sm">{ingredient.itemName}</span>
                          <div className="text-right">
                            <span className="text-white font-medium">{ingredient.quantityPerCraft}x</span>
                            <span className="text-slate-400 text-xs ml-2">
                              (total: {ingredient.totalNeeded})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Progress indicator */}
                <div className="mt-4 pt-3 border-t border-slate-600/30">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Step {index + 1} of {smartSteps.length}</span>
                    <span>{step.isBaseItem ? 'Gather from world' : 'Craft at station'}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Visual Recipe Tree Modal */}
      <VisualRecipeTree 
        isOpen={showVisualTree}
        onClose={() => setShowVisualTree(false)}
      />
    </>
  );
};

export default BuildSteps;