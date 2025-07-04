import React from 'react';
import { useItemsStore } from '../state/useItemsStore';
import { RARITY_COLORS, RARITY_NAMES } from '../utils/constants';

const MaterialSummary: React.FC = () => {
  const { 
    getRequiredMaterials, 
    buildList, 
    setInventoryItem
  } = useItemsStore();

  const materials = getRequiredMaterials();

  const handleInventoryChange = (itemId: string, value: string) => {
    const quantity = parseInt(value) || 0;
    setInventoryItem(itemId, quantity);
  };

  const exportToClipboard = () => {
    const missingMaterials = materials.filter(m => m.missing > 0);
    const exportText = missingMaterials
      .map(m => `${m.itemName}: ${m.missing.toLocaleString()}`)
      .join('\n');
    
    navigator.clipboard.writeText(exportText).then(() => {
      // Could add a toast notification here
      console.log('Shopping list copied to clipboard');
    });
  };

  if (buildList.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="text-xl mb-2">📋</div>
          <div className="text-sm font-medium text-slate-600 mb-1">No materials calculated</div>
          <div className="text-xs text-slate-500">
            Add items to your build list to see requirements
          </div>
        </div>
      </div>
    );
  }

  const missingMaterials = materials.filter(m => m.missing > 0);
  const completeMaterials = materials.filter(m => m.missing === 0);

  return (
    <div className="space-y-3 overflow-auto">
      {/* Summary Stats - Compact */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-blue-50 border border-blue-200 rounded p-2 text-center">
          <div className="text-lg font-bold text-blue-800">{materials.length}</div>
          <div className="text-xs text-blue-600 font-medium">Total</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded p-2 text-center">
          <div className="text-lg font-bold text-red-800">{missingMaterials.length}</div>
          <div className="text-xs text-red-600 font-medium">Missing</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded p-2 text-center">
          <div className="text-lg font-bold text-green-800">{completeMaterials.length}</div>
          <div className="text-xs text-green-600 font-medium">Ready</div>
        </div>
      </div>

      {/* Export Button - Compact */}
      {missingMaterials.length > 0 && (
        <button
          onClick={exportToClipboard}
          className="w-full bg-green-100 hover:bg-green-200 text-green-800 px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-green-300"
        >
          📋 Copy Shopping List ({missingMaterials.length})
        </button>
      )}

      {/* Missing Materials First - Compact */}
      {missingMaterials.length > 0 && (
        <div>
          <h4 className="font-semibold text-red-800 mb-2 text-sm border-b border-red-200 pb-1">
            ❌ Missing ({missingMaterials.length})
          </h4>
          <div className="space-y-1">
            {missingMaterials.map((material) => (
              <MaterialItem
                key={material.itemId}
                material={material}
                onInventoryChange={handleInventoryChange}
              />
            ))}
          </div>
        </div>
      )}

      {/* Complete Materials - Collapsible */}
      {completeMaterials.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer font-semibold text-green-800 text-sm border-b border-green-200 pb-1 hover:text-green-900 list-none">
            <span className="flex items-center gap-2">
              <span className="transition-transform group-open:rotate-90">▶</span>
              ✅ Ready ({completeMaterials.length})
            </span>
          </summary>
          <div className="space-y-1 mt-2">
            {completeMaterials.map((material) => (
              <MaterialItem
                key={material.itemId}
                material={material}
                onInventoryChange={handleInventoryChange}
              />
            ))}
          </div>
        </details>
      )}

      {/* All Materials Section - Collapsible */}
      {materials.length > 0 && missingMaterials.length > 0 && completeMaterials.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer font-semibold text-slate-600 text-sm hover:text-slate-800 list-none">
            <span className="flex items-center gap-2">
              <span className="transition-transform group-open:rotate-90">▶</span>
              📋 All Materials ({materials.length})
            </span>
          </summary>
          <div className="space-y-1 mt-2">
            {materials.map((material) => (
              <MaterialItem
                key={`all-${material.itemId}`}
                material={material}
                onInventoryChange={handleInventoryChange}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
};

interface MaterialItemProps {
  material: {
    itemId: string;
    itemName: string;
    quantity: number;
    tier: number;
    rarity: number;
    isBaseItem: boolean;
    needed: number;
    have: number;
    effectiveHave: number;
    missing: number;
  };
  onInventoryChange: (itemId: string, value: string) => void;
}

const MaterialItem: React.FC<MaterialItemProps> = ({ material, onInventoryChange }) => {
  const hasEnough = material.effectiveHave >= material.needed;
  const surplus = material.effectiveHave - material.needed;

  return (
    <div className={`p-2 rounded border transition-all ${
      hasEnough 
        ? 'bg-green-50 border-green-200' 
        : 'bg-red-50 border-red-200'
    }`}>
      {/* Header - Compact */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-800 text-sm truncate">{material.itemName}</span>
          {hasEnough && <span className="text-green-600 text-xs font-bold">✓</span>}
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
            T{material.tier >= 0 ? material.tier : 'B'}
          </span>
          <span className={`px-1.5 py-0.5 rounded font-medium ${RARITY_COLORS[material.rarity as keyof typeof RARITY_COLORS] || 'text-gray-400'} bg-slate-100`}>
            {(RARITY_NAMES[material.rarity as keyof typeof RARITY_NAMES] || 'Unknown').charAt(0)}
          </span>
        </div>
      </div>

      {/* Quantity Info - Compact Grid */}
      <div className="grid grid-cols-4 gap-1 text-xs">
        <div className="bg-blue-100 border border-blue-200 rounded p-1.5 text-center">
          <div className="text-blue-700 font-medium">NEED</div>
          <div className="text-blue-800 font-bold">{material.needed.toLocaleString()}</div>
        </div>
        
        <div className="bg-green-100 border border-green-200 rounded p-1.5 text-center">
          <div className="text-green-700 font-medium">HAVE</div>
          <input
            type="number"
            value={material.have}
            onChange={(e) => onInventoryChange(material.itemId, e.target.value)}
            className="w-full text-green-800 font-bold bg-transparent border-0 text-center focus:outline-none focus:ring-1 focus:ring-green-500 rounded text-xs"
            min="0"
            placeholder="0"
          />
        </div>

        <div className="bg-purple-100 border border-purple-200 rounded p-1.5 text-center">
          <div className="text-purple-700 font-medium">TOTAL</div>
          <div className="text-purple-800 font-bold">{material.effectiveHave.toLocaleString()}</div>
        </div>

        <div className={`border rounded p-1.5 text-center ${
          material.missing > 0 
            ? 'bg-red-100 border-red-200' 
            : 'bg-green-100 border-green-200'
        }`}>
          <div className={`font-medium ${
            material.missing > 0 ? 'text-red-700' : 'text-green-700'
          }`}>
            {material.missing > 0 ? 'NEED' : 'EXTRA'}
          </div>
          <div className={`font-bold ${
            material.missing > 0 ? 'text-red-800' : 'text-green-800'
          }`}>
            {material.missing > 0 ? material.missing.toLocaleString() : surplus.toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialSummary; 