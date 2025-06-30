import React from 'react';
import { useItemsStore } from '../state/useItemsStore';

interface RecipeTreeProps {
  itemId: string;
  quantity: number;
  recipeIndex?: number;
  depth?: number;
}

interface SkillSummary {
  [skillName: string]: number; // skill name -> max level required
}

const RecipeTree: React.FC<RecipeTreeProps> = ({ 
  itemId, 
  quantity, 
  recipeIndex = 0, 
  depth = 0 
}) => {
  const { items } = useItemsStore();
  const item = items[itemId];

  // Function to collect all skill requirements from the entire recipe tree
  const collectSkillRequirements = (itemId: string, recipeIndex: number = 0, visited: Set<string> = new Set()): SkillSummary => {
    const skillSummary: SkillSummary = {};
    
    // Prevent infinite loops
    if (visited.has(itemId)) {
      return skillSummary;
    }
    visited.add(itemId);
    
    const item = items[itemId];
    if (!item || !item.recipes || item.recipes.length === 0) {
      return skillSummary;
    }
    
    const recipe = item.recipes[recipeIndex];
    if (!recipe) {
      return skillSummary;
    }
    
    // Add current recipe's skill requirement
    if (recipe.skill_requirement) {
      const skillName = recipe.skill_requirement.skill_name;
      const skillLevel = recipe.skill_requirement.skill_level;
      skillSummary[skillName] = Math.max(skillSummary[skillName] || 0, skillLevel);
    }
    
    // Recursively collect from ingredients
    if (recipe.consumed_items) {
      recipe.consumed_items.forEach(ingredient => {
        const ingredientSkills = collectSkillRequirements(ingredient.id.toString(), 0, new Set(visited));
        Object.entries(ingredientSkills).forEach(([skillName, level]) => {
          skillSummary[skillName] = Math.max(skillSummary[skillName] || 0, level);
        });
      });
    }
    
    return skillSummary;
  };

  // Color coding for different depth levels
  const getItemStyle = (depth: number) => {
    const styles = [
      { bg: 'bg-blue-100', text: 'text-blue-900', border: 'border-blue-300' },      // Root level
      { bg: 'bg-emerald-100', text: 'text-emerald-900', border: 'border-emerald-300' }, // Level 1
      { bg: 'bg-amber-100', text: 'text-amber-900', border: 'border-amber-300' },   // Level 2
      { bg: 'bg-purple-100', text: 'text-purple-900', border: 'border-purple-300' }, // Level 3
      { bg: 'bg-rose-100', text: 'text-rose-900', border: 'border-rose-300' },      // Level 4
      { bg: 'bg-cyan-100', text: 'text-cyan-900', border: 'border-cyan-300' },      // Level 5+
    ];
    return styles[Math.min(depth, styles.length - 1)];
  };

  const getConnectorColor = (depth: number) => {
    const colors = [
      'border-blue-400',      // Root level
      'border-emerald-400',   // Level 1
      'border-amber-400',     // Level 2
      'border-purple-400',    // Level 3
      'border-rose-400',      // Level 4
      'border-cyan-400',      // Level 5+
    ];
    return colors[Math.min(depth, colors.length - 1)];
  };

  // Calculate indentation based on depth
  const getIndentation = (depth: number) => {
    return depth * 24; // 24px per level
  };

  // Determine operation type based on skill and building requirements
  const getOperationType = (recipe: any) => {
    if (recipe.building_requirement) {
      return { icon: '🏭', label: recipe.building_requirement, bgColor: 'bg-purple-600' };
    }
    
    if (recipe.skill_requirement) {
      const skillName = recipe.skill_requirement.skill_name.toLowerCase();
      
      // Extraction/gathering operations
      if (skillName.includes('forestry')) {
        return { icon: '🌲', label: 'Forestry (logging)', bgColor: 'bg-green-600' };
      } else if (skillName.includes('mining')) {
        return { icon: '⛏️', label: 'Mining (extraction)', bgColor: 'bg-amber-600' };
      } else if (skillName.includes('fishing')) {
        return { icon: '🎣', label: 'Fishing', bgColor: 'bg-blue-600' };
      } else if (skillName.includes('farming')) {
        return { icon: '🌾', label: 'Farming (growing)', bgColor: 'bg-green-600' };
      } else if (skillName.includes('foraging')) {
        return { icon: '🍄', label: 'Foraging (gathering)', bgColor: 'bg-emerald-600' };
      } else if (skillName.includes('hunting')) {
        return { icon: '🏹', label: 'Hunting', bgColor: 'bg-red-600' };
      } else {
        // Other crafting skills without buildings (hand crafted)
        return { icon: '✋', label: 'Hand crafted', bgColor: 'bg-gray-500' };
      }
    }
    
    return { icon: '✋', label: 'Hand crafted', bgColor: 'bg-gray-500' };
  };

  if (!item) {
    return (
      <div 
        className="flex items-center gap-3 p-4 bg-red-50 border-2 border-red-300 rounded-lg"
        style={{ marginLeft: `${getIndentation(depth)}px` }}
      >
        <span className="text-red-800 font-semibold">⚠️ Missing Item (ID: {itemId})</span>
        <span className="text-red-600 font-bold bg-red-200 px-3 py-1 rounded">× {quantity.toLocaleString()}</span>
      </div>
    );
  }

  // If no recipes, this is a base item
  if (!item.recipes || item.recipes.length === 0) {
    const style = getItemStyle(depth);
    return (
      <div 
        className={`flex items-center justify-between gap-4 p-4 ${style.bg} ${style.text} border-2 ${style.border} rounded-lg shadow-sm`}
        style={{ marginLeft: `${getIndentation(depth)}px` }}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-bold text-lg">{item.name}</span>
            {depth === 0 && <span className="text-sm opacity-70 bg-white bg-opacity-50 px-2 py-1 rounded-full">(Base item)</span>}
          </div>
          <div className="text-sm opacity-80 mt-1">
            📦 Base material - no crafting required
          </div>
        </div>
        <span className="font-bold text-lg bg-white bg-opacity-50 px-3 py-2 rounded">× {quantity.toLocaleString()}</span>
      </div>
    );
  }

  const recipe = item.recipes[recipeIndex];
  if (!recipe) {
    return (
      <div 
        className="flex items-center gap-3 p-4 bg-red-50 border-2 border-red-300 rounded-lg"
        style={{ marginLeft: `${getIndentation(depth)}px` }}
      >
        <span className="text-red-800 font-semibold">⚠️ Invalid recipe index</span>
      </div>
    );
  }

  const style = getItemStyle(depth);
  const operationType = getOperationType(recipe);

  // Generate skill summary only for root level (depth === 0)
  const skillSummary = depth === 0 ? collectSkillRequirements(itemId, recipeIndex) : {};
  const hasSkillRequirements = depth === 0 && Object.keys(skillSummary).length > 0;

  return (
    <div>
      {/* Skill Requirements Summary - only show at root level */}
      {hasSkillRequirements && (
        <div className="mb-4 p-4 bg-indigo-50 border-2 border-indigo-200 rounded-lg">
          <h3 className="text-lg font-bold text-indigo-900 mb-3">📋 Required Skills Summary</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(skillSummary)
              .sort(([, a], [, b]) => b - a) // Sort by level descending
              .map(([skillName, maxLevel]) => (
                <div
                  key={skillName}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full font-medium text-sm"
                >
                  <span>⭐</span>
                  <span>{skillName} {maxLevel}</span>
                </div>
              ))}
          </div>
          <p className="text-sm text-indigo-700 mt-2 italic">
            Maximum skill levels required across all recipe steps
          </p>
        </div>
      )}

      {/* Current item */}
      <div 
        className={`flex items-center justify-between gap-4 mb-3 p-4 ${style.bg} ${style.text} border-2 ${style.border} rounded-lg shadow-sm`}
        style={{ marginLeft: `${getIndentation(depth)}px` }}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="font-bold text-xl">{item.name}</span>
            {depth === 0 && (
              <span className="text-sm bg-white bg-opacity-50 px-3 py-1 rounded-full">
                (Produces {recipe.output_quantity})
              </span>
            )}
          </div>
          
          {/* Operation type and skill requirement display */}
          <div className="flex items-center gap-3 mt-2 text-sm">
            <div className={`flex items-center gap-2 ${operationType.bgColor} bg-opacity-90 text-white px-3 py-1 rounded-full font-medium`}>
              <span>{operationType.icon}</span>
              <span>{operationType.label}</span>
            </div>
            
            {/* Skill requirement */}
            {recipe.skill_requirement && (
              <div className="bg-blue-600 bg-opacity-90 text-white px-3 py-1 rounded-full font-medium">
                <span>⭐ {recipe.skill_requirement.skill_name} {recipe.skill_requirement.skill_level}</span>
              </div>
            )}
          </div>
        </div>
        <span className="font-bold text-xl bg-white bg-opacity-50 px-4 py-2 rounded">× {quantity.toLocaleString()}</span>
      </div>

      {/* Ingredients with connecting lines */}
      {recipe.consumed_items.length > 0 && (
        <div className="relative">
          {recipe.consumed_items.map((ingredient, index) => {
            const ingredientQuantity = Math.ceil((quantity / recipe.output_quantity) * ingredient.quantity);
            const isLast = index === recipe.consumed_items.length - 1;
            
            return (
              <div key={ingredient.id} className="relative">
                {/* Connecting line */}
                <div 
                  className={`absolute top-0 w-6 border-l-2 border-t-2 ${getConnectorColor(depth)} rounded-tl-lg`}
                  style={{ 
                    left: `${getIndentation(depth) + 16}px`,
                    height: isLast ? '24px' : '100%'
                  }}
                />
                
                {/* Vertical line for non-last items */}
                {!isLast && (
                  <div 
                    className={`absolute top-6 bottom-0 w-0 border-l-2 ${getConnectorColor(depth)}`}
                    style={{ left: `${getIndentation(depth) + 16}px` }}
                  />
                )}
                
                {/* Ingredient item */}
                <div className="pt-6">
                  <RecipeTree
                    itemId={ingredient.id.toString()}
                    quantity={ingredientQuantity}
                    depth={depth + 1}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RecipeTree; 