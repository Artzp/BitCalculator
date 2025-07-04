import buildingSummary from '../data/building_summary.json';

// Building type categories
export const BUILDING_CATEGORIES = {
  CRAFTING: 'Crafting',
  PRODUCTION: 'Production',
  UTILITY: 'Utility',
  SPECIALIZED: 'Specialized'
} as const;

// Building type mappings
export const BUILDING_TYPES = {
  COOKING: 'Cooking Station',
  SMITHING: 'Smithing Station',
  CARPENTRY: 'Carpentry Station',
  SCHOLAR: 'Scholar Station',
  FARMING: 'Farming Station',
  FISHING: 'Fishing Station',
  HUNTING: 'Hunting Station',
  MINING: 'Mining Station'
} as const;

// Building tier names
export const BUILDING_TIERS = {
  0: 'Basic',
  1: 'Basic',
  2: 'Simple',
  3: 'Sturdy',
  4: 'Fine',
  5: 'Exquisite',
  6: 'Peerless',
  7: 'Legendary',
  8: 'Masterwork',
  9: 'Magnificent',
  10: 'Tier 10'
} as const;

// Building type colors for UI
export const BUILDING_TYPE_COLORS = {
  'Cooking Station': 'bg-orange-100 text-orange-700 border-orange-200',
  'Smithing Station': 'bg-red-100 text-red-700 border-red-200',
  'Carpentry Station': 'bg-amber-100 text-amber-700 border-amber-200',
  'Scholar Station': 'bg-purple-100 text-purple-700 border-purple-200',
  'Farming Station': 'bg-green-100 text-green-700 border-green-200',
  'Fishing Station': 'bg-blue-100 text-blue-700 border-blue-200',
  'Hunting Station': 'bg-slate-100 text-slate-700 border-slate-200',
  'Mining Station': 'bg-gray-100 text-gray-700 border-gray-200'
} as const;

// Building type icons
export const BUILDING_TYPE_ICONS = {
  'Cooking Station': '🍳',
  'Smithing Station': '⚒️',
  'Carpentry Station': '🪵',
  'Scholar Station': '📚',
  'Farming Station': '🌾',
  'Fishing Station': '🎣',
  'Hunting Station': '🏹',
  'Mining Station': '⛏️'
} as const;

// Helper functions
export const getBuildingBaseType = (buildingName: string | null): string | null => {
  if (!buildingName) return null;
  
  // Extract base building type from full name (e.g., "Fine Scholar Station" -> "Scholar Station")
  const baseBuildingTypes = Object.values(BUILDING_TYPES);
  return baseBuildingTypes.find(type => buildingName.includes(type.replace(' Station', ''))) || null;
};

export const getBuildingTier = (buildingName: string | null): number => {
  if (!buildingName) return 0;
  
  // Extract tier from building name
  const tierKeywords = [
    'Tier 10', 'Magnificent', 'Masterwork', 'Legendary', 'Peerless', 
    'Exquisite', 'Fine', 'Sturdy', 'Simple'
  ];
  
  for (let i = 0; i < tierKeywords.length; i++) {
    if (buildingName.includes(tierKeywords[i])) {
      return 10 - i; // Tier 10 is highest, Basic is lowest
    }
  }
  
  return 1; // Default to Basic (tier 1)
};

export const getBuildingTierName = (buildingName: string | null): string => {
  const tier = getBuildingTier(buildingName);
  return BUILDING_TIERS[tier as keyof typeof BUILDING_TIERS] || 'Basic';
};

export const getBuildingTypeColor = (buildingName: string | null): string => {
  const baseType = getBuildingBaseType(buildingName);
  if (!baseType) return 'bg-gray-100 text-gray-700 border-gray-200';
  
  return BUILDING_TYPE_COLORS[baseType as keyof typeof BUILDING_TYPE_COLORS] || 'bg-gray-100 text-gray-700 border-gray-200';
};

export const getBuildingTypeIcon = (buildingName: string | null): string => {
  const baseType = getBuildingBaseType(buildingName);
  if (!baseType) return '🏗️';
  
  return BUILDING_TYPE_ICONS[baseType as keyof typeof BUILDING_TYPE_ICONS] || '🏗️';
};

export const getBuildingCategory = (buildingName: string | null): string => {
  const baseType = getBuildingBaseType(buildingName);
  
  switch (baseType) {
    case 'Cooking Station':
    case 'Smithing Station':
    case 'Carpentry Station':
      return BUILDING_CATEGORIES.CRAFTING;
    case 'Scholar Station':
      return BUILDING_CATEGORIES.SPECIALIZED;
    case 'Farming Station':
    case 'Fishing Station':
      return BUILDING_CATEGORIES.PRODUCTION;
    case 'Hunting Station':
    case 'Mining Station':
      return BUILDING_CATEGORIES.UTILITY;
    default:
      return BUILDING_CATEGORIES.UTILITY;
  }
};

export const formatBuildingName = (buildingName: string | null): string => {
  if (!buildingName) return 'No Building Required';
  
  const baseType = getBuildingBaseType(buildingName);
  const tier = getBuildingTier(buildingName);
  const tierName = getBuildingTierName(buildingName);
  
  if (tier === 1) {
    return baseType || buildingName;
  }
  
  return `${tierName} ${baseType || buildingName}`;
};

export const getBuildingStats = (buildingName: string | null) => {
  if (!buildingName) return null;
  
  const summary = buildingSummary as Record<string, any>;
  return summary[buildingName] || null;
};

export const getAllBuildingTypes = (): string[] => {
  const summary = buildingSummary as Record<string, any>;
  return Object.keys(summary).filter(name => name !== 'No Building Required');
};

export const getBuildingsByCategory = (): Record<string, string[]> => {
  const allBuildings = getAllBuildingTypes();
  const categories: Record<string, string[]> = {};
  
  allBuildings.forEach(building => {
    const category = getBuildingCategory(building);
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(building);
  });
  
  return categories;
};

export const getBuildingRecipeCount = (buildingName: string | null): number => {
  const stats = getBuildingStats(buildingName);
  return stats?.total_recipes || 0;
};

export const getBuildingUniqueItemCount = (buildingName: string | null): number => {
  const stats = getBuildingStats(buildingName);
  return stats?.unique_items || 0;
}; 