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
  const [showAll, setShowAll] = useState(false);
  const [itemsToShow, setItemsToShow] = useState(20);

  useEffect(() => {
    setShowAll(false);
    setItemsToShow(20);
  }, [filters, sort]);

  const filteredItems = getFilteredItems();
  const displayedItems = showAll ? filteredItems : filteredItems.slice(0, itemsToShow);
  const hasMore = filteredItems.length > itemsToShow;

  const handleAddToBuild = (itemId: string) => {
    const quantity = addQuantities[itemId] || 1;
    const item = items[itemId];
    if (item?.recipes?.length) {
      addToBuildList(itemId, quantity, 0);
      setAddQuantities(prev => ({ ...prev, [itemId]: 1 }));
    }
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
    <div className="bg-gray-800 rounded-lg shadow-lg flex flex-col h-full text-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-bold">Item Catalog</h2>
        <p className="text-sm text-gray-400">Browse and select items to build</p>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-700">
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search by name..."
            value={filters.searchTerm}
            onChange={(e) => setFilter({ searchTerm: e.target.value })}
            className="w-full p-2 pl-8 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <svg className="w-4 h-4 absolute left-2.5 top-3.5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <label htmlFor="sort-by" className="text-sm font-medium text-gray-400">Sort By:</label>
            <select
              id="sort-by"
              value={sort.by}
              onChange={(e) => handleSort(e.target.value as 'name' | 'tier' | 'rarity')}
              className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="tier">Tier</option>
              <option value="name">Name</option>
              <option value="rarity">Rarity</option>
            </select>
            <button onClick={() => setSort({ direction: sort.direction === 'asc' ? 'desc' : 'asc' })} className="p-2 bg-gray-700 border border-gray-600 rounded-lg">
              {sort.direction === 'asc' ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <label htmlFor="show" className="text-sm font-medium text-gray-400">Show:</label>
            <select
              id="show"
              value={filters.recipeType || 'all'}
              onChange={(e) => setFilter({ recipeType: e.target.value as any })}
              className="flex-grow p-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Items</option>
              <option value="craftable">Craftable</option>
              <option value="base">Base Resources</option>
            </select>
          </div>
          <select
            value={filters.tier === null ? 'all' : filters.tier}
            onChange={(e) => setFilter({ tier: e.target.value === 'all' ? null : Number(e.target.value) })}
            className="p-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Tiers</option>
            {[...Array(8).keys()].map(i => <option key={i+1} value={i+1}>Tier {i+1}</option>)}
          </select>
          <select
            value={filters.rarity === null ? 'all' : filters.rarity}
            onChange={(e) => setFilter({ rarity: e.target.value === 'all' ? null : Number(e.target.value) })}
            className="p-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Rarities</option>
            <option value="0">Common</option>
            <option value="1">Uncommon</option>
            <option value="2">Rare</option>
            <option value="3">Epic</option>
            <option value="4">Legendary</option>
          </select>
        </div>
        <div className="text-right mt-2">
          <button onClick={() => { setFilter({ searchTerm: '', tier: null, rarity: null, recipeType: 'craftable' }); setSort({ by: 'tier', direction: 'asc' }); }} className="text-sm text-blue-400 hover:text-blue-300">
            Reset Filters
          </button>
        </div>
      </div>

      {/* Item List */}
      <div className="flex-1 overflow-y-auto p-2">
        {filteredItems.map(([id, item]) => (
          <div key={id} className="flex items-center p-3 hover:bg-gray-700 rounded-lg">
            <div className="flex-grow">
              <p className="font-semibold">{item.name}</p>
              <p className="text-sm text-gray-400">T-{item.tier} {RARITY_NAMES[item.rarity as keyof typeof RARITY_NAMES]}</p>
            </div>
            {showAddToBuilds && (
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="1"
                  value={addQuantities[id] || 1}
                  onChange={(e) => updateQuantity(id, parseInt(e.target.value) || 1)}
                  className="w-20 p-2 text-center bg-gray-700 border border-gray-600 rounded-lg"
                />
                <button
                  onClick={() => addToBuildList(id, addQuantities[id] || 1)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg"
                >
                  Add
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700 text-sm text-gray-400">
        Showing {filteredItems.length} of {Object.keys(items).length} items
      </div>
    </div>
  );
};

const ItemRow = ({ id, item, addQuantities, updateQuantity, handleAddToBuild, showAddToBuilds }: { id: string, item: Item, addQuantities: Record<string, number>, updateQuantity: Function, handleAddToBuild: Function, showAddToBuilds?: boolean }) => {
  const canCraft = item.recipes && item.recipes.length > 0;
  const quantity = addQuantities[id] || 1;

  return (
    <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-800 truncate">{item.name}</p>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>T{item.tier}</span>
          <span style={{ color: RARITY_COLORS[item.rarity as keyof typeof RARITY_COLORS] || 'inherit' }}>
            {RARITY_NAMES[item.rarity as keyof typeof RARITY_NAMES] || 'Unknown'}
          </span>
          {!canCraft && <span className="text-orange-500">Non-Craftable</span>}
        </div>
      </div>
      {showAddToBuilds && (
        <div className="flex-shrink-0 ml-4 flex items-center gap-2">
          {canCraft ? (
            <>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => updateQuantity(id, parseInt(e.target.value) || 1)}
                className="w-16 px-2 py-1 text-center bg-white border border-slate-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={() => handleAddToBuild(id)}
                className="px-4 py-1 bg-blue-600 text-white text-sm font-semibold rounded-md hover:bg-blue-700 transition-colors"
              >
                Add
              </button>
            </>
          ) : (
            <span className="text-xs text-slate-400">Cannot be crafted</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ItemList; 