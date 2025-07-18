import React, { useState, useEffect, useRef } from 'react';
import { useItemsStore } from '../state/useItemsStore';
import { RARITY_COLORS, RARITY_NAMES } from '../utils/constants';

const InventoryInput: React.FC = () => {
  const { inventory, setInventoryItem, removeInventoryItem, items } = useItemsStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [quantity, setQuantity] = useState<number | string>(1);
  const [showDropdown, setShowDropdown] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const handleAdd = () => {
    if (selectedItem && quantity) {
      setInventoryItem(selectedItem, Number(quantity));
      setSelectedItem('');
      setQuantity(1);
      setSearchTerm('');
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredItems = Object.entries(items).filter(([id, item]) => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) && !inventory[id]
  );
  
  const inventoryItems = Object.entries(inventory).map(([id, qty]) => ({
    id,
    ...items[id],
    quantity: qty
  })).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      {/* Instructions Section */}
      <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <div className="text-2xl">💡</div>
          <div>
            <h3 className="font-semibold text-blue-200 mb-2">How to Use Inventory</h3>
            <div className="text-sm text-blue-100/80 space-y-2">
              <p>Track what materials you already have to get accurate crafting requirements:</p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Add items you currently have in your game inventory</li>
                <li>The Material Summary will automatically subtract what you have</li>
                <li>Build Steps will show only what you still need to craft or gather</li>
                <li>Items in your inventory count toward recipe requirements</li>
              </ul>
              <div className="mt-3 p-2 bg-blue-800/30 rounded text-xs">
                <strong>Tip:</strong> Add base materials (ores, wood, etc.) first - they're used in many recipes!
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add to Inventory Form */}
      <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600/50">
        <h3 className="font-bold text-lg mb-3 text-white flex items-center gap-2">
          <span>📦</span>
          Add to Inventory
        </h3>
        <div className="relative">
          <input
            type="text"
            placeholder="Search for an item..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setShowDropdown(true)} // <-- ADD THIS LINE
            className="w-full p-2 bg-gray-600 border border-gray-500 rounded-lg mb-2 text-white"
          />
          {showDropdown && searchTerm && (
            <div className="absolute z-10 w-full bg-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {filteredItems.length > 0 ? (
                filteredItems.slice(0, 100).map(([id, item]) => (
                  <div
                    key={id}
                    onClick={() => {
                      setSelectedItem(id);
                      setSearchTerm(item.name);
                      setShowDropdown(false);
                    }}
                    className="p-2 hover:bg-gray-500 cursor-pointer text-white"
                  >
                    {item.name} - T{item.tier}
                  </div>
                ))
              ) : (
                <div className="p-2 text-gray-400">No results found</div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-24 p-2 bg-gray-600 border border-gray-500 rounded-lg text-white"
            placeholder="Qty"
          />
          <button
            onClick={handleAdd}
            disabled={!selectedItem}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:bg-gray-500"
          >
            Add Item
          </button>
        </div>
      </div>

      {/* Inventory List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-lg text-white flex items-center gap-2">
            <span>🎒</span>
            Your Items ({Object.keys(inventory).length})
          </h3>
          {Object.keys(inventory).length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear your entire inventory?')) {
                  Object.keys(inventory).forEach(id => removeInventoryItem(id));
                }
              }}
              className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-400/30 hover:border-red-300/50 transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
        
        <div className="space-y-2">
          {Object.keys(inventory).length > 0 ? (
            Object.entries(inventory)
              .sort(([idA], [idB]) => {
                const itemA = items[idA];
                const itemB = items[idB];
                // Sort by tier first, then by name
                if (itemA?.tier !== itemB?.tier) {
                  return (itemA?.tier || 0) - (itemB?.tier || 0);
                }
                return (itemA?.name || '').localeCompare(itemB?.name || '');
              })
              .map(([id, quantity]) => {
                const item = items[id];
                return (
                  <div key={id} className="flex items-center justify-between p-3 bg-slate-700/50 border border-slate-600/50 rounded-lg hover:bg-slate-700/70 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="text-white font-medium">{item?.name || 'Unknown Item'}</span>
                        {item && (
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                            <span>Tier {item.tier}</span>
                            <span>•</span>
                            <span className={`${RARITY_COLORS[item.rarity as keyof typeof RARITY_COLORS] || 'text-gray-400'}`}>
                              {RARITY_NAMES[item.rarity as keyof typeof RARITY_NAMES] || 'Common'}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setInventoryItem(id, Math.max(0, quantity - 1))}
                          className="w-6 h-6 flex items-center justify-center bg-slate-600 hover:bg-slate-500 text-white rounded text-sm transition-colors"
                          disabled={quantity <= 1}
                        >
                          −
                        </button>
                        <span className="text-slate-200 font-medium min-w-[3rem] text-center">
                          ×{quantity}
                        </span>
                        <button
                          onClick={() => setInventoryItem(id, quantity + 1)}
                          className="w-6 h-6 flex items-center justify-center bg-slate-600 hover:bg-slate-500 text-white rounded text-sm transition-colors"
                        >
                          +
                        </button>
                      </div>
                      <button 
                        onClick={() => removeInventoryItem(id)} 
                        className="text-red-400 hover:text-red-300 p-1 hover:bg-red-400/10 rounded transition-colors"
                        title="Remove from inventory"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })
          ) : (
            <div className="text-center py-8 text-slate-400">
              <div className="text-4xl mb-3">📦</div>
              <p className="font-medium">Your inventory is empty</p>
              <p className="text-sm mt-1">Add items above to track what you already have</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryInput; 