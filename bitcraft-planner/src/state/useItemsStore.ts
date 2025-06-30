import { create } from 'zustand';
import { Item, ItemsData } from '../types/Item';

interface ItemsStore {
  items: ItemsData;
  selectedItemId: string | null;
  searchTerm: string;
  tierFilter: number | null;
  rarityFilter: number | null;
  recipeTypeFilter: 'all' | 'craftable' | 'base' | null;
  professionFilter: string | null;
  isLoading: boolean;
  
  setItems: (items: ItemsData) => void;
  setSelectedItemId: (id: string | null) => void;
  setSearchTerm: (term: string) => void;
  setTierFilter: (tier: number | null) => void;
  setRarityFilter: (rarity: number | null) => void;
  setRecipeTypeFilter: (type: 'all' | 'craftable' | 'base' | null) => void;
  setProfessionFilter: (profession: string | null) => void;
  setIsLoading: (loading: boolean) => void;
  
  getSelectedItem: () => Item | null;
  getFilteredItems: () => [string, Item][];
}

export const useItemsStore = create<ItemsStore>((set, get) => ({
  items: {},
  selectedItemId: null,
  searchTerm: '',
  tierFilter: null,
  rarityFilter: null,
  recipeTypeFilter: null,
  professionFilter: null,
  isLoading: true,
  
  setItems: (items) => set({ items }),
  setSelectedItemId: (id) => set({ selectedItemId: id }),
  setSearchTerm: (term) => set({ searchTerm: term }),
  setTierFilter: (tier) => set({ tierFilter: tier }),
  setRarityFilter: (rarity) => set({ rarityFilter: rarity }),
  setRecipeTypeFilter: (type) => set({ recipeTypeFilter: type }),
  setProfessionFilter: (profession) => set({ professionFilter: profession }),
  setIsLoading: (loading) => set({ isLoading: loading }),
  
  getSelectedItem: () => {
    const { items, selectedItemId } = get();
    return selectedItemId ? items[selectedItemId] || null : null;
  },
  
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
})); 