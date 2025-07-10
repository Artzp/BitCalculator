import { ItemsData, Item } from '../types/Item';
import { Inventory } from '../state/useItemsStore';

/**
 * INVENTORY SEPARATION UTILITIES
 * 
 * This file ensures clear separation between:
 * 1. Personal Inventory - used in BitCalculator for individual planning
 * 2. Settlement Inventory - used in Settlement System for collaborative work
 */

// ===== PERSONAL INVENTORY OPERATIONS =====
// These functions work with useItemsStore inventory

export function getEffectiveInventoryQuantity(items: ItemsData, personalInventory: Inventory, itemId: string): number {
  const directQuantity = personalInventory[itemId] || 0;
  const item = items[itemId];
  
  if (!item || !item.recipes || item.recipes.length === 0) {
    return directQuantity;
  }
  
  const recipe = item.recipes[0];
  
  if (!recipe.consumed_items || recipe.consumed_items.length === 0) {
    return directQuantity;
  }
  
  const maxFromIngredients = recipe.consumed_items.reduce((min: number, input) => {
    const inputQuantity = getEffectiveInventoryQuantity(items, personalInventory, input.id.toString());
    const possibleCrafts = Math.floor(inputQuantity / input.quantity);
    return Math.min(min, possibleCrafts);
  }, Infinity);
  
  const additionalFromCrafting = maxFromIngredients === Infinity ? 0 : maxFromIngredients;
  
  return directQuantity + additionalFromCrafting;
}

/**
 * Validates that personal inventory operations don't access settlement data
 */
export function validatePersonalInventoryOperation(context: string, inventory: any): boolean {
  if (!inventory) return true;
  
  // Check if this looks like settlement inventory (has settlement-specific structure)
  const hasSettlementStructure = Object.values(inventory).some((item: any) => 
    item && typeof item === 'object' && 
    ('reservedQuantity' in item || 'storageLocation' in item || 'lastUpdated' in item)
  );
  
  if (hasSettlementStructure) {
    console.error(`❌ INVENTORY SEPARATION ERROR: ${context} is trying to use settlement inventory structure!`);
    console.error('Personal inventory should be simple { itemId: quantity } objects');
    return false;
  }
  
  return true;
}

// ===== SETTLEMENT INVENTORY OPERATIONS =====
// These functions work with settlement inventory structure

export interface SettlementInventoryItem {
  quantity: number;
  reservedQuantity: number;
  storageLocation?: string;
  lastUpdated?: any; // Firebase Timestamp
  itemName?: string;
  itemId?: string;
}

export interface SettlementInventoryData {
  [itemId: string]: SettlementInventoryItem;
}

/**
 * Get available quantity from settlement inventory (total - reserved)
 */
export function getSettlementAvailableQuantity(settlementInventory: SettlementInventoryData, itemId: string): number {
  const item = settlementInventory[itemId];
  if (!item) return 0;
  
  return Math.max(0, item.quantity - (item.reservedQuantity || 0));
}

/**
 * Validates that settlement inventory operations don't access personal data
 */
export function validateSettlementInventoryOperation(context: string, inventory: any): boolean {
  if (!inventory) return true;
  
  // Check if this looks like personal inventory (simple number values)
  const hasPersonalStructure = Object.values(inventory).some((item: any) => 
    typeof item === 'number'
  );
  
  if (hasPersonalStructure) {
    console.error(`❌ INVENTORY SEPARATION ERROR: ${context} is trying to use personal inventory structure!`);
    console.error('Settlement inventory should have { quantity, reservedQuantity, ... } structure');
    return false;
  }
  
  return true;
}

/**
 * Convert settlement inventory to format expected by calculators
 */
export function convertSettlementInventoryForCalculations(settlementInventory: SettlementInventoryData): { [itemId: string]: { quantity: number; reservedQuantity: number } } {
  const result: { [itemId: string]: { quantity: number; reservedQuantity: number } } = {};
  
  Object.entries(settlementInventory).forEach(([itemId, item]) => {
    result[itemId] = {
      quantity: item.quantity,
      reservedQuantity: item.reservedQuantity || 0
    };
  });
  
  return result;
}

/**
 * INVENTORY SYSTEM SUMMARY:
 * 
 * PERSONAL INVENTORY (BitCalculator):
 * - Structure: { [itemId]: number }
 * - Storage: useItemsStore
 * - Usage: Individual crafting calculations
 * - Access: User's personal data only
 * 
 * SETTLEMENT INVENTORY (Settlement System):
 * - Structure: { [itemId]: { quantity, reservedQuantity, storageLocation?, lastUpdated? } }
 * - Storage: Firebase settlement documents
 * - Usage: Collaborative project calculations
 * - Access: Shared among settlement members
 */ 