export const CARGO_OFFSET = 0xffffffff;

export const RARITY_COLORS = {
  1: 'text-gray-400',
  2: 'text-green-400',
  3: 'text-blue-400',
  4: 'text-purple-400',
  5: 'text-yellow-400',
} as const;

export const RARITY_NAMES = {
  1: 'Common',
  2: 'Uncommon',
  3: 'Rare',
  4: 'Epic',
  5: 'Legendary',
} as const;

// Re-export building types for convenience
export {
  BUILDING_CATEGORIES,
  BUILDING_TYPES,
  BUILDING_TIERS,
  BUILDING_TYPE_COLORS,
  BUILDING_TYPE_ICONS
} from './buildingTypes'; 