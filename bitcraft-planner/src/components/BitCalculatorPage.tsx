import React, { useState } from 'react';
import { useItemsStore } from '../state/useItemsStore';
import ItemList from './ItemList';
import BuildList from './BuildList';
import MaterialSummary from './MaterialSummary';
import InventoryInput from './InventoryInput';
import BuildSteps from './BuildSteps';

const BitCalculatorPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('summary');
  const { buildList } = useItemsStore();

  return (
    <div className="flex-grow flex flex-col md:flex-row gap-6 p-6 h-[calc(100vh-150px)]">
      {/* Left Panel: Item Catalog */}
      <div className="w-full md:w-5/12 lg:w-4/12 flex flex-col h-full">
        <ItemList showAddToBuilds={true} />
      </div>

      {/* Center Panel: Build Queue */}
      <div className="w-full md:w-3/12 lg:w-3/12 flex flex-col h-full">
        <div className="bg-gray-800 rounded-lg flex-1 flex flex-col text-white">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-bold">Build Queue</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <BuildList />
          </div>
        </div>
      </div>

      {/* Right Panel: Inventory & Requirements */}
      <div className="w-full md:w-4/12 lg:w-5/12 flex flex-col h-full">
        <div className="bg-gray-800 rounded-lg flex-1 flex flex-col text-white">
          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            <TabButton title="Material Summary" activeTab={activeTab} setActiveTab={setActiveTab} tabName="summary" />
            <TabButton title="Inventory" activeTab={activeTab} setActiveTab={setActiveTab} tabName="inventory" />
            <TabButton title="Build Steps" activeTab={activeTab} setActiveTab={setActiveTab} tabName="steps" />
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {buildList.length === 0 ? (
              <div className="flex items-center justify-center h-full text-center text-gray-400">
                <div>
                  <p className="font-semibold text-lg">Your build list is empty</p>
                  <p className="text-sm">Add items from the catalog to get started</p>
                </div>
              </div>
            ) : (
              <>
                {activeTab === 'summary' && <MaterialSummary />}
                {activeTab === 'inventory' && <InventoryInput />}
                {activeTab === 'steps' && <BuildSteps />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const TabButton = ({ title, activeTab, setActiveTab, tabName }: { title: string, activeTab: string, setActiveTab: (name: string) => void, tabName: string }) => (
  <button 
    onClick={() => setActiveTab(tabName)} 
    className={`flex-1 p-3 text-center font-medium text-sm transition-colors focus:outline-none 
      ${activeTab === tabName ? 'text-white border-b-2 border-blue-500' : 'text-gray-400 hover:bg-gray-700 hover:text-white'}`}
  >
    {title}
  </button>
);

export default BitCalculatorPage; 