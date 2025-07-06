import React, { useState } from 'react';
import { useSettlementStore } from '../state/useSettlementStore';
import { useAuth } from '../hooks/useAuth';
// import SettlementOverview from './SettlementOverview';
// import { PlayerManagement } from './PlayerManagement';
import ProjectManagement from './ProjectManagement';
import { TaskManagement } from './TaskManagement';

import { SimpleInventory } from './SimpleInventory';
import { InventoryReservationDemo } from './InventoryReservationDemo';

const SettlementPage: React.FC = () => {
  const { settlement } = useSettlementStore();
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<'overview' | 'players' | 'projects' | 'tasks' | 'inventory'>('projects');

  const getTabIcon = (view: string) => {
    switch (view) {
      case 'overview': return '🏘️';
      case 'players': return '👥';
      case 'projects': return '🏗️';
      case 'tasks': return '📋';
      case 'inventory': return '📦';
      default: return '📊';
    }
  };

  const getTabLabel = (view: string) => {
    switch (view) {
      case 'overview': return 'Overview';
      case 'players': return 'Players';
      case 'projects': return 'Projects';
      case 'tasks': return 'Tasks';
      case 'inventory': return 'Inventory';
      default: return 'Unknown';
    }
  };

  const getTabCounts = () => {
    if (!settlement) return {};
    
    return {
      players: settlement.players.length,
      projects: settlement.projects.length,
      tasks: settlement.tasks.length,
      inventory: Object.keys(settlement.inventory).length
    };
  };

  const tabs = ['overview', 'players', 'projects', 'tasks', 'inventory'] as const;
  const tabCounts = getTabCounts();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4 rounded-xl mb-4 shadow-lg">
        <h1 className="text-2xl font-bold mb-1">🏘️ Settlement System</h1>
        <p className="text-green-100 text-sm">
          {settlement?.name || 'Loading...'} - Collaborative project management for BitCraft
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 mb-4">
        <div className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveView(tab)}
              className={`flex-shrink-0 flex items-center gap-2 px-4 py-3 font-medium text-sm transition-all duration-200 border-b-2 ${
                activeView === tab
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <span className="text-lg">{getTabIcon(tab)}</span>
              <span>{getTabLabel(tab)}</span>
              {(tabCounts[tab as keyof typeof tabCounts] || 0) > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  activeView === tab
                    ? 'bg-blue-200 text-blue-800'
                    : 'bg-slate-200 text-slate-700'
                }`}>
                  {tabCounts[tab as keyof typeof tabCounts] || 0}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 min-h-0">
        {activeView === 'overview' && <div>Overview - Coming Soon</div>}
        {activeView === 'players' && <div className="p-6 text-center text-gray-500">Player Management - Coming Soon</div>}
        {activeView === 'projects' && <ProjectManagement />}
        {activeView === 'tasks' && <TaskManagement />}
        {activeView === 'inventory' && (
          <div className="space-y-6">
            <InventoryReservationDemo />
            <SimpleInventory />
          </div>
        )}
      </div>
    </div>
  );
};

export default SettlementPage; 