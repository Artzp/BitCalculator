#!/usr/bin/env python3
"""
Generate Recipe-Building Mapping JSON
This script creates a comprehensive JSON mapping showing the correlation between
each recipe and its required building.
"""

import json
import os
from collections import defaultdict

def load_crafting_data():
    """Load the crafting data."""
    try:
        with open('../BitPlanner/crafting_data.json', 'r') as f:
            return json.load(f)
    except FileNotFoundError:
        print("Error: Could not find crafting_data.json")
        return None

def generate_recipe_building_mapping(crafting_data):
    """Generate comprehensive recipe-building mapping."""
    
    # Structure: recipe_id -> building_requirement
    recipe_to_building = {}
    
    # Structure: building -> list of recipes
    building_to_recipes = defaultdict(list)
    
    # Structure: item_id -> item_data with building requirements
    item_building_mapping = {}
    
    recipe_counter = 0
    
    print("Processing crafting data...")
    
    for item_id, item_data in crafting_data.items():
        item_name = item_data.get('name', 'Unknown')
        recipes = item_data.get('recipes', [])
        
        item_recipes = []
        
        for recipe_idx, recipe in enumerate(recipes):
            recipe_counter += 1
            recipe_id = f"{item_id}_{recipe_idx}"
            
            building_req = recipe.get('building_requirement')
            skill_req = recipe.get('skill_requirement')
            
            # Recipe-to-building mapping
            recipe_info = {
                'recipe_id': recipe_id,
                'item_id': item_id,
                'item_name': item_name,
                'building_requirement': building_req,
                'skill_requirement': skill_req,
                'output_quantity': recipe.get('output_quantity', 1),
                'consumed_items': recipe.get('consumed_items', []),
                'level_requirements': recipe.get('level_requirements', [])
            }
            
            recipe_to_building[recipe_id] = recipe_info
            
            # Building-to-recipes mapping
            if building_req:
                building_to_recipes[building_req].append(recipe_info)
            else:
                building_to_recipes['No Building Required'].append(recipe_info)
            
            item_recipes.append(recipe_info)
        
        # Item-building mapping
        item_building_mapping[item_id] = {
            'item_id': item_id,
            'item_name': item_name,
            'tier': item_data.get('tier', 0),
            'rarity': item_data.get('rarity', 0),
            'icon': item_data.get('icon', ''),
            'recipes': item_recipes,
            'building_requirements': list(set(r['building_requirement'] for r in item_recipes if r['building_requirement'])),
            'total_recipes': len(item_recipes)
        }
    
    print(f"Processed {recipe_counter} recipes from {len(crafting_data)} items")
    
    return recipe_to_building, dict(building_to_recipes), item_building_mapping

def generate_building_summary(building_to_recipes):
    """Generate summary statistics for buildings."""
    
    building_summary = {}
    
    for building, recipes in building_to_recipes.items():
        # Count unique items
        unique_items = set(r['item_name'] for r in recipes)
        
        # Count by skill requirements
        skill_breakdown = defaultdict(int)
        for recipe in recipes:
            if recipe['skill_requirement']:
                skill_name = recipe['skill_requirement']['skill_name']
                skill_level = recipe['skill_requirement']['skill_level']
                skill_breakdown[f"{skill_name} (Level {skill_level})"] += 1
            else:
                skill_breakdown['No Skill Required'] += 1
        
        # Count by output quantity
        output_breakdown = defaultdict(int)
        for recipe in recipes:
            qty = recipe['output_quantity']
            output_breakdown[f"Output {qty}"] += 1
        
        building_summary[building] = {
            'total_recipes': len(recipes),
            'unique_items': len(unique_items),
            'skill_breakdown': dict(skill_breakdown),
            'output_breakdown': dict(output_breakdown),
            'sample_items': list(unique_items)[:10]  # First 10 items as sample
        }
    
    return building_summary

def export_mappings(recipe_to_building, building_to_recipes, item_building_mapping, building_summary):
    """Export all mappings to JSON files."""
    
    # Main comprehensive mapping
    comprehensive_mapping = {
        'metadata': {
            'total_recipes': len(recipe_to_building),
            'total_buildings': len(building_to_recipes),
            'total_items': len(item_building_mapping),
            'generation_note': 'Recipe-Building correlation mapping for BitCraft'
        },
        'recipe_to_building': recipe_to_building,
        'building_to_recipes': building_to_recipes,
        'item_building_mapping': item_building_mapping,
        'building_summary': building_summary
    }
    
    # Export comprehensive mapping
    with open('recipe_building_comprehensive_mapping.json', 'w') as f:
        json.dump(comprehensive_mapping, f, indent=2)
    
    # Export simplified recipe-to-building mapping
    simplified_recipe_mapping = {
        recipe_id: {
            'item_name': recipe_info['item_name'],
            'building_requirement': recipe_info['building_requirement'],
            'skill_requirement': recipe_info['skill_requirement']
        }
        for recipe_id, recipe_info in recipe_to_building.items()
    }
    
    with open('recipe_to_building_simple.json', 'w') as f:
        json.dump(simplified_recipe_mapping, f, indent=2)
    
    # Export building-to-recipes mapping
    with open('building_to_recipes_mapping.json', 'w') as f:
        json.dump(building_to_recipes, f, indent=2)
    
    # Export building summary
    with open('building_summary.json', 'w') as f:
        json.dump(building_summary, f, indent=2)
    
    print("✅ Generated mapping files:")
    print("  📄 recipe_building_comprehensive_mapping.json - Complete mapping")
    print("  📄 recipe_to_building_simple.json - Simple recipe-to-building mapping")
    print("  📄 building_to_recipes_mapping.json - Building-to-recipes mapping")
    print("  📄 building_summary.json - Building statistics summary")

def main():
    """Main function."""
    
    print("🔄 Loading crafting data...")
    crafting_data = load_crafting_data()
    
    if not crafting_data:
        print("❌ Failed to load crafting data")
        return
    
    print("🔄 Generating recipe-building mappings...")
    recipe_to_building, building_to_recipes, item_building_mapping = generate_recipe_building_mapping(crafting_data)
    
    print("🔄 Generating building summary...")
    building_summary = generate_building_summary(building_to_recipes)
    
    print("🔄 Exporting mappings...")
    export_mappings(recipe_to_building, building_to_recipes, item_building_mapping, building_summary)
    
    print("\n📊 SUMMARY:")
    print(f"  Total Recipes: {len(recipe_to_building)}")
    print(f"  Total Buildings: {len(building_to_recipes)}")
    print(f"  Total Items: {len(item_building_mapping)}")
    
    print("\n🏗️ Top 10 Buildings by Recipe Count:")
    sorted_buildings = sorted(building_to_recipes.items(), key=lambda x: len(x[1]), reverse=True)
    for building, recipes in sorted_buildings[:10]:
        print(f"  {building}: {len(recipes)} recipes")
    
    print("\n✅ Recipe-Building correlation mapping complete!")

if __name__ == "__main__":
    main() 