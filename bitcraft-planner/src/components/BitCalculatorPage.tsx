import React from 'react';
import { useItemsStore } from '../state/useItemsStore';
import ItemList from './ItemList';
import BuildList from './BuildList';
import MaterialSummary from './MaterialSummary';
import InventoryInput from './InventoryInput';
import BuildSteps from './BuildSteps';
import RecipeResolverView from './RecipeResolverView';

const BitCalculatorPage: React.FC = () => {
  const { buildList } = useItemsStore();

  return (
    <div className="container mx-auto p-4">
      {/* Personal Inventory Notice */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className="text-green-400 text-xl">🎒</div>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-green-800">Personal BitCraft Calculator</h3>
            <div className="mt-2 text-sm text-green-700">
              <p className="mb-2">
                <strong>This calculator uses your personal inventory</strong> - completely separate from settlement inventories.
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li><strong>Personal Inventory:</strong> Your private crafting materials, not shared with settlements</li>
                <li><strong>Personal Build List:</strong> Your individual crafting projects and planning</li>
                <li><strong>Settlement Work:</strong> For collaborative projects, use the Settlement System instead</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Item List & Inventory */}
        <div className="lg:col-span-5 space-y-6">
          <ItemList showAddToBuilds={true} />
          <InventoryInput />
        </div>
        
        {/* Right Column - Build List & Materials */}
        <div className="lg:col-span-7 space-y-6">
          <BuildList />
          {buildList.length > 0 && (
            <>
              <MaterialSummary />
              <BuildSteps />
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BitCalculatorPage; 