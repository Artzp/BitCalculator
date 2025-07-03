import React, { useEffect } from 'react';
import { useItemsStore } from './state/useItemsStore';
import { ItemsData } from './types/Item';
import BitCalculatorPage from './components/BitCalculatorPage';
import './App.css';

function App() {
  const { 
    setItems, 
    setIsLoading, 
    isLoading
  } = useItemsStore();

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
        
        {/* Main Application - Bit Calculator */}
        <div className="h-[calc(100vh-200px)]">
          <BitCalculatorPage />
        </div>
      </div>
    </div>
  );
}

export default App; 