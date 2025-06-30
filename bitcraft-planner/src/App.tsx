import React, { useEffect, useState } from 'react';
import { useItemsStore } from './state/useItemsStore';
import { ItemsData } from './types/Item';
import ItemList from './components/ItemList';
import ItemDetail from './components/ItemDetail';
import Calculator from './components/Calculator';
import './App.css';

function App() {
  const { 
    setItems, 
    setIsLoading, 
    isLoading, 
    selectedItemId 
  } = useItemsStore();
  
  const [activeTab, setActiveTab] = useState<'recipes' | 'calculator'>('recipes');

  useEffect(() => {
    async function loadItems() {
      try {
        setIsLoading(true);
        const response = await fetch('/data/recipes.json');
        const data: ItemsData = await response.json();
        setItems(data);
      } catch (error) {
        console.error('Failed to load items:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadItems();
  }, [setItems, setIsLoading]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center">
        <div className="text-2xl font-semibold">Loading BitCraft items...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="w-full px-4 py-6">
        <h1 className="text-5xl font-bold text-center mb-8 text-blue-600">
          BitCraft Calculator
        </h1>
        
        {/* Tab Navigation */}
        <div className="flex justify-center mb-8">
          <div className="bg-white rounded-xl p-2 flex shadow-lg border border-slate-200">
            <button
              onClick={() => setActiveTab('recipes')}
              className={`px-8 py-3 rounded-lg font-semibold text-lg transition-all duration-200 ${
                activeTab === 'recipes'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              Recipe Browser
            </button>
            <button
              onClick={() => setActiveTab('calculator')}
              className={`px-8 py-3 rounded-lg font-semibold text-lg transition-all duration-200 ${
                activeTab === 'calculator'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
              }`}
            >
              Material Calculator
            </button>
          </div>
        </div>

        {/* Responsive layout that uses full screen width */}
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)]">
          {/* Items Panel - Fixed width on large screens */}
          <div className="lg:w-96 xl:w-[28rem] 2xl:w-[32rem] flex-shrink-0">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200 h-full">
              <h2 className="text-3xl font-bold mb-6 text-slate-800 border-b border-slate-200 pb-4">Items</h2>
              <ItemList />
            </div>
          </div>
          
          {/* Main Content Panel - Takes remaining space */}
          <div className="flex-1 min-w-0">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200 h-full overflow-auto">
              <h2 className="text-3xl font-bold mb-6 text-slate-800 border-b border-slate-200 pb-4">
                {activeTab === 'recipes' ? 'Recipe Details' : 'Material Calculator'}
              </h2>
              {selectedItemId ? (
                <div className="h-full overflow-auto">
                  {activeTab === 'recipes' ? <ItemDetail /> : <Calculator />}
                </div>
              ) : (
                <div className="flex items-center justify-center h-64">
                  <div className="bg-slate-100 rounded-xl p-8 border border-slate-200">
                    <div className="text-xl text-slate-600">
                      Select an item to {activeTab === 'recipes' ? 'view its recipe details' : 'use the calculator'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 