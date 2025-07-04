import React, { useState } from 'react';
import { useItemsStore } from '../state/useItemsStore';
import ItemList from './ItemList';
import BuildList from './BuildList';
import MaterialSummary from './MaterialSummary';
import InventoryInput from './InventoryInput';
import BuildSteps from './BuildSteps';

const BitCalculatorPage: React.FC = () => {
  const [activeView, setActiveView] = useState<'steps' | 'materials' | 'inventory'>('steps');
  const { buildList } = useItemsStore();

  return (
    <div className="h-full flex flex-col">
      {/* Header - Compact */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 rounded-xl mb-4 shadow-lg">
        <h1 className="text-2xl font-bold mb-1">🧮 Bit Calculator</h1>
        <p className="text-blue-100 text-sm">
          Plan your builds, manage inventory, and optimize crafting paths
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0">
        {/* Left Panel - Item Selection */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl p-4 shadow-lg border border-slate-200 h-full flex flex-col">
            <h2 className="text-lg font-bold text-slate-800 mb-3 border-b border-slate-200 pb-2">
              📦 Select Items
            </h2>
            <div className="flex-1 min-h-0">
              <ItemList showAddToBuilds={true} />
            </div>
          </div>
        </div>

        {/* Middle Panel - Build List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl p-4 shadow-lg border border-slate-200 h-full flex flex-col">
            <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2">
              <h2 className="text-lg font-bold text-slate-800">
                🎯 Build List
              </h2>
              {buildList.length > 0 && (
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-semibold">
                  {buildList.length}
                </span>
              )}
            </div>
            <div className="flex-1 min-h-0">
              <BuildList />
            </div>
          </div>
        </div>

        {/* Right Panel - Materials & Inventory */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl p-4 shadow-lg border border-slate-200 h-full flex flex-col">
            {/* Tab Navigation - Compact */}
            <div className="flex bg-slate-100 rounded-lg p-0.5 mb-3">
              <button
                onClick={() => setActiveView('steps')}
                className={`flex-1 py-1.5 px-2 rounded-md font-medium text-xs transition-all duration-200 ${
                  activeView === 'steps'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                🔧 Steps
              </button>
              <button
                onClick={() => setActiveView('materials')}
                className={`flex-1 py-1.5 px-2 rounded-md font-medium text-xs transition-all duration-200 ${
                  activeView === 'materials'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                📋 Materials
              </button>
              <button
                onClick={() => setActiveView('inventory')}
                className={`flex-1 py-1.5 px-2 rounded-md font-medium text-xs transition-all duration-200 ${
                  activeView === 'inventory'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-600 hover:text-slate-800'
                }`}
              >
                📦 Inventory
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0">
              {activeView === 'steps' && <BuildSteps />}
              {activeView === 'materials' && <MaterialSummary />}
              {activeView === 'inventory' && <InventoryInput />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BitCalculatorPage; 