import React, { useState, useEffect } from 'react';
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
  const [showAll, setShowAll] = useState(false);
  const [itemsToShow, setItemsToShow] = useState(15); // Start with fewer items for better mobile experience

  // Reset pagination when filters change
  useEffect(() => {
    setShowAll(false);
    setItemsToShow(15);
  }, [searchTerm, tierFilter, rarityFilter, recipeTypeFilter]);

  const filteredItems = getFilteredItems();
  const displayedItems = showAll ? filteredItems : filteredItems.slice(0, itemsToShow);
  const hasMore = filteredItems.length > itemsToShow;

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

  const handleShowMore = () => {
    setItemsToShow(prev => prev + 15);
  };

  const handleShowAll = () => {
    setShowAll(true);
  };

  const handleResetView = () => {
    setShowAll(false);
    setItemsToShow(15);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setTierFilter(null);
    setRarityFilter(null);
    setRecipeTypeFilter('craftable');
  };

  const uniqueTiers = Array.from(new Set(
    Object.values(useItemsStore.getState().items).map(item => item.tier)
  )).sort((a, b) => a - b);

  const uniqueRarities = Array.from(new Set(
    Object.values(useItemsStore.getState().items).map(item => item.rarity)
  )).sort((a, b) => a - b);

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Search - More Prominent */}
      <div className="flex-shrink-0 space-y-2">
        <div className="relative">
          <input
            type="text"
            placeholder="🔍 Search items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-white border-2 border-slate-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors text-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>
        
        {/* Filters - Collapsible */}
        <details className="group">
          <summary className="cursor-pointer text-xs text-slate-600 hover:text-slate-800 list-none">
            <span className="flex items-center gap-1">
              <span className="transition-transform group-open:rotate-90">▶</span>
              Filters {(tierFilter || rarityFilter || recipeTypeFilter !== 'craftable') && '🎯'}
            </span>
          </summary>
          <div className="space-y-2 mt-2">
            <div className="grid grid-cols-3 gap-2">
              {/* Tier Filter */}
              <select
                value={tierFilter ?? ''}
                onChange={(e) => setTierFilter(e.target.value ? parseInt(e.target.value) : null)}
                className="px-2 py-1 bg-slate-50 text-slate-800 text-xs rounded border border-slate-300 focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value="">All Tiers</option>
                {uniqueTiers.map(tier => (
                  <option key={tier} value={tier}>
                    T{tier >= 0 ? tier : 'B'}
                  </option>
                ))}
              </select>

              {/* Rarity Filter */}
              <select
                value={rarityFilter ?? ''}
                onChange={(e) => setRarityFilter(e.target.value ? parseInt(e.target.value) : null)}
                className="px-2 py-1 bg-slate-50 text-slate-800 text-xs rounded border border-slate-300 focus:border-blue-500 focus:outline-none transition-colors"
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
                className="px-2 py-1 bg-slate-50 text-slate-800 text-xs rounded border border-slate-300 focus:border-blue-500 focus:outline-none transition-colors"
              >
                <option value="">All Items</option>
                <option value="craftable">Craftable</option>
                <option value="base">Base</option>
              </select>
            </div>
            
            {/* Clear Filters Button */}
            {(searchTerm || tierFilter || rarityFilter || recipeTypeFilter !== 'craftable') && (
              <button
                onClick={clearAllFilters}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded text-xs font-medium transition-colors"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </details>
      </div>

      {/* Results Summary */}
      <div className="flex-shrink-0 text-xs text-slate-600 bg-slate-100 rounded px-2 py-1">
        {filteredItems.length > 0 ? (
          <>
            Showing {displayedItems.length} of {filteredItems.length} items
            {searchTerm && ` for "${searchTerm}"`}
            {recipeTypeFilter === 'craftable' && !searchTerm && !tierFilter && !rarityFilter && (
              <span className="text-blue-600"> • Craftable items only</span>
            )}
          </>
        ) : (
          <>
            {searchTerm ? `No items found for "${searchTerm}"` : 'No items found'}
            {recipeTypeFilter === 'craftable' && (
              <span className="text-blue-600"> • Try "All Items" filter</span>
            )}
          </>
        )}
      </div>

      {/* Items List - Paginated */}
      <div className="flex-1 min-h-0">
        <div className="h-full overflow-y-auto space-y-2 pr-2">
          {displayedItems.length > 0 ? (
            displayedItems.map(([id, item]) => {
              const canCraft = item.recipes && item.recipes.length > 0;
              const quantity = addQuantities[id] || 1;
              
              return (
                <div
                  key={id}
                  className="p-2 bg-slate-50 rounded-lg transition-all duration-200 border border-slate-200 hover:border-blue-400 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800 text-sm truncate">{item.name}</h3>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <span className="text-xs font-medium text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                            T{item.tier >= 0 ? item.tier : 'B'}
                          </span>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${RARITY_COLORS[item.rarity as keyof typeof RARITY_COLORS] || 'text-gray-400'} bg-slate-200`}>
                            {(RARITY_NAMES[item.rarity as keyof typeof RARITY_NAMES] || 'Unknown').charAt(0)}
                          </span>
                          {!canCraft && (
                            <span className="text-xs font-medium text-orange-600 bg-orange-100 px-1.5 py-0.5 rounded">
                              Base
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                      {showAddToBuilds ? (
                        <div className="flex items-center gap-1">
                          {canCraft && (
                            <>
                              <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => updateQuantity(id, parseInt(e.target.value) || 1)}
                                className="w-12 px-1 py-0.5 text-xs bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAddToBuild(id);
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded text-xs font-medium transition-colors"
                              >
                                Add
                              </button>
                            </>
                          )}
                          {!canCraft && (
                            <div className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-0.5 rounded">
                              N/A
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs font-medium text-slate-600 bg-slate-200 px-2 py-0.5 rounded">
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
              <div className="bg-slate-100 rounded-lg p-4 border border-slate-200">
                <div className="text-sm font-medium text-slate-600">No items found</div>
                <div className="text-xs text-slate-500 mt-1">Try adjusting your search or filters</div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Load More Controls */}
      {filteredItems.length > 0 && !showAll && hasMore && (
        <div className="flex-shrink-0 space-y-2">
          <button
            onClick={handleShowMore}
            className="w-full bg-blue-100 hover:bg-blue-200 text-blue-800 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Show More ({filteredItems.length - itemsToShow} remaining)
          </button>
          <button
            onClick={handleShowAll}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded text-xs font-medium transition-colors"
          >
            Show All {filteredItems.length} Items
          </button>
        </div>
      )}
      
      {/* Reset View Button */}
      {showAll && (
        <div className="flex-shrink-0">
          <button
            onClick={handleResetView}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded text-xs font-medium transition-colors"
          >
            Back to Paginated View
          </button>
        </div>
      )}
    </div>
  );
};

export default ItemList; 