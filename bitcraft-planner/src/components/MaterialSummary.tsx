import React from 'react';
import { useItemsStore } from '../state/useItemsStore';
import { RARITY_COLORS, RARITY_NAMES } from '../utils/constants';

const MaterialSummary: React.FC = () => {
  const { 
    getRequiredMaterials, 
    buildList, 
    setInventoryItem, 
    getInventoryQuantity 
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
      <div className="text-center py-8">
        <div className="bg-slate-50 rounded-lg p-6 border-2 border-dashed border-slate-300">
          <div className="text-2xl mb-2">📋</div>
          <div className="text-lg font-medium text-slate-600 mb-2">No materials calculated</div>
          <div className="text-sm text-slate-500">
            Add items to your build list to see material requirements
          </div>
        </div>
      </div>
    );
  }

  const missingMaterials = materials.filter(m => m.missing > 0);
  const completeMaterials = materials.filter(m => m.missing === 0);

  return (
    <div className="space-y-4 overflow-auto">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-blue-800">{materials.length}</div>
          <div className="text-xs text-blue-600 font-medium">Total</div>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-red-800">{missingMaterials.length}</div>
          <div className="text-xs text-red-600 font-medium">Missing</div>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
          <div className="text-xl font-bold text-green-800">{completeMaterials.length}</div>
          <div className="text-xs text-green-600 font-medium">Ready</div>
        </div>
      </div>

      {/* Export Button */}
      {missingMaterials.length > 0 && (
        <button
          onClick={exportToClipboard}
          className="w-full bg-green-100 hover:bg-green-200 text-green-800 px-4 py-2 rounded-lg font-medium transition-colors border border-green-300"
        >
          📋 Copy Shopping List ({missingMaterials.length} items)
        </button>
      )}

      {/* Missing Materials First */}
      {missingMaterials.length > 0 && (
        <div>
          <h4 className="font-bold text-red-800 mb-3 border-b border-red-200 pb-2">
            ❌ Missing Materials ({missingMaterials.length})
          </h4>
          <div className="space-y-2">
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

      {/* Complete Materials */}
      {completeMaterials.length > 0 && (
        <div>
          <h4 className="font-bold text-green-800 mb-3 border-b border-green-200 pb-2">
            ✅ Ready Materials ({completeMaterials.length})
          </h4>
          <div className="space-y-2">
            {completeMaterials.map((material) => (
              <MaterialItem
                key={material.itemId}
                material={material}
                onInventoryChange={handleInventoryChange}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Materials Section (if user wants to see everything) */}
      {materials.length > 0 && missingMaterials.length > 0 && completeMaterials.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer font-bold text-slate-600 hover:text-slate-800 mb-2">
            📋 All Base Materials ({materials.length})
          </summary>
          <div className="space-y-2">
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
    <div className={`p-3 rounded-lg border-2 transition-all ${
      hasEnough 
        ? 'bg-green-50 border-green-200' 
        : 'bg-red-50 border-red-200'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800">{material.itemName}</span>
          {hasEnough && <span className="text-green-600 font-bold">✓</span>}
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-medium">
            T{material.tier >= 0 ? material.tier : 'B'}
          </span>
          <span className={`px-2 py-1 rounded font-semibold ${RARITY_COLORS[material.rarity as keyof typeof RARITY_COLORS]} bg-slate-100`}>
            {RARITY_NAMES[material.rarity as keyof typeof RARITY_NAMES]}
          </span>
        </div>
      </div>

      {/* Quantity Info */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div className="bg-blue-100 border border-blue-300 rounded p-2">
          <div className="text-blue-700 font-medium">NEED</div>
          <div className="text-blue-800 font-bold">{material.needed.toLocaleString()}</div>
        </div>
        
        <div className="bg-green-100 border border-green-300 rounded p-2">
          <div className="text-green-700 font-medium">HAVE</div>
          <input
            type="number"
            value={material.have}
            onChange={(e) => onInventoryChange(material.itemId, e.target.value)}
            className="w-full text-green-800 font-bold bg-transparent border-0 text-center focus:outline-none focus:ring-2 focus:ring-green-500 rounded"
            min="0"
            placeholder="0"
          />
        </div>

        <div className="bg-purple-100 border border-purple-300 rounded p-2">
          <div className="text-purple-700 font-medium">TOTAL</div>
          <div className="text-purple-800 font-bold">{material.effectiveHave.toLocaleString()}</div>
        </div>

        <div className={`border rounded p-2 ${
          material.missing > 0 
            ? 'bg-red-100 border-red-300' 
            : 'bg-gray-100 border-gray-300'
        }`}>
          <div className={`font-medium ${
            material.missing > 0 ? 'text-red-700' : 'text-gray-700'
          }`}>
            {material.missing > 0 ? 'MISS' : 'SURPLUS'}
          </div>
          <div className={`font-bold ${
            material.missing > 0 ? 'text-red-800' : 'text-gray-800'
          }`}>
            {material.missing > 0 ? material.missing.toLocaleString() : surplus.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Effective Inventory Note */}
      {material.effectiveHave > material.have && (
        <div className="mt-2 text-xs text-purple-600 bg-purple-50 rounded px-2 py-1">
          +{(material.effectiveHave - material.have).toLocaleString()} from higher-tier items
        </div>
      )}
    </div>
  );
};

export default MaterialSummary; 