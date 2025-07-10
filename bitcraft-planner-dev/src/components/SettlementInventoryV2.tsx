import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useItemsStore } from '../state/useItemsStore';
import { SettlementV2 } from '../services/settlementV2Service';

interface InventoryItem {
  itemId: string;
  itemName: string;
  quantity: number;
  reservedQuantity?: number;
  storageLocation?: string;
}

interface SettlementInventoryV2Props {
  onClose?: () => void;
  currentSettlement?: SettlementV2 | null;
}

export const SettlementInventoryV2: React.FC<SettlementInventoryV2Props> = ({ onClose, currentSettlement }) => {
  const { user } = useAuth();
  const { items } = useItemsStore();
  
  // Remove the currentSettlement state since it's now passed as a prop
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [storageLocation, setStorageLocation] = useState('');

  // Load V2 settlement data - now uses the passed currentSettlement
  useEffect(() => {
    const loadSettlementData = async () => {
      if (!user || !currentSettlement) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        
        // Convert inventory object to array using the passed currentSettlement
        const inventoryArray = Object.entries(currentSettlement.inventory || {}).map(([itemId, item]: [string, any]) => ({
          itemId,
          itemName: item.itemName || items[itemId]?.name || 'Unknown Item',
          quantity: item.quantity || 0,
          reservedQuantity: item.reservedQuantity || 0,
          storageLocation: item.storageLocation
        }));
        
        setInventory(inventoryArray);
        console.log(`Loaded inventory with ${inventoryArray.length} items for settlement: ${currentSettlement.name}`);
      } catch (error) {
        console.error('Error loading settlement inventory:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadSettlementData();
  }, [user, items, currentSettlement]);

  const filteredItems = Object.entries(items).filter(([itemId, item]) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleAddItem = async () => {
    if (!selectedItemId || quantity <= 0 || !currentSettlement) return;
    
    try {
      const item = items[selectedItemId];
      if (!item) return;

      // Import the settlement service
      const { SettlementV2Service } = await import('../services/settlementV2Service');
      const settlementService = new SettlementV2Service();
      
      // Update settlement inventory
      const inventoryItem: any = {
        itemId: selectedItemId,
        itemName: item.name,
        quantity: (currentSettlement.inventory[selectedItemId]?.quantity || 0) + quantity,
        reservedQuantity: currentSettlement.inventory[selectedItemId]?.reservedQuantity || 0
      };
      
      // Only include storageLocation if it has a value (Firestore doesn't allow undefined)
      if (storageLocation && storageLocation.trim()) {
        inventoryItem.storageLocation = storageLocation.trim();
      }
      
      const updatedInventory = {
        ...currentSettlement.inventory,
        [selectedItemId]: inventoryItem
      };
      
      await settlementService.updateSettlement(currentSettlement.id, {
        inventory: updatedInventory
      });
      
      // Update inventory display
      const inventoryArray = Object.entries(updatedInventory).map(([itemId, item]: [string, any]) => ({
        itemId,
        itemName: item.itemName || items[itemId]?.name || 'Unknown Item',
        quantity: item.quantity || 0,
        reservedQuantity: item.reservedQuantity || 0,
        storageLocation: item.storageLocation
      }));
      setInventory(inventoryArray);
      
      // Reset form
      setSelectedItemId('');
      setQuantity(1);
      setSearchTerm('');
      setStorageLocation('');
      
      console.log(`Added ${quantity}x ${item.name} to settlement inventory`);
      
    } catch (error) {
      console.error('Error adding item to inventory:', error);
    }
  };

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (!currentSettlement) return;
    
    try {
      // Import the settlement service
      const { SettlementV2Service } = await import('../services/settlementV2Service');
      const settlementService = new SettlementV2Service();
      
      let updatedInventory = { ...currentSettlement.inventory };
      
      if (newQuantity <= 0) {
        // Remove item from inventory
        delete updatedInventory[itemId];
      } else {
        // Update quantity
        updatedInventory[itemId] = {
          ...updatedInventory[itemId],
          quantity: newQuantity
        };
      }
      
      await settlementService.updateSettlement(currentSettlement.id, {
        inventory: updatedInventory
      });
      
      // Update inventory display
      const inventoryArray = Object.entries(updatedInventory).map(([itemId, item]: [string, any]) => ({
        itemId,
        itemName: item.itemName || items[itemId]?.name || 'Unknown Item',
        quantity: item.quantity || 0,
        reservedQuantity: item.reservedQuantity || 0,
        storageLocation: item.storageLocation
      }));
      setInventory(inventoryArray);
      
    } catch (error) {
      console.error('Error updating inventory quantity:', error);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    await handleUpdateQuantity(itemId, 0);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
        <div className="text-center text-gray-500">Loading inventory...</div>
      </div>
    );
  }

  if (!currentSettlement) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
        <div className="text-center text-gray-500">No settlement found</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {onClose && (
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">📦 Settlement Inventory</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ✕
          </button>
        </div>
      )}
      
      {/* Settlement Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-1">🏘️ {currentSettlement.name}</h3>
        <p className="text-sm text-blue-600">{inventory.length} items in inventory</p>
      </div>

      {/* Add Item Section */}
      <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">Add to Inventory</h3>
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

          <div className="grid grid-cols-2 gap-4">
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
            
            <div>
              <label className="block text-sm font-medium mb-1">Storage Location (Optional)</label>
              <input
                type="text"
                value={storageLocation}
                onChange={(e) => setStorageLocation(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Chest #1, Warehouse A"
              />
            </div>
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
        <h3 className="text-lg font-bold text-slate-800 mb-4">Current Inventory</h3>
        
        {inventory.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">📦</div>
            <p className="text-slate-500 text-lg">No items in inventory</p>
            <p className="text-slate-400 text-sm mt-2">Add items to track settlement resources</p>
          </div>
        ) : (
          <div className="space-y-3">
            {inventory.map((inventoryItem) => (
              <div key={inventoryItem.itemId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-800">{inventoryItem.itemName}</h4>
                  <div className="text-sm text-slate-600">
                    <span className="font-medium">Quantity: {inventoryItem.quantity}</span>
                    {inventoryItem.reservedQuantity && inventoryItem.reservedQuantity > 0 && (
                      <span className="ml-3 text-orange-600">
                        Reserved: {inventoryItem.reservedQuantity}
                      </span>
                    )}
                    {inventoryItem.storageLocation && (
                      <span className="ml-3 text-blue-600">
                        📍 {inventoryItem.storageLocation}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdateQuantity(inventoryItem.itemId, inventoryItem.quantity - 1)}
                    className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                  >
                    -
                  </button>
                  <span className="mx-2 min-w-8 text-center">{inventoryItem.quantity}</span>
                  <button
                    onClick={() => handleUpdateQuantity(inventoryItem.itemId, inventoryItem.quantity + 1)}
                    className="px-2 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                  >
                    +
                  </button>
                  <button
                    onClick={() => handleRemoveItem(inventoryItem.itemId)}
                    className="px-2 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}; 