# Building Types Integration Guide

## Overview

This guide explains how to use the new building types system that was integrated to properly represent building requirements in your BitCraft planner web application.

## What Was Added

### 📄 **New Data Files**
- `src/data/building_summary.json` - Complete building statistics and categorization
- `src/data/recipe_building_mapping.json` - Recipe-to-building correlation mapping

### 🧰 **New Utilities** (`src/utils/buildingTypes.ts`)
- Building type categorization (Crafting, Production, Utility, Specialized)
- Building tier extraction and formatting
- Building type colors and icons for UI
- Helper functions for building data manipulation

### 🎨 **New Components**
- `BuildingRequirement` - Enhanced building display component
- `BuildingSummary` - Building overview and statistics component

## How to Use

### **1. Display Building Requirements**

Replace basic text with the new `BuildingRequirement` component:

```tsx
// OLD: Basic text display
<span className="text-purple-700">🏗️ {buildingName}</span>

// NEW: Enhanced building display
<BuildingRequirement
  buildingName={buildingName}
  compact={true}  // For inline display
  showDetails={false}  // For additional stats
/>
```

### **2. Building Type Functions**

```tsx
import {
  getBuildingBaseType,
  getBuildingTier,
  getBuildingTypeColor,
  getBuildingTypeIcon,
  formatBuildingName
} from '../utils/buildingTypes';

// Extract base building type
const baseType = getBuildingBaseType("Fine Scholar Station"); // "Scholar Station"

// Get building tier
const tier = getBuildingTier("Fine Scholar Station"); // 4

// Get colors for UI
const colorClasses = getBuildingTypeColor("Scholar Station"); 
// "bg-purple-100 text-purple-700 border-purple-200"

// Get appropriate icon
const icon = getBuildingTypeIcon("Scholar Station"); // "📚"

// Format name consistently
const formatted = formatBuildingName("Fine Scholar Station"); 
// "Fine Scholar Station"
```

### **3. Building Categories**

Buildings are automatically categorized:

- **Crafting**: Cooking, Smithing, Carpentry Stations
- **Specialized**: Scholar Station  
- **Production**: Farming, Fishing Stations
- **Utility**: Hunting, Mining Stations

```tsx
import { getBuildingCategory, getBuildingsByCategory } from '../utils/buildingTypes';

const category = getBuildingCategory("Scholar Station"); // "Specialized"
const buildingsByCategory = getBuildingsByCategory();
```

### **4. Building Statistics**

Access comprehensive building data:

```tsx
import { 
  getBuildingRecipeCount, 
  getBuildingUniqueItemCount,
  getBuildingStats 
} from '../utils/buildingTypes';

const recipeCount = getBuildingRecipeCount("Scholar Station"); // Number of recipes
const itemCount = getBuildingUniqueItemCount("Scholar Station"); // Number of unique items
const fullStats = getBuildingStats("Scholar Station"); // Complete statistics object
```

## Component Examples

### **Compact Building Display**
```tsx
<BuildingRequirement
  buildingName="Fine Scholar Station"
  compact={true}
/>
// Displays: 📚 T4 Scholar
```

### **Full Building Display**
```tsx
<BuildingRequirement
  buildingName="Fine Scholar Station"
  showDetails={true}
/>
// Displays: Full name with category and statistics
```

### **Building Overview Page**
```tsx
import BuildingSummary from './components/BuildingSummary';

<BuildingSummary />
// Displays: Complete building overview with filtering and statistics
```

## Data Structure

### **Building Summary Data**
```json
{
  "Scholar Station": {
    "total_recipes": 50,
    "unique_items": 25,
    "skill_breakdown": {
      "Smithing (Level 10)": 50
    },
    "output_breakdown": {
      "Output 1": 49,
      "Output 5": 1
    },
    "sample_items": ["Item1", "Item2", ...]
  }
}
```

### **Recipe-Building Mapping**
```json
{
  "128_0": {
    "item_name": "Deed: Cart",
    "building_requirement": "Cooking Station",
    "skill_requirement": {
      "skill_id": 3,
      "skill_level": 1,
      "skill_name": "Carpentry"
    }
  }
}
```

## Benefits

### **✅ Improved UI**
- Color-coded building types
- Appropriate icons for each building type
- Consistent formatting across the app
- Tier information clearly displayed

### **✅ Better Data Organization**
- Buildings categorized by function
- Comprehensive statistics available
- Proper building type mapping
- Tier-based sorting and filtering

### **✅ Enhanced User Experience**
- Clear building requirements
- Visual distinction between building types
- Building statistics and recipe counts
- Filterable building overview

## Troubleshooting

### **Import Errors**
Make sure the data files are in the correct location:
- `src/data/building_summary.json`
- `src/data/recipe_building_mapping.json`

### **TypeScript Errors**
Ensure all imports are correct and the utility functions are properly typed.

### **Missing Building Data**
If a building doesn't have statistics, it will return default values or null safely.

## Next Steps

1. **Run the app**: `npm start` from the `bitcraft-planner` directory
2. **Test building displays**: Check that building requirements show with proper colors and icons
3. **Explore the Building Summary**: Add the `BuildingSummary` component to see all building statistics
4. **Customize as needed**: Modify colors, icons, or categories in `buildingTypes.ts`

---

**Generated from recipe-building correlation analysis of BitCraft game data** 🎮 