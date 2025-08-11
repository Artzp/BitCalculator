import React, { useMemo } from 'react';
import { useItemsStore } from '../state/useItemsStore';
import { MaterialRequirement } from '../state/useItemsStore';

const MaterialSummary: React.FC = () => {
  const { getRequiredMaterials, buildList, inventory, items } = useItemsStore();

  const { rawMaterials, intermediateMaterials, allMaterials } = useMemo(() => {
    const allReqs = getRequiredMaterials();
    return {
      rawMaterials: allReqs.filter(m => m.isBaseItem && m.missing > 0),
      intermediateMaterials: allReqs.filter(m => !m.isBaseItem && m.missing > 0),
      allMaterials: allReqs
    };
  }, [buildList, inventory]);

  const totalMissingItems = rawMaterials.reduce((sum, m) => sum + m.missing, 0) + 
                           intermediateMaterials.reduce((sum, m) => sum + m.missing, 0);
  const totalMaterialTypes = rawMaterials.length + intermediateMaterials.length;

  if (rawMaterials.length === 0 && intermediateMaterials.length === 0 && buildList.length > 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-8 max-w-md mx-auto">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="font-bold text-xl text-emerald-700 dark:text-emerald-200 mb-2">All Set!</h3>
          <p className="text-emerald-700 dark:text-emerald-200/90 text-sm">
            You have all the materials needed in your inventory.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700/50">
          <div className="text-center">
            <div className="text-2xl font-bold">{totalMaterialTypes}</div>
            <div className="text-xs text-gray-600 dark:text-slate-400">Material Types</div>
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-slate-800/50 rounded-xl p-4 border border-gray-200 dark:border-slate-700/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-300">{totalMissingItems.toLocaleString()}</div>
            <div className="text-xs text-gray-600 dark:text-slate-400">Items Needed</div>
          </div>
        </div>
      </div>

      {/* Material Lists */}
      <div className="space-y-6">
        <MaterialSection
          title="Raw Materials to Gather"
          icon="🌿"
          materials={rawMaterials}
          items={items}
          colorScheme="emerald"
        />
        <MaterialSection
          title="Intermediate Components to Craft"
          icon="⚙️"
          materials={intermediateMaterials}
          items={items}
          colorScheme="amber"
        />
      </div>
    </div>
  );
};

// Enhanced Material Section Component
const MaterialSection = ({ title, icon, materials, items, colorScheme }: {
  title: string;
  icon: string;
  materials: MaterialRequirement[];
  items: any;
  colorScheme: 'emerald' | 'amber';
}) => {
  if (materials.length === 0) return null;

  const colors = {
    emerald: {
      bg: 'bg-emerald-50 dark:bg-emerald-900/20',
      border: 'border-emerald-200 dark:border-emerald-800/40',
      text: 'text-emerald-700 dark:text-emerald-200',
      accent: 'text-emerald-700 dark:text-emerald-300'
    },
    amber: {
      bg: 'bg-amber-50 dark:bg-amber-900/20',
      border: 'border-amber-200 dark:border-amber-800/40',
      text: 'text-amber-700 dark:text-amber-200',
      accent: 'text-amber-700 dark:text-amber-300'
    }
  };

  const scheme = colors[colorScheme];

  return (
    <div className={`${scheme.bg} ${scheme.border} border rounded-xl p-4`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-gray-100 dark:bg-slate-700/60 rounded-lg flex items-center justify-center">
          <span className="text-lg">{icon}</span>
        </div>
        <div>
          <h3 className={`text-lg font-bold ${scheme.text}`}>{title}</h3>
          <p className="text-xs text-gray-600 dark:text-slate-400">{materials.length} different materials</p>
        </div>
      </div>

      <div className="space-y-2">
        {materials.map((material) => {
          const item = items[material.itemId];
          const completionPercentage = material.have / (material.have + material.missing) * 100;
          
          return (
            <div key={material.itemId} className="bg-gray-50 dark:bg-slate-800/40 rounded-lg p-3 border border-gray-200 dark:border-slate-700/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold truncate">{material.itemName}</h4>
                  <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400">
                    <span>Tier {item?.tier || '?'}</span>
                    {material.have > 0 && (
                      <span className="text-blue-600 dark:text-blue-300">
                        {Math.round(completionPercentage)}% ready
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${scheme.accent}`}>
                    {material.missing.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-slate-400">needed</div>
                </div>
              </div>

              {/* Progress Bar */}
              {material.have > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-slate-400 mb-1">
                    <span>Progress</span>
                    <span>{material.have.toLocaleString()} / {(material.have + material.missing).toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-slate-700/50 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        colorScheme === 'emerald' ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-amber-600 dark:bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, completionPercentage)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MaterialSummary; 