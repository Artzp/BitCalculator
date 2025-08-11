import React from 'react';

interface TabsProps {
  activeTab: 'calculator' | 'settlement';
  onTabClick: (tab: 'calculator' | 'settlement') => void;
}

export const Tabs: React.FC<TabsProps> = ({ activeTab, onTabClick }) => {
  const baseBtn =
    'relative px-3 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 rounded-md';
  const inactive =
    'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100';
  const active =
    'text-gray-900 dark:text-white';

  return (
    <nav className="w-full">
      <div className="inline-flex items-center justify-center gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200/60 dark:border-gray-700/50 shadow-soft">
        <button
          onClick={() => onTabClick('calculator')}
          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
            activeTab === 'calculator'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-soft'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
          aria-current={activeTab === 'calculator' ? 'page' : undefined}
        >
          Bit Calculator
        </button>
        <button
          onClick={() => onTabClick('settlement')}
          className={`px-3 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/40 ${
            activeTab === 'settlement'
              ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-white shadow-soft'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
          aria-current={activeTab === 'settlement' ? 'page' : undefined}
        >
          Settlement System
        </button>
      </div>
    </nav>
  );
};
