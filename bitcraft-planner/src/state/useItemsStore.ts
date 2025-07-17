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
  toCraft?: number; // How many we actually need to craft (considering inventory)
}

export interface SmartBuildStep {
  itemId: string;
  itemName: string;
  tier: number;
  isBaseItem: boolean;
  totalNeeded: number;
  haveInInventory: number;
  needToCraft: number;
  ingredients: {
    itemId: string;
    itemName: string;
    quantityPerCraft: number;
    totalNeeded: number;
  }[];
}

interface FilterOptions {
  searchTerm: string;
  tier: number | null;
  rarity: number | null;
  recipeType: 'all' | 'craftable' | 'base' | null;
  profession: string | null;
}

interface SortOptions {
  by: 'name' | 'tier' | 'rarity';
  direction: 'asc' | 'desc';
}

interface ItemsStore {
  items: ItemsData;
  filters: FilterOptions;
  sort: SortOptions;
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
  setInventory: (inventory: Inventory) => void;
  setInventoryItem: (itemId: string, quantity: number) => void;
  removeInventoryItem: (itemId: string) => void;
  clearInventory: () => void;
  setShowInventoryManager: (show: boolean) => void;
  
  // Build list actions
  addToBuildList: (itemId: string, quantity: number, recipeIndex?: number) => void;
  removeFromBuildList: (itemId: string) => void;
  updateBuildListItem: (itemId: string, quantity: number, recipeIndex?: number) => void;
  setBuildList: (buildList: BuildListItem[]) => void;
  clearBuildList: () => void;
  
  // New combined methods
  setFilter: (filter: Partial<FilterOptions>) => void;
  setSort: (sort: Partial<SortOptions>) => void;
  
  getFilteredItems: () => [string, Item][];
  getInventoryQuantity: (itemId: string) => number;
  getEffectiveInventoryQuantity: (itemId: string) => number;
  getRequiredMaterials: () => MaterialRequirement[];
  getAllPossibleMaterials: () => MaterialRequirement[];
  getSmartBuildSteps: () => SmartBuildStep[];
}

export const useItemsStore = create<ItemsStore>((set, get) => ({
  items: {},
  filters: {
    searchTerm: '',
    tier: null,
    rarity: null,
    recipeType: 'craftable',
    profession: null,
  },
  sort: {
    by: 'tier',
    direction: 'asc',
  },
  isLoading: true,
  inventory: {},
  showInventoryManager: false,
  buildList: [],
  
  setItems: (items) => set({ items }),
  // Remove individual filter setters
  setSearchTerm: (term) => set(state => ({ filters: { ...state.filters, searchTerm: term }})),
  setTierFilter: (tier) => set(state => ({ filters: { ...state.filters, tier }})),
  setRarityFilter: (rarity) => set(state => ({ filters: { ...state.filters, rarity }})),
  setRecipeTypeFilter: (type) => set(state => ({ filters: { ...state.filters, recipeType: type }})),
  setProfessionFilter: (profession) => set(state => ({ filters: { ...state.filters, profession }})),
  
  // New combined setters
  setFilter: (newFilters) => set(state => ({
    filters: { ...state.filters, ...newFilters }
  })),
  setSort: (newSort) => set(state => ({
    sort: { ...state.sort, ...newSort }
  })),

  setIsLoading: (loading) => set({ isLoading: loading }),
  setInventory: (inventory) => set({ inventory }),
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
  
  setBuildList: (buildList) => set({ buildList }),
  clearBuildList: () => set({ buildList: [] }),
  
  getFilteredItems: () => {
    const { items, filters, sort } = get();
    
    let filtered = Object.entries(items);
    
    // Apply search filter
    if (filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(([_, item]) => 
        item.name.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply tier filter
    if (filters.tier !== null) {
      filtered = filtered.filter(([_, item]) => item.tier === filters.tier);
    }
    
    // Apply rarity filter
    if (filters.rarity !== null) {
      filtered = filtered.filter(([_, item]) => item.rarity === filters.rarity);
    }
    
    // Apply recipe type filter
    if (filters.recipeType === 'craftable') {
      filtered = filtered.filter(([_, item]) => item.recipes && item.recipes.length > 0);
    } else if (filters.recipeType === 'base') {
      filtered = filtered.filter(([_, item]) => !item.recipes || item.recipes.length === 0);
    }

    // Apply profession filter (future)
    if (filters.profession) {
      // Logic to filter by profession/crafting station
    }
    
    // Apply sorting
    filtered.sort(([, a], [, b]) => {
      let compareResult = 0;
      
      if (sort.by === 'tier') {
        compareResult = a.tier - b.tier;
      } else if (sort.by === 'rarity') {
        compareResult = a.rarity - b.rarity;
      } else { // 'name'
        compareResult = a.name.localeCompare(b.name);
      }
      
      return sort.direction === 'asc' ? compareResult : -compareResult;
    });
    
    return filtered;
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
    const materialMap = new Map<string, { needed: number, toCraft: number }>();
    
    // Smart recursive function that considers inventory
    const processItem = (itemId: string, neededQuantity: number, recipeIndex: number = 0, visited: Set<string> = new Set()) => {
      // Prevent infinite loops
      if (visited.has(itemId)) return;
      visited.add(itemId);
      
      const item = items[itemId];
      if (!item) return;
      
      const currentHave = inventory[itemId] || 0;
      const stillNeed = Math.max(0, neededQuantity - currentHave);
      
      // Track what we need vs what we need to craft
      const current = materialMap.get(itemId) || { needed: 0, toCraft: 0 };
      materialMap.set(itemId, {
        needed: Math.max(current.needed, neededQuantity),
        toCraft: Math.max(current.toCraft, stillNeed)
      });
      
      // If no recipes or we have enough, this is a base item or we're done
      if (!item.recipes || item.recipes.length === 0 || stillNeed <= 0) {
        return;
      }
      
      const recipe = item.recipes[recipeIndex] || item.recipes[0];
      if (!recipe) return;
      
      // Calculate how many crafting operations we actually need (not total needed)
      const craftingOperations = Math.ceil(stillNeed / recipe.output_quantity);
      
      // Process each ingredient recursively - only for what we need to craft
      recipe.consumed_items.forEach(ingredient => {
        const requiredQuantity = craftingOperations * ingredient.quantity;
        if (requiredQuantity > 0) {
          processItem(ingredient.id.toString(), requiredQuantity, 0, new Set(visited));
        }
      });
    };
    
    // Process each item in the build list
    buildList.forEach(buildItem => {
      processItem(buildItem.itemId, buildItem.quantity, buildItem.recipeIndex);
    });
    
    // Convert to MaterialRequirement objects with smart inventory calculations
    return Array.from(materialMap.entries()).map(([itemId, data]) => {
      const item = items[itemId];
      const have = inventory[itemId] || 0;
      const effectiveHave = getEffectiveInventoryQuantity(items, inventory, itemId);
      const actuallyNeed = Math.max(0, data.needed - effectiveHave);
      
      return {
        itemId,
        itemName: item?.name || 'Unknown Item',
        quantity: data.needed, // Total needed for the build
        tier: item?.tier || 0,
        rarity: item?.rarity || 1,
        isBaseItem: !item?.recipes || item.recipes.length === 0,
        needed: data.needed,
        have,
        effectiveHave,
        missing: actuallyNeed,
        toCraft: data.toCraft // How many we actually need to craft
      };
    }).sort((a, b) => {
      // Sort by completion status first, then by tier (higher tier first for crafting order)
      const aComplete = a.missing === 0;
      const bComplete = b.missing === 0;
      if (aComplete !== bComplete) {
        return aComplete ? 1 : -1;
      }
      // Base items last
      if (a.isBaseItem !== b.isBaseItem) {
        return a.isBaseItem ? 1 : -1;
      }
      // Higher tier first (craft dependencies first)
      if (a.tier !== b.tier) {
        return b.tier - a.tier;
      }
      return a.itemName.localeCompare(b.itemName);
    });
  },

  // Smart build steps that consider inventory at each level
  getSmartBuildSteps: () => {
    const { items, buildList, inventory } = get();
    const craftingSteps = new Map<string, { 
      itemId: string, 
      itemName: string, 
      totalNeeded: number, 
      haveInInventory: number, 
      needToCraft: number,
      tier: number,
      isBaseItem: boolean,
      ingredients: Array<{ itemId: string, itemName: string, quantityPerCraft: number, totalNeeded: number }>
    }>();
    
    // Recursive function that considers inventory at each step
    const processItemSmart = (itemId: string, neededQuantity: number, recipeIndex: number = 0, visited: Set<string> = new Set()) => {
      if (visited.has(itemId)) return;
      visited.add(itemId);
      
      const item = items[itemId];
      if (!item) return;
      
      const haveInInventory = inventory[itemId] || 0;
      const stillNeed = Math.max(0, neededQuantity - haveInInventory);
      
      // Always track what we need (even if we have enough)
      const existing = craftingSteps.get(itemId);
      if (existing) {
        existing.totalNeeded += neededQuantity;
        existing.needToCraft = Math.max(0, existing.totalNeeded - existing.haveInInventory);
      } else {
        craftingSteps.set(itemId, {
          itemId,
          itemName: item.name,
          totalNeeded: neededQuantity,
          haveInInventory,
          needToCraft: stillNeed,
          tier: item.tier,
          isBaseItem: !item.recipes || item.recipes.length === 0,
          ingredients: []
        });
      }
      
      // If we have enough in inventory, we don't need to craft or process ingredients
      if (stillNeed <= 0) {
        return;
      }
      
      // If no recipes, this is a base item - we need to gather it
      if (!item.recipes || item.recipes.length === 0) {
        return;
      }
      
      const recipe = item.recipes[recipeIndex] || item.recipes[0];
      if (!recipe) return;
      
      // Calculate how many crafting operations we need for the missing quantity
      const craftingOperations = Math.ceil(stillNeed / recipe.output_quantity);
      
      // Store ingredient info for this crafting step
      const stepInfo = craftingSteps.get(itemId)!;
      stepInfo.ingredients = recipe.consumed_items.map(ingredient => ({
        itemId: ingredient.id.toString(),
        itemName: items[ingredient.id.toString()]?.name || 'Unknown',
        quantityPerCraft: ingredient.quantity,
        totalNeeded: craftingOperations * ingredient.quantity
      }));
      
      // Process each ingredient recursively
      recipe.consumed_items.forEach(ingredient => {
        const requiredQuantity = craftingOperations * ingredient.quantity;
        processItemSmart(ingredient.id.toString(), requiredQuantity, 0, new Set(visited));
      });
    };
    
    // Process each item in the build list
    buildList.forEach(buildItem => {
      processItemSmart(buildItem.itemId, buildItem.quantity, buildItem.recipeIndex);
    });
    
    // Convert to array and sort by crafting priority (base items first, then by tier)
    return Array.from(craftingSteps.values())
      .filter(step => step.needToCraft > 0) // Only show items we actually need to craft/gather
      .sort((a, b) => {
        // Base items first (need to gather)
        if (a.isBaseItem !== b.isBaseItem) {
          return a.isBaseItem ? -1 : 1;
        }
        // Then by tier (lower tier first - craft dependencies first)
        if (a.tier !== b.tier) {
          return a.tier - b.tier;
        }
        // Finally by name
        return a.itemName.localeCompare(b.itemName);
      });
  },
})); 