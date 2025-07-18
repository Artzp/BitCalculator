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
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <span className="text-xl">🔧</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              Build Steps
            </h3>
            <p className="text-sm text-slate-400">
              {smartSteps.length > 0 
                ? `${smartSteps.length} steps to complete your build`
                : 'All materials ready!'
              }
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setShowVisualTree(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-lg hover:from-purple-600 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2 font-medium"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span className="hidden sm:inline">Visual Tree</span>
            <span className="sm:hidden">Tree</span>
          </button>
        </div>
      </div>

      {smartSteps.length === 0 ? (
        <div className="text-center py-12">
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 max-w-md mx-auto">
            <div className="text-5xl mb-4">✅</div>
            <h4 className="font-bold text-xl text-emerald-300 mb-2">All Set!</h4>
            <p className="text-emerald-200/80 text-sm">
              You have everything needed in your inventory to complete your build.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {smartSteps.map((step, index) => (
            <div key={`${step.itemId}-${index}`} className={`group relative overflow-hidden rounded-xl border transition-all duration-300 hover:shadow-lg ${
              step.isBaseItem 
                ? 'bg-gradient-to-r from-emerald-900/20 to-emerald-800/10 border-emerald-500/30 hover:border-emerald-400/50' 
                : 'bg-gradient-to-r from-amber-900/20 to-amber-800/10 border-amber-500/30 hover:border-amber-400/50'
            }`}>
              {/* Step Number Badge */}
              <div className={`absolute top-4 left-4 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                step.isBaseItem 
                  ? 'bg-emerald-500 text-white' 
                  : 'bg-amber-500 text-white'
              }`}>
                {index + 1}
              </div>

              <div className="p-6 pl-16">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-white text-lg truncate">{step.itemName}</h3>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        step.isBaseItem 
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}>
                        {step.isBaseItem ? '🌿 Gather' : '🔨 Craft'}
                      </span>
                    </div>
                    <p className="text-slate-400 text-sm">
                      {step.isBaseItem ? 'Collect from the world' : 'Craft at appropriate station'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="text-slate-400 text-xs">Tier {step.tier}</div>
                    <div className="text-slate-500 text-xs">
                      {index + 1}/{smartSteps.length}
                    </div>
                  </div>
                </div>

                {/* Main Action */}
                <div className={`p-4 rounded-lg mb-4 ${
                  step.isBaseItem 
                    ? 'bg-emerald-500/10 border border-emerald-500/20' 
                    : 'bg-amber-500/10 border border-amber-500/20'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${
                        step.isBaseItem ? 'bg-emerald-500/20' : 'bg-amber-500/20'
                      }`}>
                        <span className="text-lg">{step.isBaseItem ? '🌿' : '⚒️'}</span>
                      </div>
                      <div>
                        <div className="text-white font-medium">
                          {step.isBaseItem ? 'Gather' : 'Craft'}
                        </div>
                        <div className="text-slate-400 text-sm">
                          {step.isBaseItem ? 'from world' : 'at station'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        {step.needToCraft.toLocaleString()}
                      </div>
                      <div className="text-slate-400 text-xs">needed</div>
                    </div>
                  </div>
                  
                  {step.haveInInventory > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-600/30">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Already in inventory:</span>
                        <span className="text-blue-300 font-medium">
                          {step.haveInInventory.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ingredients (for craftable items) */}
                {!step.isBaseItem && step.ingredients.length > 0 && (
                  <div className="bg-slate-800/30 rounded-lg p-4">
                    <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                      <span>🧪</span>
                      Recipe Requirements
                    </h4>
                    <div className="grid gap-2">
                      {step.ingredients.map((ingredient, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg">
                          <span className="text-slate-200 font-medium">{ingredient.itemName}</span>
                          <div className="text-right">
                            <div className="text-white font-bold">
                              {ingredient.quantityPerCraft}x
                            </div>
                            <div className="text-slate-400 text-xs">
                              total: {ingredient.totalNeeded}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Hover Effect Overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
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