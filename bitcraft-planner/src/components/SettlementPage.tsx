import React, { useState, useEffect } from 'react';
import { useSettlementStore } from '../state/useSettlementStore';
import { useAuth } from '../hooks/useAuth';
// import SettlementOverview from './SettlementOverview';
import { PlayerManagement } from './PlayerManagement';
import ProjectManagement from './ProjectManagement';
import { TaskManagement } from './TaskManagement';

import { SimpleInventory } from './SimpleInventory';
import { InventoryReservationDemo } from './InventoryReservationDemo';
import { DatabaseDebugger } from './DatabaseDebugger';
import { isAdmin } from '../utils/adminCheck';

const SettlementPage: React.FC = () => {
  const { settlement } = useSettlementStore();
  const { user } = useAuth();
  const [activeView, setActiveView] = useState<string>('projects');
  const [userIsAdmin, setUserIsAdmin] = useState<boolean>(false);

  // Update admin status when user changes
  useEffect(() => {
    const adminStatus = isAdmin();
    setUserIsAdmin(adminStatus);
    
    // Debug logging
    console.log('🔍 Admin Status Check:', {
      user: user?.email || 'Not logged in',
      userId: user?.uid || 'No UID',
      isAdmin: adminStatus,
      timestamp: new Date().toISOString()
    });
  }, [user]);

  const getTabIcon = (view: string) => {
    switch (view) {
      case 'overview': return '🏘️';
      case 'players': return '👥';
      case 'projects': return '🏗️';
      case 'tasks': return '📋';
      case 'inventory': return '📦';
      case 'debug': return '🔍';
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
      case 'debug': return 'Debug';
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

  const baseTabs = ['overview', 'players', 'projects', 'tasks', 'inventory'];
  const tabs = userIsAdmin ? [...baseTabs, 'debug'] : baseTabs;
  const tabCounts = getTabCounts();

  // Debug logging for tab generation
  useEffect(() => {
    console.log('🔍 Tab Generation Debug:', {
      userIsAdmin,
      totalTabs: tabs.length,
      tabs: tabs,
      hasDebugTab: tabs.includes('debug' as any)
    });
  }, [userIsAdmin, tabs]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-blue-600 text-white p-4 rounded-xl mb-4 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
              🏘️ Settlement System
              {userIsAdmin && (
                <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full">
                  🔑 ADMIN
                </span>
              )}
            </h1>
            <p className="text-green-100 text-sm">
              {settlement?.name || 'Loading...'} - Collaborative project management for BitCraft
            </p>
            {userIsAdmin && (
              <p className="text-yellow-200 text-xs mt-1">
                Admin access enabled for: {user?.email}
              </p>
            )}
          </div>
        </div>
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
        {activeView === 'players' && <PlayerManagement />}
        {activeView === 'projects' && <ProjectManagement />}
        {activeView === 'tasks' && <TaskManagement />}
        {activeView === 'inventory' && (
          <div className="space-y-6">
            <InventoryReservationDemo />
            <SimpleInventory />
          </div>
        )}
        {activeView === 'debug' && <DatabaseDebugger />}
      </div>
    </div>
  );
};

export default SettlementPage; 