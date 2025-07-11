import React from 'react';

interface TabsProps {
  activeTab: 'calculator' | 'settlement';
  onTabClick: (tab: 'calculator' | 'settlement') => void;
}

export const Tabs: React.FC<TabsProps> = ({ activeTab, onTabClick }) => {
  return (
    <div className="flex justify-center my-4">
      <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg">
        <button
          onClick={() => onTabClick('calculator')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            activeTab === 'calculator'
              ? 'bg-white text-gray-800 shadow'
              : 'text-gray-600 hover:bg-gray-300'
          }`}
        >
          Bit Calculator
        </button>
        <button
          onClick={() => onTabClick('settlement')}
          className={`px-4 py-2 text-sm font-medium rounded-md ${
            activeTab === 'settlement'
              ? 'bg-white text-gray-800 shadow'
              : 'text-gray-600 hover:bg-gray-300'
          }`}
        >
          Settlement System
        </button>
      </div>
    </div>
  );
};
