import json

# Load the raw data files
crafting_recipes = json.load(open('BitCraft_GameData/server/region/crafting_recipe_desc.json'))
building_descriptions = json.load(open('BitCraft_GameData/server/region/building_desc.json'))

# Create a mapping of building IDs to names
building_id_to_name = {}
for building in building_descriptions:
    building_id_to_name[building['id']] = building['name']

# Create a mapping of building types to names (we'll need to analyze this)
building_type_to_name = {
    20: "Cooking Station",
    21: "Smithing Station", 
    22: "Carpentry Station",
    23: "Farming Station",
    24: "Fishing Station",
    25: "Scholar Station",
    26: "Hunting Station",
    27: "Mining Station"
}

# Extract building requirements from recipes
building_requirements = {}
recipe_to_building = {}

for recipe in crafting_recipes[:50]:  # Check first 50 recipes
    recipe_id = recipe.get('id', 'unknown')
    building_reqs = recipe.get('building_requirement', [])
    
    print(f"Recipe ID: {recipe_id}")
    
    if building_reqs and len(building_reqs) >= 2:
        building_id = building_reqs[0]
        building_info = building_reqs[1] if isinstance(building_reqs[1], dict) else {}
        
        building_type = building_info.get('building_type', None)
        tier = building_info.get('tier', 1)
        
        building_name = None
        if building_id and building_id in building_id_to_name:
            building_name = building_id_to_name[building_id]
        elif building_type and building_type in building_type_to_name:
            tier_name = ["", "Rough", "Simple", "Sturdy", "Fine", "Exquisite", "Peerless", "Legendary", "Masterwork", "Magnificent"][tier] if tier < 10 else f"Tier {tier}"
            building_name = f"{tier_name} {building_type_to_name[building_type]}" if tier > 1 else building_type_to_name[building_type]
        
        if building_name:
            print(f"  Required Building: {building_name} (Type: {building_type}, Tier: {tier})")
            recipe_to_building[recipe_id] = {
                'building_type': building_type,
                'building_tier': tier,
                'building_name': building_name
            }
        
    print("---")

print(f"\nExtracted building requirements for {len(recipe_to_building)} recipes")
print("Sample mappings:")
for recipe_id, req in list(recipe_to_building.items())[:10]:
    print(f"  Recipe {recipe_id}: {req['building_name']}")

# Save the mapping
with open('building_requirements_mapping.json', 'w') as f:
    json.dump(recipe_to_building, f, indent=2) 