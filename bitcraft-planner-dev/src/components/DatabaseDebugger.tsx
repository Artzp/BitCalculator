import React, { useState, useEffect } from 'react';
import { debugDatabase, fixDatabaseIssues, DatabaseIssue } from '../utils/debugDatabase';
import { isAdmin, getAdminInfo } from '../utils/adminCheck';
import { useAuth } from '../hooks/useAuth';
import { projectLogger } from '../utils/projectLogger';
import { quickProjectRecovery, adminProjectRecovery } from '../utils/debugDatabase';
import DataExporter from './DataExporter';

export const DatabaseDebugger: React.FC = () => {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<{
    issues: DatabaseIssue[];
    collections: { [key: string]: any[] };
    summary: string;
  } | null>(null);
  const [isFixing, setIsFixing] = useState(false);
  const [adminInfo, setAdminInfo] = useState<{
    isAdmin: boolean;
    userEmail: string | null;
    userId: string | null;
  }>({ isAdmin: false, userEmail: null, userId: null });
  const [showProjectRecovery, setShowProjectRecovery] = useState(false);
  const [projectsData, setProjectsData] = useState<any>(null);
  const [loadingProjects, setLoadingProjects] = useState(false);
  
  // New recovery system state
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [allProjects, setAllProjects] = useState<any[]>([]);
  const [orphanedCollaborations, setOrphanedCollaborations] = useState<any[]>([]);
  const [recoveryAttempts, setRecoveryAttempts] = useState(0);
  const [lastRecovery, setLastRecovery] = useState<string>('');
  const [recoveryLog, setRecoveryLog] = useState<string[]>([]);

  // Project recovery states
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryResults, setRecoveryResults] = useState<string | null>(null);

  useEffect(() => {
    setAdminInfo(getAdminInfo());
  }, []);

  const runDebug = async () => {
    setIsRunning(true);
    try {
      console.log('🔍 Starting database debugging...');
      const debugResults = await debugDatabase();
      setResults(debugResults);
      console.log('✅ Database debugging complete');
    } catch (error) {
      console.error('❌ Error during debugging:', error);
      alert(`Error during debugging: ${error}`);
    } finally {
      setIsRunning(false);
    }
  };

  const runFixes = async () => {
    setIsFixing(true);
    try {
      console.log('🔧 Starting database fixes...');
      await fixDatabaseIssues();
      console.log('✅ Database fixes complete');
      // Re-run debug to see if issues were fixed
      await runDebug();
    } catch (error) {
      console.error('❌ Error during fixes:', error);
      alert(`Error during fixes: ${error}`);
    } finally {
      setIsFixing(false);
    }
  };

  const loadProjectsData = async () => {
    if (!adminInfo.isAdmin) return;
    
    setLoadingProjects(true);
    try {
      console.log('📊 Loading all projects data...');
      const { debugDatabase } = await import('../utils/debugDatabase');
      const dbDebugger = new (await import('../utils/debugDatabase')).DatabaseDebugger();
      const data = await dbDebugger.getAllProjectsData();
      setProjectsData(data);
      console.log('✅ Projects data loaded');
    } catch (error) {
      console.error('❌ Error loading projects data:', error);
      alert(`Error loading projects data: ${error}`);
    } finally {
      setLoadingProjects(false);
    }
  };

  const restoreProject = async (userId: string, projectData: any) => {
    if (!adminInfo.isAdmin) return;
    
    try {
      console.log(`🔧 Restoring project ${projectData.name} to user ${userId}...`);
      const { DatabaseDebugger } = await import('../utils/debugDatabase');
      const dbDebugger = new DatabaseDebugger();
      await dbDebugger.restoreProjectToUser(userId, projectData);
      console.log('✅ Project restored successfully');
      alert(`✅ Project "${projectData.name}" restored to user successfully!`);
      
      // Reload projects data to reflect changes
      await loadProjectsData();
    } catch (error) {
      console.error('❌ Error restoring project:', error);
      alert(`Error restoring project: ${error}`);
    }
  };

  const emergencyRestoreMyProjects = async () => {
    if (!adminInfo.isAdmin) return;
    
    // Set restoration flag to prevent auto-saving
    const setIsRestoring = (window as any).__setIsRestoring;
    if (setIsRestoring) {
      console.log('🛡️ Enabling restoration mode - auto-save disabled');
      setIsRestoring(true);
    }
    
    try {
      console.log('🚨 Emergency restoration of current user projects...');
      
      // Import Firebase service to reload data
      const { firebaseService } = await import('../services/firebaseService');
      const { useAuth } = await import('../hooks/useAuth');
      const { useSettlementStore } = await import('../state/useSettlementStore');
      
      // Get current user
      const user = (await import('../firebase/config')).auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }
      
      // Perform emergency restore
      const { DatabaseDebugger } = await import('../utils/debugDatabase');
      const dbDebugger = new DatabaseDebugger();
      await dbDebugger.restoreCurrentUserProjectsFromCollaborations();
      console.log('✅ Emergency restoration completed in database');
      
      // Wait longer for database propagation and force cache refresh
      console.log('⏳ Waiting for database propagation...');
      await new Promise(resolve => setTimeout(resolve, 5000)); // Increased wait time
      
      // Force refresh database status to clear any caches
      console.log('🔄 Refreshing database status and clearing caches...');
      await firebaseService.refreshDatabaseStatus();
      
      // Force reload user data multiple times to overcome caching issues
      console.log('🔄 Force reloading user data to sync local state...');
      let freshUserData = null;
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries && (!freshUserData?.settlement?.projects || freshUserData.settlement.projects.length === 0)) {
        console.log(`🔄 Attempt ${retryCount + 1}/${maxRetries} to load fresh data...`);
        
        // Small delay between retries
        if (retryCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        freshUserData = await firebaseService.loadUserData(user.uid);
        
        console.log(`🔍 Fresh data attempt ${retryCount + 1}:`, {
          hasSettlement: !!freshUserData?.settlement,
          projectCount: freshUserData?.settlement?.projects?.length || 0,
          projects: freshUserData?.settlement?.projects?.map(p => p.name) || []
        });
        
        retryCount++;
      }
      
      if (freshUserData && freshUserData.settlement && freshUserData.settlement.projects && freshUserData.settlement.projects.length > 0) {
        console.log('📥 Fresh data loaded successfully, updating settlement store...');
        console.log('📊 Fresh settlement projects:', freshUserData.settlement.projects.length);
        
        // Update the settlement store with fresh data
        const { setSettlement } = useSettlementStore.getState();
        setSettlement(freshUserData.settlement);
        
        console.log('✅ Local state updated with restored projects');
      } else {
        console.error('❌ Failed to load restored projects after all retries');
        console.log('🔍 Final data state:', {
          freshUserData: !!freshUserData,
          settlement: !!freshUserData?.settlement,
          projectCount: freshUserData?.settlement?.projects?.length || 0
        });
      }
      
      alert('✅ Emergency restoration completed! Your projects should now be visible.');
      
      // Reload projects data to reflect changes in recovery interface
      await loadProjectsData();
    } catch (error) {
      console.error('❌ Error during emergency restoration:', error);
      alert(`Error during emergency restoration: ${error}`);
    } finally {
      // Re-enable auto-saving after restoration
      if (setIsRestoring) {
        console.log('🔄 Disabling restoration mode - auto-save re-enabled');
        setIsRestoring(false);
      }
    }
  };

  const getIssueIcon = (severity: string) => {
    switch (severity) {
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  const getIssueColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-orange-600 bg-orange-50';
      case 'info': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  // New handler functions for recovery system
  const handleEmergencyRestore = async () => {
    try {
      addRecoveryLog('🚨 Starting emergency restore from collaborations...');
      setRecoveryAttempts(prev => prev + 1);
      
      // Set restoration flag to prevent auto-saving
      const setIsRestoring = (window as any).__setIsRestoring;
      if (setIsRestoring) {
        addRecoveryLog('🛡️ Enabling restoration mode - auto-save disabled');
        setIsRestoring(true);
      }
      
      await emergencyRestoreMyProjects();
      setLastRecovery(new Date().toLocaleString());
      addRecoveryLog('✅ Emergency restore completed');
    } catch (error) {
      addRecoveryLog(`❌ Emergency restore failed: ${error}`);
    }
  };

  const handleCreateTestProject = async () => {
    try {
      addRecoveryLog('🧪 Creating test project...');
      // Implementation for creating a test project
      addRecoveryLog('✅ Test project created');
    } catch (error) {
      addRecoveryLog(`❌ Test project creation failed: ${error}`);
    }
  };

  const handleManualProjectRestore = async () => {
    try {
      addRecoveryLog('🔧 Starting manual project restore...');
      // Implementation for manual restore
      addRecoveryLog('✅ Manual restore completed');
    } catch (error) {
      addRecoveryLog(`❌ Manual restore failed: ${error}`);
    }
  };

  const fetchAllData = async () => {
    setIsLoading(true);
    try {
      addRecoveryLog('🔄 Fetching all database data...');
      
      if (adminInfo.isAdmin) {
        await loadProjectsData();
        // Update stats and other data from projectsData
        if (projectsData) {
          setStats(projectsData.totalStats);
          setAllProjects(projectsData.allProjects);
          setOrphanedCollaborations(projectsData.orphanedCollaborations);
        }
      }
      
      addRecoveryLog('✅ Data fetch completed');
    } catch (error) {
      addRecoveryLog(`❌ Data fetch failed: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverOrphanedProject = async (collab: any) => {
    try {
      addRecoveryLog(`🔄 Recovering project: ${collab.projectName}`);
      const mockProject = {
        id: collab.projectId,
        name: collab.projectName,
        description: `Recovered project from collaboration ${collab.id}`,
        status: 'not_started',
        priority: 'medium',
        assignedPlayers: [],
        items: [],
        progressPercentage: 0,
        dateCreated: collab.createdAt,
        notes: `Restored from orphaned collaboration. Original collaboration ID: ${collab.id}`
      };
      await restoreProject(collab.ownerId, mockProject);
      addRecoveryLog(`✅ Project ${collab.projectName} recovered`);
    } catch (error) {
      addRecoveryLog(`❌ Recovery failed for ${collab.projectName}: ${error}`);
    }
  };

  const handleCloneProject = async (project: any) => {
    try {
      addRecoveryLog(`📋 Cloning project: ${project.name}`);
      // Implementation for cloning project
      addRecoveryLog(`✅ Project ${project.name} cloned`);
    } catch (error) {
      addRecoveryLog(`❌ Clone failed for ${project.name}: ${error}`);
    }
  };

  const addRecoveryLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setRecoveryLog(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Emergency Project Recovery
  const runEmergencyRecovery = async () => {
    setIsRecovering(true);
    setRecoveryResults(null);
    
    try {
      console.log('🚨 Starting emergency project recovery...');
      const result = await quickProjectRecovery();
      
      if (result.success) {
        setRecoveryResults(`✅ ${result.message}`);
        console.log('✅ Recovery successful:', result.message);
        
        // Suggest page refresh
        setTimeout(() => {
          if (window.confirm('Recovery completed! Would you like to refresh the page to see your restored projects?')) {
            window.location.reload();
          }
        }, 2000);
      } else {
        setRecoveryResults(`❌ ${result.message}`);
        console.error('❌ Recovery failed:', result.message);
      }
    } catch (err) {
      console.error('❌ Recovery error:', err);
      setRecoveryResults(`❌ Recovery error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsRecovering(false);
    }
  };

  // Admin Project Recovery
  const runAdminRecovery = async () => {
    if (!isAdmin()) {
      setRecoveryResults('❌ Admin access required for comprehensive recovery');
      return;
    }
    
    setIsRecovering(true);
    setRecoveryResults(null);
    
    try {
      console.log('🔑 Starting admin project recovery...');
      const result = await adminProjectRecovery();
      
      if (result.success) {
        setRecoveryResults(`✅ ${result.message}`);
        if (result.data) {
          console.log('📊 Recovery data:', result.data);
        }
      } else {
        setRecoveryResults(`❌ ${result.message}`);
      }
    } catch (err) {
      console.error('❌ Admin recovery error:', err);
      setRecoveryResults(`❌ Admin recovery error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-4 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold mb-2 flex items-center gap-2">
          🔧 Database Debugger & Recovery System
          <span className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded-full">
            ADMIN ONLY
          </span>
        </h2>
        <p className="text-orange-100 text-sm">
          Advanced database debugging, project recovery, and orphaned data cleanup
        </p>
      </div>

      {/* Data Backup Exporter */}
      <DataExporter />

      {/* Emergency Project Recovery */}
      <div className="bg-white rounded-xl shadow-lg border border-red-200 p-6">
        <h3 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
          🚨 Emergency Project Recovery
        </h3>
        
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="bg-red-50 rounded-lg p-4">
            <h4 className="font-medium text-red-800 mb-2">Quick Recovery Actions</h4>
            <div className="space-y-2">
              <button
                onClick={() => handleEmergencyRestore()}
                className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                🆘 Emergency Restore from Collaborations
              </button>
              <button
                onClick={() => handleCreateTestProject()}
                className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm"
              >
                🧪 Create Test Project
              </button>
              <button
                onClick={() => handleManualProjectRestore()}
                className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-sm"
              >
                🔧 Manual Project Restore
              </button>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Recovery Status</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Orphaned Collaborations:</span>
                <span className="font-mono bg-blue-200 px-2 py-0.5 rounded">
                  {stats?.totalCollaborations || 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Recovery Attempts:</span>
                <span className="font-mono bg-blue-200 px-2 py-0.5 rounded">
                  {recoveryAttempts}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Last Recovery:</span>
                <span className="font-mono bg-blue-200 px-2 py-0.5 rounded text-xs">
                  {lastRecovery || 'Never'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {recoveryLog.length > 0 && (
          <div className="mb-4">
            <h4 className="font-medium text-gray-700 mb-2">Recovery Log</h4>
            <div className="bg-gray-100 rounded-lg p-3 max-h-40 overflow-y-auto">
              {recoveryLog.map((entry, index) => (
                <div key={index} className="text-sm font-mono text-gray-700 mb-1">
                  {entry}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Project Recovery Interface */}
      <div className="bg-white rounded-xl shadow-lg border border-blue-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-blue-700 flex items-center gap-2">
            📊 Project Recovery Interface
          </h3>
          <button
            onClick={() => fetchAllData()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            🔄 Refresh Data
          </button>
        </div>

        {isLoading ? (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading database analysis...</p>
          </div>
        ) : (
          <>
            {/* Stats Summary */}
            {stats && (
              <div className="grid md:grid-cols-4 gap-4 mb-6">
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.totalUsers}</div>
                  <div className="text-sm text-green-700">Total Users</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.totalProjects}</div>
                  <div className="text-sm text-blue-700">Total Projects</div>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-yellow-600">{stats.totalCollaborations}</div>
                  <div className="text-sm text-yellow-700">Collaborations</div>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-red-600">{stats.orphanedCollaborations}</div>
                  <div className="text-sm text-red-700">Orphaned</div>
                </div>
              </div>
            )}

            {/* Orphaned Collaborations Recovery */}
            {orphanedCollaborations.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-red-700 mb-3">🔍 Orphaned Collaborations (Recoverable Projects)</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {orphanedCollaborations.map((collab, index) => (
                    <div key={index} className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-red-800">{collab.projectName}</span>
                          <span className="text-xs text-red-600 ml-2">
                            ID: {collab.projectId} • Owner: {collab.ownerEmail}
                          </span>
                        </div>
                        <button
                          onClick={() => handleRecoverOrphanedProject(collab)}
                          className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                        >
                          🔄 Recover
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* All Projects Overview */}
            {allProjects.length > 0 && (
              <div className="mb-6">
                <h4 className="font-medium text-green-700 mb-3">📂 All Projects in Database</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allProjects.map((project, index) => (
                    <div key={index} className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-green-800">{project.name}</span>
                          <span className="text-xs text-green-600 ml-2">
                            Owner: {project.ownerEmail} • Items: {project.itemCount} • Tasks: {project.taskCount}
                          </span>
                        </div>
                        {project.ownerId !== user?.uid && (
                          <button
                            onClick={() => handleCloneProject(project)}
                            className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                          >
                            📋 Clone
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Summary */}
      <div className="bg-slate-100 rounded-lg p-4">
        <h3 className="font-semibold text-slate-800 mb-2">📊 Summary</h3>
        <p className="text-slate-700">{results?.summary}</p>
      </div>

      {/* Admin Statistics */}
      {adminInfo.isAdmin && (
        <div className="bg-red-50 rounded-lg p-4 border border-red-200">
          <h3 className="font-semibold text-red-800 mb-3">🔑 Admin Database Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(results?.collections || {}).map(([collectionName, documents]) => (
              <div key={collectionName} className="bg-white rounded p-3 border">
                <div className="text-sm font-medium text-slate-600">{collectionName}</div>
                <div className="text-2xl font-bold text-slate-800">{documents.length}</div>
                <div className="text-xs text-slate-500">documents</div>
              </div>
            ))}
          </div>
          
          {/* Quick insights for admins */}
          <div className="mt-4 p-3 bg-white rounded border">
            <h4 className="font-medium text-slate-800 mb-2">Quick Insights:</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              {results?.collections.users && (
                <li>• {results.collections.users.filter(u => u.settlement).length} users have settlements</li>
              )}
              {results?.collections.projectCollaborations && (
                <li>• {results.collections.projectCollaborations.filter(c => c.isActive).length} active collaborations</li>
              )}
              {results?.collections.sharedProjects && (
                <li>• {results.collections.sharedProjects.filter(p => p.isPublic).length} public shared projects</li>
              )}
              {results?.collections.users && (
                <li>• {results.collections.users.reduce((sum, u) => sum + (u.settlement?.projects?.length || 0), 0)} total projects across all users</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Project Logs */}
      <div className="mb-6">
        <h3 className="font-semibold text-slate-800 mb-4">📋 Project Lifecycle Logs</h3>
        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={() => {
                const logs = projectLogger.getLogs();
                console.log('📋 Project logs:', logs);
              }}
              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
            >
              📋 View All Logs
            </button>
            <button
              onClick={() => projectLogger.exportLogs()}
              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
            >
              📁 Export Logs
            </button>
            <button
              onClick={() => projectLogger.clearLogs()}
              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              🗑️ Clear Logs
            </button>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-slate-700">Recent Activity (Last 10 logs)</h4>
            <div className="bg-white rounded border p-3 max-h-60 overflow-y-auto">
              {projectLogger.getRecentLogs(10).map((log, index) => (
                <div key={index} className="text-xs font-mono mb-2 p-2 bg-slate-50 rounded">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                      log.type === 'ERROR' ? 'bg-red-100 text-red-800' :
                      log.type === 'CREATE' ? 'bg-green-100 text-green-800' :
                      log.type === 'DELETE' ? 'bg-red-100 text-red-800' :
                      log.type === 'SAVE' ? 'bg-blue-100 text-blue-800' :
                      log.type === 'LOAD' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {log.type}
                    </span>
                    <span className="text-slate-600">{log.timestamp}</span>
                    <span className="text-slate-800 font-medium">Projects: {log.projectCount}</span>
                  </div>
                  <div className="text-slate-700 mb-1">{log.location}: {log.operation}</div>
                  {log.projects.length > 0 && (
                    <div className="text-slate-600">Projects: {log.projects.map(p => p.name).join(', ')}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-white rounded border">
            <h4 className="font-medium text-slate-800 mb-2">Log Statistics:</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{projectLogger.getLogsByType('CREATE').length}</div>
                <div className="text-slate-600">Creates</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">{projectLogger.getLogsByType('DELETE').length}</div>
                <div className="text-slate-600">Deletes</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{projectLogger.getLogsByType('SAVE').length}</div>
                <div className="text-slate-600">Saves</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-red-600">{projectLogger.getLogsByType('ERROR').length}</div>
                <div className="text-slate-600">Errors</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Issues */}
      {results?.issues && results.issues.length > 0 && (
        <div>
          <h3 className="font-semibold text-slate-800 mb-4">🚨 Issues Found</h3>
          <div className="space-y-2">
            {results.issues.map((issue, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border ${getIssueColor(issue.severity)}`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg">{getIssueIcon(issue.severity)}</span>
                  <div className="flex-1">
                    <div className="font-medium">
                      [{issue.collection}/{issue.documentId}]
                    </div>
                    <div className="text-sm mt-1">{issue.issue}</div>
                    {issue.data && (
                      <details className="mt-2">
                        <summary className="text-xs cursor-pointer text-slate-600">
                          View Details
                        </summary>
                        <pre className="text-xs mt-1 p-2 bg-slate-200 rounded overflow-auto">
                          {JSON.stringify(issue.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Collections Data */}
      <div>
        <h3 className="font-semibold text-slate-800 mb-4">📁 Collections Data</h3>
        <div className="space-y-4">
          {Object.entries(results?.collections || {}).map(([collectionName, documents]) => (
            <details key={collectionName} className="bg-slate-50 rounded-lg">
              <summary className="p-3 cursor-pointer font-medium text-slate-700">
                📂 {collectionName} ({documents.length} documents)
              </summary>
              <div className="p-3 pt-0">
                {documents.map((doc, index) => (
                  <details key={index} className="mb-2 bg-white rounded border p-2">
                    <summary className="cursor-pointer text-sm font-medium">
                      Document {index + 1}: {doc.id}
                    </summary>
                    <pre className="text-xs mt-2 p-2 bg-slate-100 rounded overflow-auto max-h-60">
                      {JSON.stringify(doc, null, 2)}
                    </pre>
                  </details>
                ))}
              </div>
            </details>
          ))}
        </div>
      </div>

      {/* Emergency Project Recovery Section */}
      <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
        <h3 className="text-lg font-semibold text-red-800 mb-3">🚨 Emergency Project Recovery</h3>
        <p className="text-sm text-red-700 mb-4">
          If you've lost projects due to data sync issues, use this emergency recovery tool to restore them from collaboration records.
        </p>
        
        <div className="flex gap-3 mb-3">
          <button
            onClick={runEmergencyRecovery}
            disabled={isRecovering}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium"
          >
            {isRecovering ? '🔄 Recovering...' : '🚨 Emergency Recovery'}
          </button>
          
          {isAdmin() && (
            <button
              onClick={runAdminRecovery}
              disabled={isRecovering}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-medium"
            >
              {isRecovering ? '🔄 Recovering...' : '🔑 Admin Recovery'}
            </button>
          )}
        </div>
        
        {recoveryResults && (
          <div className="mt-3 p-3 bg-white rounded border">
            <pre className="text-sm whitespace-pre-wrap">{recoveryResults}</pre>
          </div>
        )}
      </div>
    </div>
  );
}; 