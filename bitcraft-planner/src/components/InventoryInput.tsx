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
    <div className="space-y-4">
      {/* Add to Inventory Form */}
      <div className="p-4 bg-gray-700 rounded-lg">
        <h3 className="font-bold text-lg mb-2 text-white">Add to Inventory</h3>
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
        <h3 className="font-bold text-lg mb-2 text-white">Your Items ({Object.keys(inventory).length})</h3>
        <div className="space-y-2">
          {Object.keys(inventory).length > 0 ? (
            Object.entries(inventory).map(([id, quantity]) => (
              <div key={id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <span className="text-white">{items[id]?.name || 'Unknown Item'}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-300">x{quantity}</span>
                  <button onClick={() => removeInventoryItem(id)} className="text-red-400 hover:text-red-300">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400">Your inventory is empty.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InventoryInput; 