import React from 'react';

interface TabsProps {
  activeTab: 'calculator' | 'settlement';
  onTabClick: (tab: 'calculator' | 'settlement') => void;
}

export const Tabs: React.FC<TabsProps> = ({ activeTab, onTabClick }) => {
  return (
    <nav className="w-full">
      <div className="grid grid-cols-2 w-full rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/50 shadow-soft overflow-hidden">
        <button
          onClick={() => onTabClick('calculator')}
          className={`w-full px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
            activeTab === 'calculator'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
              : 'bg-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
          aria-current={activeTab === 'calculator' ? 'page' : undefined}
        >
          Bit Calculator
        </button>
        <button
          onClick={() => onTabClick('settlement')}
          className={`w-full px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
            activeTab === 'settlement'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white'
              : 'bg-transparent text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
          aria-current={activeTab === 'settlement' ? 'page' : undefined}
        >
          Settlement System
        </button>
      </div>
    </nav>
  );
};
