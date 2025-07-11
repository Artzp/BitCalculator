import React, { useMemo } from 'react';
import { useItemsStore } from '../state/useItemsStore';
import { MaterialRequirement } from '../state/useItemsStore';

const MaterialSummary: React.FC = () => {
  const { getRequiredMaterials, buildList, inventory } = useItemsStore();

  const { rawMaterials, intermediateMaterials } = useMemo(() => {
    const allReqs = getRequiredMaterials();
    return {
      rawMaterials: allReqs.filter(m => m.isBaseItem && m.missing > 0),
      intermediateMaterials: allReqs.filter(m => !m.isBaseItem && m.missing > 0),
    };
  }, [buildList, inventory, getRequiredMaterials]);

  const renderMaterialList = (title: string, materials: MaterialRequirement[]) => {
    if (materials.length === 0) return null;
    return (
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-3 border-b border-gray-700 pb-2">{title}</h3>
        <div className="space-y-2">
          {materials.map((material) => (
            <div key={material.itemId} className="flex justify-between items-center bg-gray-700 p-3 rounded-lg">
              <span className="text-gray-300 font-medium">{material.itemName}</span>
              <div className="text-right">
                <p className="font-mono text-white">{material.missing.toLocaleString()} needed</p>
                <p className="text-xs text-gray-400">Have: {material.have.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (rawMaterials.length === 0 && intermediateMaterials.length === 0 && buildList.length > 0) {
     return <p className="text-gray-400 text-center py-4">All materials accounted for!</p>
  }

  return (
    <div className="space-y-4">
      {renderMaterialList('Raw Materials to Gather', rawMaterials)}
      {renderMaterialList('Intermediate Components to Craft', intermediateMaterials)}
    </div>
  );
};

export default MaterialSummary; 