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
      <div className="flex items-center gap-2">
        <button
          onClick={() => onTabClick('calculator')}
          className={`${baseBtn} ${activeTab === 'calculator' ? active : inactive}`}
          aria-current={activeTab === 'calculator' ? 'page' : undefined}
        >
          Bit Calculator
          <span
            className={`absolute left-0 right-0 -bottom-2 h-0.5 rounded-full transition-opacity ${
              activeTab === 'calculator' ? 'bg-brand-600 dark:bg-brand-400 opacity-100' : 'opacity-0'
            }`}
          />
        </button>
        <button
          onClick={() => onTabClick('settlement')}
          className={`${baseBtn} ${activeTab === 'settlement' ? active : inactive}`}
          aria-current={activeTab === 'settlement' ? 'page' : undefined}
        >
          Settlement System
          <span
            className={`absolute left-0 right-0 -bottom-2 h-0.5 rounded-full transition-opacity ${
              activeTab === 'settlement' ? 'bg-brand-600 dark:bg-brand-400 opacity-100' : 'opacity-0'
            }`}
          />
        </button>
      </div>
    </nav>
  );
};
