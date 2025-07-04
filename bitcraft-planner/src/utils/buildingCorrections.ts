// Building requirement corrections for obvious data errors
// This fixes cases where items have clearly wrong building requirements

const BUILDING_CORRECTIONS: Record<string, string> = {
  // Molten metals should be at Smithing Station, not Fishing Station
  'Molten Ferralith': 'Smithing Station',
  'Molten Crude Copper': 'Smithing Station',
  'Molten Copper': 'Smithing Station',
  'Molten Tin': 'Smithing Station',
  'Molten Bronze': 'Smithing Station',
  'Molten Iron': 'Smithing Station',
  'Molten Steel': 'Smithing Station',
  'Molten Silver': 'Smithing Station',
  'Molten Gold': 'Smithing Station',
  
  // Wood processing should be at Carpentry Station
  'Rough Wood Log': 'Carpentry Station',
  'Simple Wood Log': 'Carpentry Station',
  'Wood Log': 'Carpentry Station',
  'Plank': 'Carpentry Station',
  'Rough Plank': 'Carpentry Station',
  'Timber': 'Carpentry Station',
  'Rough Timber': 'Carpentry Station',
  
  // Ore Concentrates should be at Smithing Station (game data correction)
  'Ferralith Ore Concentrate': 'Smithing Station',
  
  // Add more corrections as needed
};

// Items that should likely be at specific buildings based on common sense
const BUILDING_PATTERNS: Record<string, string> = {
  // Wood-related items (check first, before mining to avoid conflicts)
  'Wood Log': 'Carpentry Station',
  'Log': 'Carpentry Station',
  'Plank': 'Carpentry Station',
  'Timber': 'Carpentry Station',
  'Wood': 'Carpentry Station',
  
  // Mining-related items
  'Ore': 'Mining Station',
  'Rock': 'Mining Station',
  'Stone': 'Mining Station',
  'Gem': 'Mining Station',
  'Crystal': 'Mining Station',
  
  // Smithing-related items (metals and fire-related)
  'Ingot': 'Smithing Station',
  'Molten': 'Smithing Station',
  'Nails': 'Smithing Station',
  'Anvil': 'Smithing Station',
  'Ash': 'Smithing Station',
  'Charcoal': 'Smithing Station',
  
  // Cooking-related items
  'Bread': 'Cooking Station',
  'Pie': 'Cooking Station',
  'Soup': 'Cooking Station',
  'Stew': 'Cooking Station',
  
  // Fishing-related items
  'Bait': 'Fishing Station',
  'Fish': 'Fishing Station',
  'Chum': 'Fishing Station',
  
  // Leatherworking-related items
  'Pelt': 'Leatherworking Station',
  'Leather': 'Leatherworking Station',
  'Tanned': 'Leatherworking Station',
  'Cleaned': 'Leatherworking Station',
};

// Skill-based building defaults - REMOVED broad Forestry mapping
const SKILL_TO_BUILDING: Record<string, string> = {
  'Leatherworking': 'Leatherworking Station',
  'Smithing': 'Smithing Station',
  'Cooking': 'Cooking Station',
  'Farming': 'Farming Station',
  'Fishing': 'Fishing Station',
  'Weaving': 'Weaving Station',
  'Alchemy': 'Alchemy Station',
  'Masonry': 'Masonry Station',
  'Woodworking': 'Carpentry Station',
  'Carpentry': 'Carpentry Station',
  'Scholar': 'Scholar Station',
  'Mining': 'Mining Station',
  // Note: Forestry removed - too broad, different items need different stations
};

// Function to get tier-appropriate building name
function getTieredBuildingName(baseBuildingName: string, tier: number): string {
  if (tier <= 0) return baseBuildingName;
  
  // Use "Tier X" format to match the game's display
  return `Tier ${tier} ${baseBuildingName}`;
}

export function correctBuildingRequirement(
  itemName: string, 
  originalBuilding: string | null, 
  skillName?: string,
  tier?: number
): string | null {
  // First check for exact name corrections
  if (BUILDING_CORRECTIONS[itemName]) {
    return BUILDING_CORRECTIONS[itemName];
  }
  
  // Check for obviously wrong combinations first
  if (originalBuilding === 'Fishing Station') {
    // Molten metals shouldn't be at fishing station
    if (itemName.includes('Molten') || itemName.includes('Ingot')) {
      return 'Smithing Station';
    }
  }
  
  // If no original building, try to determine the correct one
  if (!originalBuilding) {
    // Check skill-based defaults first (most reliable)
    if (skillName && SKILL_TO_BUILDING[skillName]) {
      const baseBuilding = SKILL_TO_BUILDING[skillName];
      return getTieredBuildingName(baseBuilding, tier || 1);
    }
    
    // Then check item name patterns (ordered by specificity)
    for (const [pattern, building] of Object.entries(BUILDING_PATTERNS)) {
      if (itemName.includes(pattern)) {
        return getTieredBuildingName(building, tier || 1);
      }
    }
    
    // If we still can't determine a building, return null
    // Don't force a building assignment for unclear cases
    return null;
  }
  
  return originalBuilding;
}

export function getBuildingCorrectionInfo(
  itemName: string, 
  originalBuilding: string | null,
  skillName?: string,
  tier?: number
): {
  correctedBuilding: string | null;
  wasCorrected: boolean;
  originalBuilding: string | null;
} {
  const corrected = correctBuildingRequirement(itemName, originalBuilding, skillName, tier);
  return {
    correctedBuilding: corrected,
    wasCorrected: corrected !== originalBuilding,
    originalBuilding: originalBuilding
  };
} 