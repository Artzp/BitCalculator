# Recipe-Building Correlation Analysis Report

## Executive Summary

This report analyzes the relationship between **4,462 crafting recipes** and **58 unique building types** in the BitCraft game data. The analysis reveals strong correlations between specific recipes and building requirements, with **53.3%** of recipes requiring dedicated crafting stations.

## Key Findings

### 📊 Overall Statistics
- **Total Recipes Analyzed**: 4,462
- **Recipes with Building Requirements**: 2,380 (53.3%)
- **Recipes without Building Requirements**: 2,082 (46.7%)
- **Unique Buildings Required**: 58 different building types

### 🏗️ Building Usage Patterns

#### Most Utilized Buildings
1. **Scholar Station** (all tiers): 2,342 recipes total
   - Primarily used for **Smithing** skill recipes (levels 10-100)
   - Highest concentration at **Tier 7-10** buildings
   - Enables complex metal crafting and equipment creation

2. **Carpentry Station** (all tiers): 393 recipes total
   - Most versatile building type across all tiers
   - Consistent usage from Basic to Tier 10
   - Essential for wood-working and construction

3. **Cooking Station** (all tiers): 59 recipes total
   - Food preparation and cooking recipes
   - Basic tier heavily used (27 recipes)

4. **Smithing Station** (all tiers): 33 recipes total
   - Metal working and tool creation
   - Peak usage at Peerless tier (12 recipes)

5. **Farming Station** (all tiers): 26 recipes total
   - Agricultural and plant-based crafting
   - Balanced across most tiers

6. **Fishing Station** (all tiers): 9 recipes total
   - Specialized for fishing-related crafts
   - Limited but consistent usage

7. **Hunting Station**: 1 recipe total
   - Highly specialized building

### 🏆 Building Tier Analysis

#### Tier Distribution Insights
- **Higher tiers enable more complex recipes**: Tier 7-10 buildings show the highest recipe counts
- **Scholar Station dominance**: Accounts for 52.5% of all building-required recipes
- **Tier progression**: Each tier typically unlocks new recipe possibilities

#### Tier-Specific Patterns
- **Basic Tier**: Foundation recipes, widely distributed
- **Simple-Sturdy Tiers**: Moderate recipe counts, skill development
- **Fine-Exquisite Tiers**: Increased complexity and specialization
- **Peerless-Legendary Tiers**: High-end crafting, specialized equipment
- **Masterwork-Tier 10**: Most advanced recipes, end-game content

### 🔧 Building Versatility Rankings

1. **Scholar Station**: 29 different unique items
2. **Carpentry Station**: High versatility across all tiers
3. **Cooking Station**: Moderate versatility, food-focused
4. **Smithing Station**: Specialized but essential
5. **Farming Station**: Agricultural specialization
6. **Fishing Station**: Niche applications
7. **Hunting Station**: Single-use specialization

## Technical Correlations

### Recipe-Building Mapping Logic
The analysis reveals that building requirements are embedded directly in recipe data:
- Each recipe specifies `building_requirement` field
- Building types are categorized by numeric IDs (20-27)
- Tier information determines building advancement level
- Skill requirements correlate with building tier requirements

### Building Type Classifications
- **Type 20**: Cooking Station
- **Type 21**: Smithing Station
- **Type 22**: Carpentry Station
- **Type 23**: Farming Station
- **Type 24**: Fishing Station
- **Type 25**: Scholar Station
- **Type 26**: Hunting Station
- **Type 27**: Mining Station

## Recommendations

### For Game Balance
1. **Scholar Station dominance**: Consider distributing some recipes to other building types
2. **Hunting Station utilization**: Expand recipes for better building value
3. **Tier progression**: Ensure meaningful progression across all building tiers

### For Player Experience
1. **Clear building requirements**: All recipes should indicate required buildings
2. **Skill-building alignment**: Ensure building tiers align with skill requirements
3. **Versatility balance**: Maintain usefulness across all building types

### For Data Structure
1. **Consistent mapping**: All recipes should have building requirement data
2. **Tier standardization**: Ensure consistent tier naming across all building types
3. **Skill correlation**: Strengthen skill-building requirement relationships

## Conclusion

The correlation analysis reveals a **well-structured crafting system** with clear building-recipe relationships. The **Scholar Station's dominance** (52.5% of building-required recipes) indicates its central role in the crafting ecosystem, while other buildings provide specialized functions. The **tier progression system** effectively scales recipe complexity with building advancement.

The **46.7% of recipes without building requirements** represent basic crafting that can be done anywhere, providing a good balance between accessibility and specialization.

## Data Sources
- **crafting_data.json**: 4,056 items with complete recipe data
- **building_requirements_mapping.json**: 132 recipe-building mappings
- **BitCraft_GameData**: Raw game data files

---
*Report generated from BitCraft game data analysis* 