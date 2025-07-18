import React, { useState } from 'react';
import { useItemsStore } from '../state/useItemsStore';
import ItemList from './ItemList';
import BuildList from './BuildList';
import MaterialSummary from './MaterialSummary';
import InventoryInput from './InventoryInput';
import BuildSteps from './BuildSteps';

const BitCalculatorPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('summary');
  const [catalogCollapsed, setCatalogCollapsed] = useState(false);
  const [mobileView, setMobileView] = useState('catalog'); // 'catalog', 'queue', 'results'
  const { buildList, getRequiredMaterials } = useItemsStore();

  const materials = getRequiredMaterials();
  const totalMaterialTypes = Object.keys(materials).length;
  const hasItems = buildList.length > 0;

  return (
    <div className="flex-grow flex flex-col h-[calc(100vh-120px)] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, #3b82f6 0%, transparent 50%), 
                           radial-gradient(circle at 75% 75%, #8b5cf6 0%, transparent 50%)`,
          backgroundSize: '100px 100px'
        }}></div>
      </div>
      {/* Mobile Navigation */}
      <div className="md:hidden bg-slate-800/90 backdrop-blur-sm border-b border-slate-700 p-3 flex-shrink-0">
        <div className="flex gap-2">
          <MobileNavButton 
            active={mobileView === 'catalog'} 
            onClick={() => setMobileView('catalog')}
            icon="📚"
            label="Catalog"
          />
          <MobileNavButton 
            active={mobileView === 'queue'} 
            onClick={() => setMobileView('queue')}
            icon="🔨"
            label="Queue"
            badge={buildList.length}
          />
          <MobileNavButton 
            active={mobileView === 'results'} 
            onClick={() => setMobileView('results')}
            icon="📊"
            label="Results"
            badge={totalMaterialTypes}
          />
        </div>
      </div>

      <div className="flex-1 flex gap-4 p-4 min-h-0 overflow-hidden">
        {/* Left Panel: Item Catalog */}
        <div className={`transition-all duration-300 ease-in-out flex flex-col h-full ${
          catalogCollapsed 
            ? 'w-16 md:flex hidden' 
            : 'w-full md:w-[450px] lg:w-[500px] xl:w-[520px] 2xl:w-[600px]'
        } ${mobileView !== 'catalog' ? 'hidden md:flex' : 'flex'}`}>
          
          {catalogCollapsed ? (
            <CollapsedCatalog onExpand={() => setCatalogCollapsed(false)} />
          ) : (
            <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50 flex-1 flex flex-col shadow-xl min-h-0">
              <div className="p-4 border-b border-slate-700/50 flex items-center justify-between flex-shrink-0">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  📚 Item Catalog
                </h2>
                <button
                  onClick={() => setCatalogCollapsed(true)}
                  className="hidden md:flex p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition-all"
                  title="Collapse catalog"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-hidden">
                <ItemList showAddToBuilds={true} />
              </div>
            </div>
          )}
        </div>

        {/* Center Panel: Build Queue */}
        <div className={`flex flex-col h-full transition-all duration-300 min-h-0 ${
          catalogCollapsed ? 'w-full md:w-[400px] lg:w-[420px] xl:w-[480px]' : 'w-full md:w-[350px] lg:w-96 xl:w-[400px]'
        } ${mobileView !== 'queue' ? 'hidden md:flex' : 'flex'}`}>
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50 flex-1 flex flex-col shadow-xl min-h-0">
            <div className="p-4 border-b border-slate-700/50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  🔨 Build Queue
                  {buildList.length > 0 && (
                    <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      {buildList.length}
                    </span>
                  )}
                </h2>
                {buildList.length > 0 && (
                  <div className="text-xs text-slate-400">
                    {buildList.reduce((sum, item) => sum + item.quantity, 0)} total items
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden">
              {buildList.length === 0 ? (
                <div className="flex items-center justify-center h-full text-center text-slate-400 p-6">
                  <div>
                    <div className="text-4xl mb-3">🎯</div>
                    <p className="font-semibold text-lg">Queue is empty</p>
                    <p className="text-sm mt-1">Add items from the catalog</p>
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-y-auto p-4">
                  <BuildList />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Results & Analysis */}
        <div className={`flex-1 flex flex-col h-full min-w-0 min-h-0 ${
          mobileView !== 'results' ? 'hidden md:flex' : 'flex'
        }`}>
          <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50 flex-1 flex flex-col shadow-xl min-h-0">
            {/* Enhanced Tabs */}
            <div className="flex border-b border-slate-700/50 bg-slate-900/50 flex-shrink-0">
              <TabButton 
                title="Summary" 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                tabName="summary"
                icon="📊"
                badge={totalMaterialTypes > 0 ? totalMaterialTypes : undefined}
                disabled={!hasItems}
              />
              <TabButton 
                title="Inventory" 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                tabName="inventory"
                icon="📦"
                disabled={!hasItems}
              />
              <TabButton 
                title="Build Steps" 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
                tabName="steps"
                icon="🔧"
                disabled={!hasItems}
              />
            </div>

            {/* Tab Content */}
            <div className="flex-1 min-h-0 overflow-hidden">
              {!hasItems ? (
                <EmptyState />
              ) : (
                <div className="h-full overflow-y-auto p-4">
                  {activeTab === 'summary' && <MaterialSummary />}
                  {activeTab === 'inventory' && <InventoryInput />}
                  {activeTab === 'steps' && <BuildSteps />}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mobile Navigation Button Component
const MobileNavButton = ({ active, onClick, icon, label, badge }: {
  active: boolean;
  onClick: () => void;
  icon: string;
  label: string;
  badge?: number;
}) => (
  <button
    onClick={onClick}
    className={`flex-1 flex flex-col items-center gap-1 p-3 rounded-lg transition-all relative ${
      active 
        ? 'bg-blue-500 text-white shadow-lg' 
        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white'
    }`}
  >
    <span className="text-lg">{icon}</span>
    <span className="text-xs font-medium">{label}</span>
    {badge !== undefined && badge > 0 && (
      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
        {badge}
      </span>
    )}
  </button>
);

// Collapsed Catalog Component
const CollapsedCatalog = ({ onExpand }: { onExpand: () => void }) => (
  <div className="bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-700/50 flex-1 flex flex-col shadow-xl">
    <button
      onClick={onExpand}
      className="flex-1 flex flex-col items-center justify-center gap-3 p-4 text-slate-400 hover:text-white hover:bg-slate-700/30 transition-all rounded-xl group"
      title="Expand catalog"
    >
      <div className="text-2xl group-hover:scale-110 transition-transform">📚</div>
      <div className="writing-mode-vertical text-sm font-medium">Catalog</div>
      <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
);

// Empty State Component
const EmptyState = () => (
  <div className="flex items-center justify-center h-full text-center text-slate-400 p-8">
    <div className="max-w-sm">
      <div className="text-6xl mb-4 opacity-50">🎯</div>
      <h3 className="font-semibold text-xl text-slate-300 mb-2">Ready to build something?</h3>
      <p className="text-sm text-slate-400 mb-6">
        Add items from the catalog to see material requirements, inventory tracking, and step-by-step build instructions.
      </p>
      <div className="flex items-center justify-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <span>📊</span>
          <span>Material Summary</span>
        </div>
        <div className="flex items-center gap-1">
          <span>📦</span>
          <span>Inventory</span>
        </div>
        <div className="flex items-center gap-1">
          <span>🔧</span>
          <span>Build Steps</span>
        </div>
      </div>
    </div>
  </div>
);

// Enhanced Tab Button Component
const TabButton = ({ title, activeTab, setActiveTab, tabName, icon, badge, disabled }: {
  title: string;
  activeTab: string;
  setActiveTab: (name: string) => void;
  tabName: string;
  icon?: string;
  badge?: number | string;
  disabled?: boolean;
}) => (
  <button
    onClick={() => !disabled && setActiveTab(tabName)}
    disabled={disabled}
    className={`flex-1 p-4 text-center font-medium text-sm transition-all focus:outline-none relative flex items-center justify-center gap-2 ${
      disabled
        ? 'text-slate-500 cursor-not-allowed'
        : activeTab === tabName 
          ? 'text-white bg-slate-700/50 border-b-2 border-blue-500' 
          : 'text-slate-300 hover:bg-slate-700/30 hover:text-white'
    }`}
  >
    {icon && <span className="text-base">{icon}</span>}
    <span>{title}</span>
    {badge !== undefined && (typeof badge === 'number' ? badge > 0 : badge !== '') && !disabled && (
      <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-bold min-w-[20px] h-5 flex items-center justify-center">
        {badge}
      </span>
    )}
  </button>
);

export default BitCalculatorPage; 