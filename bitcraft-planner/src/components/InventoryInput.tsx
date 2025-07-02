import React, { useState, useMemo } from 'react';
import { useItemsStore } from '../state/useItemsStore';
import { RARITY_COLORS, RARITY_NAMES } from '../utils/constants';

const InventoryInput: React.FC = () => {
  const { 
    items, 
    inventory, 
    setInventoryItem, 
    removeInventoryItem, 
    clearInventory,
    getRequiredMaterials,
    getAllPossibleMaterials,
    getEffectiveInventoryQuantity 
  } = useItemsStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyRequired, setShowOnlyRequired] = useState(true);

  const allPossibleMaterials = getAllPossibleMaterials();
  const baseMaterials = getRequiredMaterials();
  const requiredMaterials = showOnlyRequired ? allPossibleMaterials : [];
  const requiredItemIds = new Set(allPossibleMaterials.map(m => m.itemId));

  const filteredItems = useMemo(() => {
    let itemList = Object.entries(items);

    // Filter by required materials if enabled
    if (showOnlyRequired && allPossibleMaterials.length > 0) {
      itemList = itemList.filter(([itemId]) => requiredItemIds.has(itemId));
    }

    // Search filter
    if (searchTerm) {
      itemList = itemList.filter(([, item]) => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return itemList.sort(([, a], [, b]) => a.name.localeCompare(b.name));
  }, [items, searchTerm, showOnlyRequired, allPossibleMaterials, requiredItemIds]);

  const inventoryItems = Object.entries(inventory).filter(([, quantity]) => quantity > 0);

  const handleQuantityChange = (itemId: string, value: string) => {
    const quantity = parseInt(value) || 0;
    if (quantity <= 0) {
      removeInventoryItem(itemId);
    } else {
      setInventoryItem(itemId, quantity);
    }
  };

  return (
    <div className="space-y-4 overflow-auto h-full">
      {/* Controls */}
      <div className="space-y-3">
        <div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search items..."
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showOnlyRequired}
              onChange={(e) => setShowOnlyRequired(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500"
            />
            <span className="text-slate-700">Show only required materials (all steps)</span>
          </label>

          {inventoryItems.length > 0 && (
            <button
              onClick={clearInventory}
              className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-md font-medium transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Current Inventory Summary */}
      {inventoryItems.length > 0 && (
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <h4 className="font-bold text-slate-800 mb-3">
            📦 Current Inventory ({inventoryItems.length} items)
          </h4>
          <div className="space-y-2 max-h-32 overflow-auto">
            {inventoryItems.map(([itemId, quantity]) => {
              const item = items[itemId];
              const effectiveQuantity = getEffectiveInventoryQuantity(itemId);
              
              return (
                <div
                  key={itemId}
                  className="flex items-center justify-between bg-white px-3 py-2 rounded border border-slate-200"
                >
                  <div>
                    <span className="font-medium text-slate-800">
                      {item?.name || `Item ${itemId}`}
                    </span>
                    {effectiveQuantity > quantity && (
                      <span className="text-xs text-purple-600 ml-2">
                        (+{effectiveQuantity - quantity} effective)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-medium">{quantity.toLocaleString()}</span>
                    <button
                      onClick={() => removeInventoryItem(itemId)}
                      className="text-red-600 hover:text-red-800 font-bold text-xs px-1 py-1 rounded hover:bg-red-100 transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Item List */}
      <div>
        <h4 className="font-bold text-slate-800 mb-3">
          {showOnlyRequired ? '🎯 All Required Materials (Base + Intermediate)' : '📦 All Items'} 
          ({filteredItems.length})
        </h4>
        
        {filteredItems.length === 0 ? (
          <div className="text-center py-8">
            <div className="bg-slate-50 rounded-lg p-6 border-2 border-dashed border-slate-300">
              <div className="text-lg font-medium text-slate-600 mb-2">No items found</div>
              <div className="text-sm text-slate-500">
                {showOnlyRequired 
                  ? "Add items to your build list to see all required materials (base + intermediate)"
                  : "Try adjusting your search term"
                }
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-auto">
            {filteredItems.map(([itemId, item]) => {
              const currentQuantity = inventory[itemId] || 0;
              const isRequired = requiredItemIds.has(itemId);
              const requiredMaterial = allPossibleMaterials.find(m => m.itemId === itemId);
              
              return (
                <div
                  key={itemId}
                  className={`p-3 rounded-lg border transition-all ${
                    isRequired 
                      ? 'bg-blue-50 border-blue-200' 
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="font-medium text-slate-800">{item.name}</span>
                      {isRequired && requiredMaterial && (
                        <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Need {requiredMaterial.needed.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="bg-slate-100 px-2 py-1 rounded text-slate-600 font-medium">
                        T{item.tier >= 0 ? item.tier : 'B'}
                      </span>
                      <span className={`px-2 py-1 rounded font-semibold ${RARITY_COLORS[item.rarity as keyof typeof RARITY_COLORS]} bg-slate-100`}>
                        {RARITY_NAMES[item.rarity as keyof typeof RARITY_NAMES]}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 font-medium">Quantity:</span>
                    <input
                      type="number"
                      value={currentQuantity}
                      onChange={(e) => handleQuantityChange(itemId, e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                      placeholder="0"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default InventoryInput; 