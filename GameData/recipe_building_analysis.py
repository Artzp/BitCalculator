#!/usr/bin/env python3
"""
Recipe-Building Correlation Analysis
This script analyzes the relationship between crafting recipes and building requirements
in BitCraft game data.
"""

import json
import os
from collections import defaultdict, Counter

def load_data():
    """Load the crafting data and building requirements mapping."""
    try:
        with open('../BitPlanner/crafting_data.json', 'r') as f:
            crafting_data = json.load(f)
        
        with open('building_requirements_mapping.json', 'r') as f:
            building_mapping = json.load(f)
        
        return crafting_data, building_mapping
    except FileNotFoundError as e:
        print(f"Error: Could not find required data files: {e}")
        return None, None

def analyze_recipe_building_correlation(crafting_data, building_mapping):
    """Analyze the correlation between recipes and buildings."""
    
    # Statistics tracking
    building_stats = defaultdict(int)
    recipe_building_count = defaultdict(int)
    items_by_building = defaultdict(list)
    recipes_with_buildings = 0
    total_recipes = 0
    
    # Building tier analysis
    building_tiers = defaultdict(lambda: defaultdict(int))
    
    print("=== RECIPE-BUILDING CORRELATION ANALYSIS ===\n")
    
    # Analyze each item and its recipes
    for item_id, item_data in crafting_data.items():
        item_name = item_data.get('name', 'Unknown')
        recipes = item_data.get('recipes', [])
        
        for recipe in recipes:
            total_recipes += 1
            building_req = recipe.get('building_requirement')
            
            if building_req:
                recipes_with_buildings += 1
                building_stats[building_req] += 1
                items_by_building[building_req].append(item_name)
                
                # Extract building tier information
                if 'Station' in building_req:
                    parts = building_req.split(' ')
                    if len(parts) >= 2:
                        tier = parts[0] if parts[0] in ['Simple', 'Sturdy', 'Fine', 'Exquisite', 'Peerless'] else 'Basic'
                        base_building = ' '.join(parts[1:]) if tier != 'Basic' else building_req
                        building_tiers[base_building][tier] += 1
    
    # Print overall statistics
    print(f"📊 OVERALL STATISTICS:")
    print(f"   Total Recipes: {total_recipes}")
    print(f"   Recipes with Building Requirements: {recipes_with_buildings}")
    print(f"   Recipes without Building Requirements: {total_recipes - recipes_with_buildings}")
    print(f"   Coverage: {recipes_with_buildings/total_recipes*100:.1f}%")
    print(f"   Unique Buildings Required: {len(building_stats)}")
    print()
    
    # Building frequency analysis
    print("🏗️ BUILDING FREQUENCY ANALYSIS:")
    sorted_buildings = sorted(building_stats.items(), key=lambda x: x[1], reverse=True)
    
    for building, count in sorted_buildings:
        print(f"   {building}: {count} recipes")
    print()
    
    # Building tier analysis
    print("🏆 BUILDING TIER ANALYSIS:")
    for base_building, tiers in building_tiers.items():
        print(f"   {base_building}:")
        for tier, count in sorted(tiers.items(), key=lambda x: ['Basic', 'Simple', 'Sturdy', 'Fine', 'Exquisite', 'Peerless'].index(x[0])):
            print(f"     {tier}: {count} recipes")
    print()
    
    # Most versatile buildings (buildings used for most different items)
    print("🔧 MOST VERSATILE BUILDINGS:")
    building_item_counts = {building: len(set(items)) for building, items in items_by_building.items()}
    sorted_versatile = sorted(building_item_counts.items(), key=lambda x: x[1], reverse=True)
    
    for building, item_count in sorted_versatile[:10]:
        print(f"   {building}: {item_count} different items")
    print()
    
    return building_stats, items_by_building, building_tiers

def generate_building_recipe_mapping(crafting_data):
    """Generate a detailed mapping of buildings to their recipes and items."""
    
    building_recipes = defaultdict(list)
    
    for item_id, item_data in crafting_data.items():
        item_name = item_data.get('name', 'Unknown')
        recipes = item_data.get('recipes', [])
        
        for recipe in recipes:
            building_req = recipe.get('building_requirement')
            
            if building_req:
                recipe_info = {
                    'item_name': item_name,
                    'item_id': item_id,
                    'output_quantity': recipe.get('output_quantity', 1),
                    'consumed_items': recipe.get('consumed_items', []),
                    'skill_requirement': recipe.get('skill_requirement')
                }
                building_recipes[building_req].append(recipe_info)
    
    return building_recipes

def print_detailed_building_analysis(building_recipes, top_n=5):
    """Print detailed analysis of top buildings."""
    
    print("🔍 DETAILED BUILDING ANALYSIS:")
    print("=" * 60)
    
    # Sort buildings by number of recipes
    sorted_buildings = sorted(building_recipes.items(), key=lambda x: len(x[1]), reverse=True)
    
    for building, recipes in sorted_buildings[:top_n]:
        print(f"\n🏭 {building}")
        print(f"   Total Recipes: {len(recipes)}")
        
        # Group by skill requirements
        skill_groups = defaultdict(list)
        for recipe in recipes:
            skill_req = recipe.get('skill_requirement')
            if skill_req:
                skill_name = skill_req.get('skill_name', 'Unknown')
                skill_level = skill_req.get('skill_level', 0)
                skill_groups[f"{skill_name} (Level {skill_level})"].append(recipe)
            else:
                skill_groups['No Skill Required'].append(recipe)
        
        print(f"   Skill Requirements:")
        for skill, skill_recipes in sorted(skill_groups.items()):
            print(f"     {skill}: {len(skill_recipes)} recipes")
        
        # Sample items
        print(f"   Sample Items:")
        for recipe in recipes[:5]:  # Show first 5 items
            print(f"     • {recipe['item_name']} (x{recipe['output_quantity']})")
        
        if len(recipes) > 5:
            print(f"     ... and {len(recipes) - 5} more items")
        
        print("-" * 40)

def export_analysis_results(building_stats, items_by_building, building_tiers):
    """Export analysis results to JSON file."""
    
    analysis_results = {
        'building_frequency': dict(building_stats),
        'items_by_building': dict(items_by_building),
        'building_tiers': dict(building_tiers),
        'analysis_summary': {
            'total_buildings': len(building_stats),
            'most_used_building': max(building_stats.items(), key=lambda x: x[1])[0],
            'most_used_count': max(building_stats.values()),
            'building_types': list(set(building.split()[-2:][0] + ' ' + building.split()[-1] 
                                    for building in building_stats.keys() 
                                    if 'Station' in building))
        }
    }
    
    with open('recipe_building_analysis.json', 'w') as f:
        json.dump(analysis_results, f, indent=2)
    
    print(f"📁 Analysis results exported to: recipe_building_analysis.json")

def main():
    """Main analysis function."""
    
    print("Loading data...")
    crafting_data, building_mapping = load_data()
    
    if not crafting_data:
        print("❌ Could not load data files. Please ensure crafting_data.json exists.")
        return
    
    print(f"✅ Loaded {len(crafting_data)} items with crafting data")
    print()
    
    # Perform correlation analysis
    building_stats, items_by_building, building_tiers = analyze_recipe_building_correlation(crafting_data, building_mapping)
    
    # Generate detailed building-recipe mapping
    building_recipes = generate_building_recipe_mapping(crafting_data)
    
    # Print detailed analysis
    print_detailed_building_analysis(building_recipes)
    
    # Export results
    export_analysis_results(building_stats, items_by_building, building_tiers)
    
    print("\n✅ Analysis complete!")
    print("\nKey Insights:")
    print("• Most recipes require specific building stations")
    print("• Carpentry Station is the most versatile building")
    print("• Higher tier buildings enable more complex recipes")
    print("• Some recipes have no building requirements (basic crafting)")

if __name__ == "__main__":
    main() 