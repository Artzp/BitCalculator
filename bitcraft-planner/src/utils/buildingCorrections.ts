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
};

export function correctBuildingRequirement(itemName: string, originalBuilding: string | null): string | null {
  // First check for exact name corrections
  if (BUILDING_CORRECTIONS[itemName]) {
    return BUILDING_CORRECTIONS[itemName];
  }
  
  // If no original building, try pattern matching
  if (!originalBuilding) {
    for (const [pattern, building] of Object.entries(BUILDING_PATTERNS)) {
      if (itemName.includes(pattern)) {
        return building;
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

export function getBuildingCorrectionInfo(itemName: string, originalBuilding: string | null): {
  correctedBuilding: string | null;
  wasCorrected: boolean;
  originalBuilding: string | null;
} {
  const corrected = correctBuildingRequirement(itemName, originalBuilding);
  return {
    correctedBuilding: corrected,
    wasCorrected: corrected !== originalBuilding,
    originalBuilding: originalBuilding
  };
} 