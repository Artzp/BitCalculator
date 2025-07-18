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
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 max-w-md mx-auto">
          <div className="text-5xl mb-4">✅</div>
          <h3 className="font-bold text-xl text-emerald-300 mb-2">All Set!</h3>
          <p className="text-emerald-200/80 text-sm">
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
        <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{totalMaterialTypes}</div>
            <div className="text-xs text-slate-400">Material Types</div>
          </div>
        </div>
        <div className="bg-slate-700/30 rounded-xl p-4 border border-slate-600/50">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">{totalMissingItems.toLocaleString()}</div>
            <div className="text-xs text-slate-400">Items Needed</div>
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
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-300',
      accent: 'text-emerald-400'
    },
    amber: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-300',
      accent: 'text-amber-400'
    }
  };

  const scheme = colors[colorScheme];

  return (
    <div className={`${scheme.bg} ${scheme.border} border rounded-xl p-4`}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-slate-600/50 rounded-lg flex items-center justify-center">
          <span className="text-lg">{icon}</span>
        </div>
        <div>
          <h3 className={`text-lg font-bold ${scheme.text}`}>{title}</h3>
          <p className="text-xs text-slate-400">{materials.length} different materials</p>
        </div>
      </div>

      <div className="space-y-2">
        {materials.map((material) => {
          const item = items[material.itemId];
          const completionPercentage = material.have / (material.have + material.missing) * 100;
          
          return (
            <div key={material.itemId} className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30">
              <div className="flex items-center justify-between mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white truncate">{material.itemName}</h4>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Tier {item?.tier || '?'}</span>
                    {material.have > 0 && (
                      <span className="text-blue-400">
                        {Math.round(completionPercentage)}% ready
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-bold ${scheme.accent}`}>
                    {material.missing.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400">needed</div>
                </div>
              </div>

              {/* Progress Bar */}
              {material.have > 0 && (
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Progress</span>
                    <span>{material.have.toLocaleString()} / {(material.have + material.missing).toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        colorScheme === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'
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