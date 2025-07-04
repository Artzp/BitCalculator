import React from 'react';
import {
  getBuildingBaseType,
  getBuildingTier,
  getBuildingTierName,
  getBuildingTypeColor,
  getBuildingTypeIcon,
  getBuildingCategory,
  getBuildingRecipeCount,
  getBuildingUniqueItemCount,
  formatBuildingName
} from '../utils/buildingTypes';

interface BuildingRequirementProps {
  buildingName: string | null;
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

const BuildingRequirement: React.FC<BuildingRequirementProps> = ({
  buildingName,
  showDetails = false,
  compact = false,
  className = ''
}) => {
  if (!buildingName) {
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 ${className}`}>
        🏗️ No Building Required
      </span>
    );
  }

  const baseType = getBuildingBaseType(buildingName);
  const tier = getBuildingTier(buildingName);
  const tierName = getBuildingTierName(buildingName);
  const colorClasses = getBuildingTypeColor(buildingName);
  const icon = getBuildingTypeIcon(buildingName);
  const category = getBuildingCategory(buildingName);
  const formattedName = formatBuildingName(buildingName);

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border ${colorClasses} ${className}`}>
        {icon}
        {tier > 1 ? `T${tier}` : ''} {baseType?.replace(' Station', '') || 'Building'}
      </span>
    );
  }

  const content = (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium border ${colorClasses} ${className}`}>
      <span className="text-sm">{icon}</span>
      <div className="flex flex-col">
        <span className="font-semibold">{formattedName}</span>
        {showDetails && (
          <span className="text-xs opacity-75">{category}</span>
        )}
      </div>
      {tier > 1 && (
        <span className="ml-1 px-1 py-0.5 rounded bg-white bg-opacity-50 text-xs font-bold">
          T{tier}
        </span>
      )}
    </div>
  );

  if (showDetails) {
    const recipeCount = getBuildingRecipeCount(buildingName);
    const uniqueItemCount = getBuildingUniqueItemCount(buildingName);

    return (
      <div className="space-y-1">
        {content}
        {(recipeCount > 0 || uniqueItemCount > 0) && (
          <div className="flex gap-2 text-xs text-gray-600">
            {recipeCount > 0 && (
              <span className="bg-gray-100 px-1.5 py-0.5 rounded">
                📋 {recipeCount} recipes
              </span>
            )}
            {uniqueItemCount > 0 && (
              <span className="bg-gray-100 px-1.5 py-0.5 rounded">
                📦 {uniqueItemCount} items
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return content;
};

export default BuildingRequirement; 