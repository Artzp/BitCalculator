import React, { useMemo } from 'react';
import { useItemsStore } from '../state/useItemsStore';
import { calculateMaterials } from '../utils/calculator';
import { MaterialRequirement } from '../state/useItemsStore';

const BuildSteps: React.FC = () => {
  const { buildList, items, inventory } = useItemsStore();

  const allMaterials = useMemo(() => {
    const required = buildList.flatMap(buildItem => {
      const result = calculateMaterials(items, buildItem.itemId, buildItem.quantity, buildItem.recipeIndex);
      return result.totalMaterials;
    });

    const materialMap = new Map<string, MaterialRequirement>();
    required.forEach(material => {
      const existing = materialMap.get(material.itemId);
      const quantity = (existing?.quantity || 0) + material.quantity;
      const have = inventory[material.itemId] || 0;
      const needed = Math.max(0, quantity - have);

      materialMap.set(material.itemId, {
        ...material,
        quantity,
        needed,
        have,
        effectiveHave: have, // Assuming effectiveHave is same as have for this view
        missing: needed,
      });
    });
    
    return Array.from(materialMap.values()).sort((a, b) => (a.isBaseItem ? 1 : -1) - (b.isBaseItem ? 1 : -1) || b.tier - a.tier);
  }, [buildList, items, inventory]);

  if (buildList.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500">
        <p className="font-semibold">Your build list is empty</p>
        <p className="text-sm">Add items from the catalog to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {allMaterials.map((material, index) => (
        <div key={index} className="bg-gray-800 p-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-white">{material.itemName}</span>
            <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${material.isBaseItem ? 'bg-green-600 text-green-100' : 'bg-yellow-600 text-yellow-100'}`}>
              {material.isBaseItem ? 'Raw Material' : 'Intermediate'}
            </span>
          </div>
          <div className="text-sm text-gray-400 mt-1">
            Required: {material.quantity.toLocaleString()} | Have: {material.have.toLocaleString()} | <span className="text-red-400">Missing: {material.missing.toLocaleString()}</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BuildSteps; 