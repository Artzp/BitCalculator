import React, { useState } from 'react';
import { useSettlementStore } from '../state/useSettlementStore';
import { useItemsStore } from '../state/useItemsStore';

export const SimpleInventory: React.FC = () => {
  const { settlement, addInventoryItem, updateInventoryItem, removeInventoryItem, updateTasksForInventoryChange, reserveMaterialsForProject } = useSettlementStore();
  const { items } = useItemsStore();
  
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  if (!settlement) {
    return <div className="p-6 text-center text-gray-500">No settlement data available</div>;
  }

  const inventoryItems = Object.values(settlement.inventory);
  const filteredItems = Object.entries(items).filter(([itemId, item]) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddItem = () => {
    if (selectedItemId && quantity > 0) {
      const item = items[selectedItemId];
      if (item) {
        addInventoryItem(selectedItemId, item.name, quantity);
        
        // Update all project tasks when inventory changes
        if (settlement) {
          settlement.projects.forEach(project => {
            updateTasksForInventoryChange(items, project.id);
          });
        }
        
        setSelectedItemId('');
        setQuantity(1);
        setSearchTerm('');
      }
    }
  };

  const handleUpdateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeInventoryItem(itemId);
    } else {
      updateInventoryItem(itemId, { quantity: newQuantity });
    }
    
    // Update all project tasks when inventory changes
    if (settlement) {
      settlement.projects.forEach(project => {
        updateTasksForInventoryChange(items, project.id);
      });
    }
  };

  const handleRefreshProjectReservations = () => {
    if (settlement) {
      settlement.projects.forEach(project => {
        reserveMaterialsForProject(items, project.id);
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Add Item Section */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Add to Settlement Inventory</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search Items</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Search for items..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Select Item</label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Choose an item...</option>
              {filteredItems.slice(0, 50).map(([itemId, item]) => (
                <option key={itemId} value={itemId}>
                  {item.name} (Tier {item.tier})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              min="1"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={handleAddItem}
            disabled={!selectedItemId || quantity <= 0}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-300"
          >
            Add to Inventory
          </button>
        </div>
      </div>

      {/* Current Inventory */}
              <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-800">Settlement Inventory</h3>
            {settlement && settlement.projects.length > 0 && (
              <button
                onClick={handleRefreshProjectReservations}
                className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600 transition-colors"
                title="Refresh material reservations for all projects"
              >
                🔄 Refresh Reservations
              </button>
            )}
          </div>
        
        {inventoryItems.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">📦</div>
            <p className="text-slate-500 text-lg">No items in inventory</p>
            <p className="text-slate-400 text-sm mt-2">Add items to see how they affect project requirements</p>
          </div>
        ) : (
          <div className="space-y-3">
            {inventoryItems.map((inventoryItem) => (
              <div key={inventoryItem.itemId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-800">{inventoryItem.itemName}</h4>
                  <div className="text-sm text-slate-600">
                    <p>
                      Total: {inventoryItem.quantity}
                      {inventoryItem.reservedQuantity > 0 && (
                        <span className="text-orange-600"> • Reserved: {inventoryItem.reservedQuantity}</span>
                      )}
                    </p>
                    <p className="font-medium text-green-600">
                      Available: {inventoryItem.quantity - inventoryItem.reservedQuantity}
                    </p>
                  </div>
                  {inventoryItem.storageLocation && (
                    <p className="text-xs text-slate-500">{inventoryItem.storageLocation}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={inventoryItem.quantity}
                    onChange={(e) => handleUpdateQuantity(inventoryItem.itemId, parseInt(e.target.value) || 0)}
                    min="0"
                    className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                  />
                  <button
                    onClick={() => removeInventoryItem(inventoryItem.itemId)}
                    className="text-red-600 hover:text-red-800 px-2 py-1 text-sm"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {inventoryItems.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-semibold text-blue-800 mb-2">💡 Inventory Integration & Reservation</h4>
          <div className="text-sm text-blue-700 space-y-2">
            <p>
              When you add items to inventory, project tasks will automatically adjust to only require 
              the remaining quantities needed. Items already in storage will be marked as "complete" 
              in project material requirements.
            </p>
            <p className="font-medium">
              🔒 <strong>Smart Reservation:</strong> Materials are automatically reserved for projects to prevent 
              double-counting. If you have 100 Iron Ore and two projects need 80 each, only one project 
              will be able to reserve the materials.
            </p>
            <p>
              <span className="text-orange-600 font-medium">Reserved quantities</span> are allocated to specific projects and 
              show as unavailable for other projects. <span className="text-green-600 font-medium">Available quantities</span> 
              can be used for new projects.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}; 