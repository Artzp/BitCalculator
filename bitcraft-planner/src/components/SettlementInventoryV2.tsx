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
  const [canEditInventory, setCanEditInventory] = useState<boolean>(false);
  
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
        // Compute permissions: owner or any member with canEditInventory or role admin/co_owner
        try {
          const { SettlementV2Service } = await import('../services/settlementV2Service');
          const svc = new SettlementV2Service();
          const members = await svc.getSettlementMembers(currentSettlement.id);
          const me = members.find(m => (m.collaboration?.userId || m.user?.id) === user.uid);
          const isOwner = currentSettlement.ownerId === user.uid;
          const role = me?.collaboration?.role;
          const perm = me?.collaboration?.permissions;
          const canEdit = !!(isOwner || perm?.canEditInventory || role === 'admin' || role === 'co_owner');
          setCanEditInventory(canEdit);
        } catch {}
        
        // Convert inventory object to array using the passed currentSettlement
        const inventoryArray = Object.entries(currentSettlement.inventory || {}).map(([itemId, item]: [string, any]) => ({
          itemId,
          itemName: item.itemName || items[itemId]?.name || 'Unknown Item',
          quantity: Number(item.quantity) || 0,
          reservedQuantity: Number(item.reservedQuantity) || 0,
          storageLocation: item.storageLocation
        }));
        
        setInventory(inventoryArray);
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
    if (!canEditInventory) return;
    
    try {
      const item = items[selectedItemId];
      if (!item) return;

      // Import the settlement service
      const { SettlementV2Service } = await import('../services/settlementV2Service');
      const settlementService = new SettlementV2Service();
      
      // Use the proper method that updates tasks automatically
      await settlementService.addItemsToInventory(currentSettlement.id, [{
        itemId: selectedItemId,
        itemName: item.name,
        quantity: quantity
      }]);
      
      // Refresh the local inventory display
      const settlement = await settlementService.getSettlement(currentSettlement.id);
      if (settlement) {
        const inventoryArray = Object.entries(settlement.inventory).map(([itemId, item]: [string, any]) => ({
          itemId,
          itemName: item.itemName || items[itemId]?.name || 'Unknown Item',
          quantity: Number(item.quantity) || 0,
          reservedQuantity: Number(item.reservedQuantity) || 0,
          storageLocation: item.storageLocation
        }));
        setInventory(inventoryArray);
      }
      
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
      
      // IMPORTANT: Trigger task updates after inventory change
      await settlementService.refreshTaskProgressFromInventory(currentSettlement.id);
      
      // Refresh the local inventory display
      const settlement = await settlementService.getSettlement(currentSettlement.id);
      if (settlement) {
        const inventoryArray = Object.entries(settlement.inventory).map(([itemId, item]: [string, any]) => ({
          itemId,
          itemName: item.itemName || items[itemId]?.name || 'Unknown Item',
          quantity: Number(item.quantity) || 0,
          reservedQuantity: Number(item.reservedQuantity) || 0,
          storageLocation: item.storageLocation
        }));
        setInventory(inventoryArray);
      }
      
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
            disabled={!selectedItemId || quantity <= 0 || !canEditInventory}
            className={`w-full px-4 py-2 rounded ${canEditInventory ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-300 text-gray-600 cursor-not-allowed'}`}
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
                    <p>
                      Total: {inventoryItem.quantity}
                      {inventoryItem.reservedQuantity && inventoryItem.reservedQuantity > 0 && (
                        <span className="text-orange-600"> • Reserved: {inventoryItem.reservedQuantity}</span>
                      )}
                    </p>
                    <p className="font-medium text-green-600">
                      Available: {inventoryItem.quantity - (inventoryItem.reservedQuantity || 0)}
                    </p>
                  </div>
                  {inventoryItem.storageLocation && (
                    <p className="text-xs text-slate-500">📍 {inventoryItem.storageLocation}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={inventoryItem.quantity}
                    onChange={(e) => canEditInventory && handleUpdateQuantity(inventoryItem.itemId, parseInt(e.target.value) || 0)}
                    min="0"
                    className={`w-20 px-2 py-1 border rounded text-sm ${canEditInventory ? 'border-gray-300' : 'border-gray-200 bg-gray-100 cursor-not-allowed'}`}
                    disabled={!canEditInventory}
                  />
                  <button
                    onClick={() => handleRemoveItem(inventoryItem.itemId)}
                    className={`px-2 py-1 text-sm ${canEditInventory ? 'text-red-600 hover:text-red-800' : 'text-gray-300 cursor-not-allowed'}`}
                    disabled={!canEditInventory}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Info Section */}
      {inventory.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-semibold text-green-800 mb-2">💡 Inventory Management</h4>
          <div className="text-sm text-green-700 space-y-2">
            <p>
              Your settlement inventory is stored in the V2 database and shared with all settlement members.
              Changes are saved automatically and will be visible to all collaborators.
            </p>
            <p>
              Use storage locations to organize your items and make them easier to find in-game.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}; 