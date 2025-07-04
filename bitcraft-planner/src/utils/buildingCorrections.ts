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
  
  // Add more corrections as needed
};

// Items that should likely be at specific buildings based on common sense
const BUILDING_PATTERNS: Record<string, string> = {
  // Smithing-related items
  'Ingot': 'Smithing Station',
  'Molten': 'Smithing Station',
  'Nails': 'Smithing Station',
  'Anvil': 'Smithing Station',
  
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

// Skill-based building defaults
const SKILL_TO_BUILDING: Record<string, string> = {
  'Leatherworking': 'Leatherworking Station',
  'Smithing': 'Smithing Station',
  'Cooking': 'Cooking Station',
  'Farming': 'Farming Station',
  'Fishing': 'Fishing Station',
  'Weaving': 'Weaving Station',
  'Alchemy': 'Alchemy Station',
  'Masonry': 'Masonry Station',
  'Woodworking': 'Woodworking Station',
  'Scholar': 'Scholar Station',
  'Forestry': 'Smithing Station', // Items like Ash, Charcoal are processed at smithing stations
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
  
  // If no original building, try pattern matching
  if (!originalBuilding) {
    // Check skill-based defaults first
    if (skillName && SKILL_TO_BUILDING[skillName]) {
      const baseBuilding = SKILL_TO_BUILDING[skillName];
      return getTieredBuildingName(baseBuilding, tier || 1);
    }
    
    // Then check item name patterns
    for (const [pattern, building] of Object.entries(BUILDING_PATTERNS)) {
      if (itemName.includes(pattern)) {
        return getTieredBuildingName(building, tier || 1);
      }
    }
  }
  
  // Check for obviously wrong combinations
  if (originalBuilding === 'Fishing Station') {
    // Molten metals shouldn't be at fishing station
    if (itemName.includes('Molten') || itemName.includes('Ingot')) {
      return 'Smithing Station';
    }
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