import React, { useState } from 'react';
import { useItemsStore } from '../state/useItemsStore';
import { RARITY_COLORS } from '../utils/constants';

const InventoryManager: React.FC = () => {
  const { 
    items, 
    inventory, 
    setInventoryItem, 
    removeInventoryItem, 
    clearInventory,
    getFilteredItems 
  } = useItemsStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');

  // Filter items for the dropdown
  const filteredItems = Object.entries(items).filter(([id, item]) => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 20); // Limit to 20 results for performance

  const handleAddItem = () => {
    if (selectedItemId && quantity) {
      const numQuantity = parseInt(quantity);
      if (numQuantity > 0) {
        setInventoryItem(selectedItemId, numQuantity);
        setSelectedItemId('');
        setQuantity('');
        setSearchTerm('');
      }
    }
  };

  const handleRemoveItem = (itemId: string) => {
    removeInventoryItem(itemId);
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: string) => {
    const numQuantity = parseInt(newQuantity);
    if (numQuantity > 0) {
      setInventoryItem(itemId, numQuantity);
    } else {
      removeInventoryItem(itemId);
    }
  };

  const inventoryItems = Object.entries(inventory).filter(([_, qty]) => qty > 0);

  return (
    <div className="bg-white rounded-xl border-2 border-slate-200 shadow-sm">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-slate-800">📦 Inventory Manager</h3>
          <button
            onClick={clearInventory}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            disabled={inventoryItems.length === 0}
          >
            Clear All
          </button>
        </div>
        
        {/* Add Item Section */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Item Search/Select */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search for item..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedItemId('');
                }}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              
              {/* Dropdown */}
              {searchTerm && filteredItems.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredItems.map(([id, item]) => (
                    <button
                      key={id}
                      onClick={() => {
                        setSelectedItemId(id);
                        setSearchTerm(item.name);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-100 flex items-center gap-3"
                    >
                      <span 
                        className={`w-3 h-3 rounded-full ${RARITY_COLORS[item.rarity as keyof typeof RARITY_COLORS] || 'bg-gray-400'}`}
                      />
                      <span className="font-medium">{item.name}</span>
                      <span className="text-sm text-slate-500 ml-auto">Tier {item.tier}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Quantity Input */}
            <input
              type="number"
              placeholder="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min="1"
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            
            {/* Add Button */}
            <button
              onClick={handleAddItem}
              disabled={!selectedItemId || !quantity}
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
            >
              Add to Inventory
            </button>
          </div>
        </div>
      </div>

      {/* Current Inventory */}
      <div className="p-6">
        <h4 className="text-lg font-semibold text-slate-800 mb-4">
          Current Inventory ({inventoryItems.length} items)
        </h4>
        
        {inventoryItems.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <div className="text-4xl mb-2">📦</div>
            <p>Your inventory is empty</p>
            <p className="text-sm">Add items above to track what you have</p>
          </div>
        ) : (
          <div className="space-y-3">
            {inventoryItems.map(([itemId, qty]) => {
              const item = items[itemId];
              if (!item) return null;
              
              return (
                <div 
                  key={itemId}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200"
                >
                  <div className="flex items-center gap-3">
                                         <span 
                       className={`w-4 h-4 rounded-full ${RARITY_COLORS[item.rarity as keyof typeof RARITY_COLORS] || 'bg-gray-400'}`}
                     />
                    <span className="font-medium text-slate-800">{item.name}</span>
                    <span className="text-sm text-slate-500">Tier {item.tier}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={qty}
                      onChange={(e) => handleUpdateQuantity(itemId, e.target.value)}
                      min="0"
                      className="w-20 px-2 py-1 text-center border border-slate-300 rounded"
                    />
                    <button
                      onClick={() => handleRemoveItem(itemId)}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                    >
                      ✕
                    </button>
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

export default InventoryManager; 