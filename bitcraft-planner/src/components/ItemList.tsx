import React, { useState } from 'react';
import { useItemsStore } from '../state/useItemsStore';
import { RARITY_COLORS, RARITY_NAMES } from '../utils/constants';

interface ItemListProps {
  showAddToBuilds?: boolean;
}

const ItemList: React.FC<ItemListProps> = ({ showAddToBuilds = false }) => {
  const {
    searchTerm,
    tierFilter,
    rarityFilter,
    recipeTypeFilter,
    setSearchTerm,
    setTierFilter,
    setRarityFilter,
    setRecipeTypeFilter,
    getFilteredItems,
    addToBuildList,
    items,
  } = useItemsStore();

  const [addQuantities, setAddQuantities] = useState<Record<string, number>>({});

  const filteredItems = getFilteredItems();

  const handleAddToBuild = (itemId: string) => {
    const quantity = addQuantities[itemId] || 1;
    const item = items[itemId];
    
    if (item && item.recipes && item.recipes.length > 0) {
      addToBuildList(itemId, quantity, 0); // Default to first recipe
      // Reset quantity after adding
      setAddQuantities(prev => ({ ...prev, [itemId]: 1 }));
    }
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    setAddQuantities(prev => ({ ...prev, [itemId]: Math.max(1, quantity) }));
  };

  const uniqueTiers = Array.from(new Set(
    Object.values(useItemsStore.getState().items).map(item => item.tier)
  )).sort((a, b) => a - b);

  const uniqueRarities = Array.from(new Set(
    Object.values(useItemsStore.getState().items).map(item => item.rarity)
  )).sort((a, b) => a - b);

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Search and Filters - Fixed at top */}
      <div className="flex-shrink-0 space-y-4">
        {/* Search Input */}
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-slate-50 text-slate-800 text-lg rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:outline-none transition-colors"
        />
        
        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Tier Filter */}
          <select
            value={tierFilter ?? ''}
            onChange={(e) => setTierFilter(e.target.value ? parseInt(e.target.value) : null)}
            className="px-3 py-2 bg-slate-50 text-slate-800 text-sm rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:outline-none transition-colors"
          >
            <option value="">All Tiers</option>
            {uniqueTiers.map(tier => (
              <option key={tier} value={tier}>
                Tier {tier >= 0 ? tier : 'Base'}
              </option>
            ))}
          </select>

          {/* Rarity Filter */}
          <select
            value={rarityFilter ?? ''}
            onChange={(e) => setRarityFilter(e.target.value ? parseInt(e.target.value) : null)}
            className="px-3 py-2 bg-slate-50 text-slate-800 text-sm rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:outline-none transition-colors"
          >
            <option value="">All Rarities</option>
            {uniqueRarities.map(rarity => (
              <option key={rarity} value={rarity}>
                {RARITY_NAMES[rarity as keyof typeof RARITY_NAMES]}
              </option>
            ))}
          </select>

          {/* Recipe Type Filter */}
          <select
            value={recipeTypeFilter ?? ''}
            onChange={(e) => setRecipeTypeFilter(e.target.value as 'all' | 'craftable' | 'base' | null || null)}
            className="px-3 py-2 bg-slate-50 text-slate-800 text-sm rounded-lg border-2 border-slate-300 focus:border-blue-500 focus:outline-none transition-colors"
          >
            <option value="">All Items</option>
            <option value="craftable">Craftable Items</option>
            <option value="base">Base Items</option>
          </select>
        </div>
      </div>

      {/* Items List - Scrollable, takes remaining height */}
      <div className="flex-1 min-h-0">
        <div className="h-full overflow-y-auto space-y-3 pr-2">
          {filteredItems.length > 0 ? (
            filteredItems.map(([id, item]) => {
              const canCraft = item.recipes && item.recipes.length > 0;
              const quantity = addQuantities[id] || 1;
              
              return (
                <div
                  key={id}
                  className="p-4 bg-slate-50 rounded-lg transition-all duration-200 border-2 border-slate-200 hover:border-blue-400 shadow-sm hover:shadow-md"
                >
                  <div className="flex justify-between items-start">
                    <div 
                      className={`flex-1 min-w-0 ${!showAddToBuilds ? 'cursor-pointer' : ''}`}
                    >
                      <h3 className="font-bold text-slate-800 text-lg mb-2 truncate">{item.name}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-medium text-slate-600 bg-slate-200 px-2 py-1 rounded-full">
                          Tier {item.tier >= 0 ? item.tier : 'Base'}
                        </span>
                        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${RARITY_COLORS[item.rarity as keyof typeof RARITY_COLORS]} bg-slate-200`}>
                          {RARITY_NAMES[item.rarity as keyof typeof RARITY_NAMES]}
                        </span>
                        {!canCraft && (
                          <span className="text-xs font-medium text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                            Base Item
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      {showAddToBuilds ? (
                        <div className="flex items-center gap-2">
                          {canCraft && (
                            <>
                              <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => updateQuantity(id, parseInt(e.target.value) || 1)}
                                className="w-16 px-2 py-1 text-sm bg-white border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToBuild(id);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
                              >
                                + Add
                              </button>
                            </>
                          )}
                          {!canCraft && (
                            <div className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-1 rounded">
                              Not Craftable
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs font-medium text-slate-600 bg-slate-200 px-2 py-1 rounded">
                          {item.recipes.length > 0 ? `${item.recipes.length}R` : 'Base'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex items-center justify-center h-32">
              <div className="bg-slate-100 rounded-xl p-6 border-2 border-slate-200">
                <div className="text-lg font-medium text-slate-600">No items found</div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Status bar - Fixed at bottom */}
      <div className="flex-shrink-0 text-sm font-medium text-slate-600 text-center py-2 bg-slate-100 rounded-lg border border-slate-200">
        {filteredItems.length} items
      </div>
    </div>
  );
};

export default ItemList; 