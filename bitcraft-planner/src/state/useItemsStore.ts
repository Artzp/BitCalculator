import { create } from 'zustand';
import { Item, ItemsData } from '../types/Item';
import { getEffectiveInventoryQuantity } from '../utils/inventoryLogic';

export interface Inventory {
  [itemId: string]: number;
}

export interface BuildListItem {
  itemId: string;
  quantity: number;
  recipeIndex: number;
}

export interface MaterialRequirement {
  itemId: string;
  itemName: string;
  quantity: number;
  tier: number;
  rarity: number;
  isBaseItem: boolean;
  needed: number;
  have: number;
  effectiveHave: number;
  missing: number;
}

interface ItemsStore {
  items: ItemsData;
  searchTerm: string;
  tierFilter: number | null;
  rarityFilter: number | null;
  recipeTypeFilter: 'all' | 'craftable' | 'base' | null;
  professionFilter: string | null;
  isLoading: boolean;
  inventory: Inventory;
  showInventoryManager: boolean;
  buildList: BuildListItem[];
  
  setItems: (items: ItemsData) => void;
  setSearchTerm: (term: string) => void;
  setTierFilter: (tier: number | null) => void;
  setRarityFilter: (rarity: number | null) => void;
  setRecipeTypeFilter: (type: 'all' | 'craftable' | 'base' | null) => void;
  setProfessionFilter: (profession: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  setInventoryItem: (itemId: string, quantity: number) => void;
  removeInventoryItem: (itemId: string) => void;
  clearInventory: () => void;
  setShowInventoryManager: (show: boolean) => void;
  
  // Build list actions
  addToBuildList: (itemId: string, quantity: number, recipeIndex?: number) => void;
  removeFromBuildList: (itemId: string) => void;
  updateBuildListItem: (itemId: string, quantity: number, recipeIndex?: number) => void;
  clearBuildList: () => void;
  
  getFilteredItems: () => [string, Item][];
  getInventoryQuantity: (itemId: string) => number;
  getEffectiveInventoryQuantity: (itemId: string) => number;
  getRequiredMaterials: () => MaterialRequirement[];
  getAllPossibleMaterials: () => MaterialRequirement[];
}

export const useItemsStore = create<ItemsStore>((set, get) => ({
  items: {},
  searchTerm: '',
  tierFilter: null,
  rarityFilter: null,
  recipeTypeFilter: null,
  professionFilter: null,
  isLoading: true,
  inventory: {},
  showInventoryManager: false,
  buildList: [],
  
  setItems: (items) => set({ items }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  setTierFilter: (tier) => set({ tierFilter: tier }),
  setRarityFilter: (rarity) => set({ rarityFilter: rarity }),
  setRecipeTypeFilter: (type) => set({ recipeTypeFilter: type }),
  setProfessionFilter: (profession) => set({ professionFilter: profession }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  setInventoryItem: (itemId, quantity) => set((state) => ({
    inventory: quantity > 0 
      ? { ...state.inventory, [itemId]: quantity }
      : Object.fromEntries(Object.entries(state.inventory).filter(([id]) => id !== itemId))
  })),
  removeInventoryItem: (itemId) => set((state) => ({
    inventory: Object.fromEntries(Object.entries(state.inventory).filter(([id]) => id !== itemId))
  })),
  clearInventory: () => set({ inventory: {} }),
  setShowInventoryManager: (show) => set({ showInventoryManager: show }),
  
  // Build list actions
  addToBuildList: (itemId, quantity, recipeIndex = 0) => set((state) => {
    const existingIndex = state.buildList.findIndex(item => item.itemId === itemId);
    if (existingIndex >= 0) {
      const updatedBuildList = [...state.buildList];
      updatedBuildList[existingIndex] = { 
        ...updatedBuildList[existingIndex], 
        quantity: updatedBuildList[existingIndex].quantity + quantity,
        recipeIndex 
      };
      return { buildList: updatedBuildList };
    } else {
      return { buildList: [...state.buildList, { itemId, quantity, recipeIndex }] };
    }
  }),
  
  removeFromBuildList: (itemId) => set((state) => ({
    buildList: state.buildList.filter(item => item.itemId !== itemId)
  })),
  
  updateBuildListItem: (itemId, quantity, recipeIndex = 0) => set((state) => {
    if (quantity <= 0) {
      return { buildList: state.buildList.filter(item => item.itemId !== itemId) };
    }
    
    const existingIndex = state.buildList.findIndex(item => item.itemId === itemId);
    if (existingIndex >= 0) {
      const updatedBuildList = [...state.buildList];
      updatedBuildList[existingIndex] = { itemId, quantity, recipeIndex };
      return { buildList: updatedBuildList };
    } else {
      return { buildList: [...state.buildList, { itemId, quantity, recipeIndex }] };
    }
  }),
  
  clearBuildList: () => set({ buildList: [] }),
  
  getFilteredItems: () => {
    const { items, searchTerm, tierFilter, rarityFilter, recipeTypeFilter } = get();
    
    return Object.entries(items).filter(([id, item]) => {
      // Search filter
      if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      
      // Tier filter
      if (tierFilter !== null && item.tier !== tierFilter) {
        return false;
      }
      
      // Rarity filter
      if (rarityFilter !== null && item.rarity !== rarityFilter) {
        return false;
      }
      
      // Recipe type filter
      if (recipeTypeFilter) {
        const hasRecipes = item.recipes && item.recipes.length > 0;
        if (recipeTypeFilter === 'craftable' && !hasRecipes) {
          return false;
        }
        if (recipeTypeFilter === 'base' && hasRecipes) {
          return false;
        }
      }
      
      return true;
    });
  },
  
  getInventoryQuantity: (itemId) => {
    const { inventory } = get();
    return inventory[itemId] || 0;
  },
  
  getEffectiveInventoryQuantity: (itemId) => {
    const { items, inventory } = get();
    return getEffectiveInventoryQuantity(items, inventory, itemId);
  },
  
  getRequiredMaterials: () => {
    const { items, buildList, inventory } = get();
    const materialMap = new Map<string, number>();
    
    // Recursive function to process materials
    const processItem = (itemId: string, quantity: number, recipeIndex: number = 0, visited: Set<string> = new Set()) => {
      // Prevent infinite loops
      if (visited.has(itemId)) return;
      visited.add(itemId);
      
      const item = items[itemId];
      if (!item) return;
      
      // If no recipes, this is a base item - add to materials
      if (!item.recipes || item.recipes.length === 0) {
        const currentTotal = materialMap.get(itemId) || 0;
        materialMap.set(itemId, currentTotal + quantity);
        return;
      }
      
      const recipe = item.recipes[recipeIndex] || item.recipes[0];
      if (!recipe) return;
      
      // Calculate how many crafting operations we need
      const craftingOperations = Math.ceil(quantity / recipe.output_quantity);
      
      // Process each ingredient recursively
      recipe.consumed_items.forEach(ingredient => {
        const requiredQuantity = craftingOperations * ingredient.quantity;
        processItem(ingredient.id.toString(), requiredQuantity, 0, new Set(visited));
      });
    };
    
    // Process each item in the build list
    buildList.forEach(buildItem => {
      processItem(buildItem.itemId, buildItem.quantity, buildItem.recipeIndex);
    });
    
    // Convert to MaterialRequirement objects with inventory info
    return Array.from(materialMap.entries()).map(([itemId, quantity]) => {
      const item = items[itemId];
      const have = inventory[itemId] || 0;
      const effectiveHave = getEffectiveInventoryQuantity(items, inventory, itemId);
      const missing = Math.max(0, quantity - effectiveHave);
      
      return {
        itemId,
        itemName: item?.name || 'Unknown Item',
        quantity,
        tier: item?.tier || 0,
        rarity: item?.rarity || 1,
        isBaseItem: !item?.recipes || item.recipes.length === 0,
        needed: quantity,
        have,
        effectiveHave,
        missing
      };
    }).sort((a, b) => a.tier - b.tier || a.itemName.localeCompare(b.itemName));
  },

  getAllPossibleMaterials: () => {
    const { items, buildList, inventory } = get();
    const materialMap = new Map<string, number>();
    
    // Recursive function to collect ALL materials (base + intermediate)
    const processItem = (itemId: string, quantity: number, recipeIndex: number = 0, visited: Set<string> = new Set()) => {
      // Prevent infinite loops
      if (visited.has(itemId)) return;
      visited.add(itemId);
      
      const item = items[itemId];
      if (!item) return;
      
      // Add ALL items to the materials map (both base and intermediate)
      const currentTotal = materialMap.get(itemId) || 0;
      materialMap.set(itemId, currentTotal + quantity);
      
      // If no recipes, this is a base item - stop here
      if (!item.recipes || item.recipes.length === 0) {
        return;
      }
      
      const recipe = item.recipes[recipeIndex] || item.recipes[0];
      if (!recipe) return;
      
      // Calculate how many crafting operations we need
      const craftingOperations = Math.ceil(quantity / recipe.output_quantity);
      
      // Process each ingredient recursively
      recipe.consumed_items.forEach(ingredient => {
        const requiredQuantity = craftingOperations * ingredient.quantity;
        processItem(ingredient.id.toString(), requiredQuantity, 0, new Set(visited));
      });
    };
    
    // Process each item in the build list
    buildList.forEach(buildItem => {
      processItem(buildItem.itemId, buildItem.quantity, buildItem.recipeIndex);
    });
    
    // Convert to MaterialRequirement objects with inventory info
    return Array.from(materialMap.entries()).map(([itemId, quantity]) => {
      const item = items[itemId];
      const have = inventory[itemId] || 0;
      const effectiveHave = getEffectiveInventoryQuantity(items, inventory, itemId);
      const missing = Math.max(0, quantity - effectiveHave);
      
      return {
        itemId,
        itemName: item?.name || 'Unknown Item',
        quantity,
        tier: item?.tier || 0,
        rarity: item?.rarity || 1,
        isBaseItem: !item?.recipes || item.recipes.length === 0,
        needed: quantity,
        have,
        effectiveHave,
        missing
      };
    }).sort((a, b) => a.tier - b.tier || a.itemName.localeCompare(b.itemName));
  },
})); 