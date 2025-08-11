import React, { useState, useEffect } from 'react';
import { useItemsStore } from '../state/useItemsStore';
import { RARITY_COLORS, RARITY_NAMES } from '../utils/constants';
import { Item } from '../types/Item';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/solid';

interface ItemListProps {
  showAddToBuilds?: boolean;
}

const ItemList: React.FC<ItemListProps> = ({ showAddToBuilds = false }) => {
  const {
    filters,
    sort,
    setFilter,
    setSort,
    getFilteredItems,
    addToBuildList,
    items,
  } = useItemsStore();

  const [addQuantities, setAddQuantities] = useState<Record<string, number>>({});

  const filteredItems = getFilteredItems();
  const displayedItems = filteredItems;

  const handleAddToBuild = (itemId: string) => {
    const quantity = addQuantities[itemId] || 1;
    addToBuildList(itemId, quantity);
    setAddQuantities(prev => ({ ...prev, [itemId]: 1 }));
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    setAddQuantities(prev => ({ ...prev, [itemId]: Math.max(1, quantity) }));
  };

  const clearAllFilters = () => {
    setFilter({
      searchTerm: '',
      tier: null,
      rarity: null,
      recipeType: 'craftable',
      profession: null,
    });
    setSort({ by: 'tier', direction: 'asc' });
  };

  const uniqueTiers = Array.from(new Set(Object.values(items).map(item => item.tier))).sort((a, b) => a - b);
  const uniqueRarities = Array.from(new Set(Object.values(items).map(item => item.rarity))).sort((a, b) => a - b);

  const handleSort = (by: 'name' | 'tier' | 'rarity') => {
    setSort({ by: by, direction: 'asc' });
  };

  return (
    <div className="flex flex-col h-full text-white min-h-0">
      {/* Item Count Info */}
      <div className="px-4 py-2 text-xs text-slate-400 border-b border-slate-700/50 flex-shrink-0">
        {filteredItems.length} of {Object.keys(items).length} items
      </div>

      {/* Compact Filters */}
      <div className="p-3 border-b border-slate-700/50 bg-slate-900/30 flex-shrink-0">
        {/* Search Bar */}
        <div className="relative mb-3">
          <input
            type="text"
            placeholder="Search items..."
            value={filters.searchTerm}
            onChange={(e) => setFilter({ searchTerm: e.target.value })}
            className="w-full p-2 pl-8 bg-slate-700/50 border border-slate-600/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all placeholder-slate-400 text-sm"
          />
          <svg className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
          {filters.searchTerm && (
            <button
              onClick={() => setFilter({ searchTerm: '' })}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Compact Filter Row */}
        <div className="flex items-center gap-2 text-xs">
          <select
            value={filters.recipeType || 'all'}
            onChange={(e) => setFilter({ recipeType: e.target.value as any })}
            className="px-2 py-1 bg-slate-700/50 border border-slate-600/50 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          >
            <option value="all">All Items</option>
            <option value="craftable">Craftable</option>
            <option value="base">Resources</option>
          </select>
          
          <select
            value={filters.tier === null ? 'all' : filters.tier}
            onChange={(e) => setFilter({ tier: e.target.value === 'all' ? null : Number(e.target.value) })}
            className="px-2 py-1 bg-slate-700/50 border border-slate-600/50 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          >
            <option value="all">All Tiers</option>
            {[...Array(8).keys()].map(i => <option key={i+1} value={i+1}>T{i+1}</option>)}
          </select>

          <select
            value={sort.by}
            onChange={(e) => handleSort(e.target.value as 'name' | 'tier' | 'rarity')}
            className="px-2 py-1 bg-slate-700/50 border border-slate-600/50 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500/50"
          >
            <option value="tier">Sort: Tier</option>
            <option value="name">Sort: Name</option>
            <option value="rarity">Sort: Rarity</option>
          </select>

          <button 
            onClick={() => setSort({ direction: sort.direction === 'asc' ? 'desc' : 'asc' })} 
            className="p-1 bg-slate-700/50 border border-slate-600/50 rounded hover:bg-slate-600/50 transition-colors"
            title={`Sort ${sort.direction === 'asc' ? 'descending' : 'ascending'}`}
          >
            {sort.direction === 'asc' ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
          </button>

          <button 
            onClick={clearAllFilters} 
            className="text-xs text-blue-400 hover:text-blue-300 transition-colors ml-auto"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Enhanced Item List */}
      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {displayedItems.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-semibold text-lg">No items found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {displayedItems.map(([id, item]) => (
              <EnhancedItemRow
                key={id}
                id={id}
                item={item}
                addQuantities={addQuantities}
                updateQuantity={updateQuantity}
                handleAddToBuild={handleAddToBuild}
                showAddToBuilds={showAddToBuilds}
              />
            ))}
            

          </div>
        )}
      </div>

      {/* Enhanced Footer */}
      <div className="p-3 border-t border-slate-700/50 bg-slate-900/30 rounded-b-xl flex-shrink-0">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-400">
            Showing {displayedItems.length} of {filteredItems.length} items
          </span>
          {filteredItems.length !== Object.keys(items).length && (
            <span className="text-slate-500 text-xs">
              ({Object.keys(items).length} total)
            </span>
          )}
        </div>
      </div>
    </div>
  );
};



// Enhanced Item Row Component
const EnhancedItemRow = ({ id, item, addQuantities, updateQuantity, handleAddToBuild, showAddToBuilds }: {
  id: string;
  item: Item;
  addQuantities: Record<string, number>;
  updateQuantity: (id: string, quantity: number) => void;
  handleAddToBuild: (id: string) => void;
  showAddToBuilds?: boolean;
}) => {
  const canCraft = item.recipes && item.recipes.length > 0;
  const quantity = addQuantities[id] || 1;
  const rarityColor = RARITY_COLORS[item.rarity as keyof typeof RARITY_COLORS] || '#64748b';
  const rarityName = RARITY_NAMES[item.rarity as keyof typeof RARITY_NAMES] || 'Unknown';

  const getRarityIcon = (rarity: number) => {
    const icons = ['⚪', '🟢', '🔵', '🟣', '🟡'];
    return icons[rarity] || '⚪';
  };

  const getTierIcon = (tier: number) => {
    if (tier <= 2) return '🌱';
    if (tier <= 4) return '⚙️';
    if (tier <= 6) return '💎';
    return '👑';
  };

  return (
    <div className={`group relative p-2.5 rounded-lg border transition-all duration-150 hover:shadow-soft ${
      canCraft 
        ? 'bg-slate-700/30 border-slate-600/50 hover:border-slate-500/70 hover:bg-slate-700/40' 
        : 'bg-slate-800/30 border-slate-700/50 hover:border-slate-600/70'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0 flex items-center gap-2.5">
          {/* Item Icon */}
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-slate-600/50 flex items-center justify-center">
            <span className="text-lg">{canCraft ? '🔨' : '🌿'}</span>
          </div>
          
          {/* Item Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="font-medium text-white truncate text-sm">{item.name}</h3>
              {!canCraft && (
                <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] rounded-full border border-amber-500/30">
                  Resource
                </span>
              )}
            </div>
            <div className="flex items-center gap-2.5 text-[11px]">
              <div className="flex items-center gap-1">
                <span>{getTierIcon(item.tier)}</span>
                <span className="text-slate-400">Tier {item.tier}</span>
              </div>
              <div className="flex items-center gap-1">
                <span>{getRarityIcon(item.rarity)}</span>
                <span style={{ color: rarityColor }}>{rarityName}</span>
              </div>
              {item.recipes?.[0]?.building_requirement && (
                <div className="flex items-center gap-1 text-slate-500">
                  <span>🏗️</span>
                  <span className="truncate max-w-20">{item.recipes[0].building_requirement}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add to Build Controls */}
        {showAddToBuilds && (
          <div className="flex-shrink-0 ml-4 flex items-center gap-2">
            {canCraft ? (
              <>
                <div className="flex items-center bg-slate-600/50 rounded-md">
                  <button
                    onClick={() => updateQuantity(id, quantity - 1)}
                    disabled={quantity <= 1}
                    className="px-2 py-1.5 hover:bg-slate-500/50 rounded-l-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => updateQuantity(id, parseInt(e.target.value) || 1)}
                    className="w-14 px-2 py-1.5 text-center bg-transparent border-0 focus:outline-none text-white text-sm"
                    onClick={(e) => e.stopPropagation()}
                  />
                  <button
                    onClick={() => updateQuantity(id, quantity + 1)}
                    className="px-2 py-1.5 hover:bg-slate-500/50 rounded-r-md transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>
                <button
                  onClick={() => handleAddToBuild(id)}
                  className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-semibold rounded-md hover:from-blue-600 hover:to-purple-600 transition-colors"
                >
                  Add
                </button>
              </>
            ) : (
              <div className="text-xs text-slate-500 flex items-center gap-1">
                <span>🌿</span>
                <span>Gather only</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hover/Focus Effect (decorative overlay must not block clicks) */}
      <div className="pointer-events-none absolute inset-0 ring-1 ring-transparent group-hover:ring-white/10 group-focus-within:ring-brand-500/40 rounded-lg"></div>
    </div>
  );
};

export default ItemList; 