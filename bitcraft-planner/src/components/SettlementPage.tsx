import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useItemsStore } from '../state/useItemsStore';
import { isAdmin } from '../utils/adminCheck';
import { SettlementV2Service, SettlementV2, ProjectV2, TaskV2, UserV2 } from '../services/settlementV2Service';
import { calculateMaterials } from '../utils/calculator';
import ProjectManagementV2 from './ProjectManagementV2';

const settlementService = new SettlementV2Service();

interface SettlementPageProps {
  // Optional props for future use
}

const SettlementPage: React.FC<SettlementPageProps> = () => {
  const { user } = useAuth();
  const { items } = useItemsStore();
  const [isUserAdmin, setIsUserAdmin] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<string>('overview');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // V2 Data state
  const [settlements, setSettlements] = useState<SettlementV2[]>([]);
  const [currentSettlement, setCurrentSettlement] = useState<SettlementV2 | null>(null);
  const [projects, setProjects] = useState<ProjectV2[]>([]);
  const [tasks, setTasks] = useState<TaskV2[]>([]);
  const [userData, setUserData] = useState<UserV2 | null>(null);
  
  // Form states
  const [showCreateSettlement, setShowCreateSettlement] = useState<boolean>(false);
  const [showCreateProject, setShowCreateProject] = useState<boolean>(false);
  const [showCreateTask, setShowCreateTask] = useState<boolean>(false);
  const [selectedProject, setSelectedProject] = useState<ProjectV2 | null>(null);
  
  // Form data
  const [newSettlementName, setNewSettlementName] = useState<string>('');
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newProjectDescription, setNewProjectDescription] = useState<string>('');
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskDescription, setNewTaskDescription] = useState<string>('');

  // Admin check
  useEffect(() => {
    const adminStatus = isAdmin();
    setIsUserAdmin(adminStatus);
    
    console.log('🔑 SettlementPage Admin Check:', {
      user: user?.email || 'Not logged in',
      isAdmin: adminStatus
    });
      }, [user]);

  // Load initial data
  useEffect(() => {
    if (!user) return;
    
    loadInitialData();
  }, [user]);

  const loadInitialData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Load user data
      let userV2Data = await settlementService.getUser(user.uid);
      if (!userV2Data) {
        // Create user if doesn't exist
        await settlementService.createUser(user.uid, {
          email: user.email || '',
          displayName: user.displayName || user.email || 'Unknown User',
          photoURL: user.photoURL || undefined,
          preferences: {
            theme: 'light',
            notifications: true
          }
        });
        userV2Data = await settlementService.getUser(user.uid);
      }
      setUserData(userV2Data);
      
      // Load settlements
      const userSettlements = await settlementService.getSettlementsByOwner(user.uid);
      setSettlements(userSettlements);
      
      // Set current settlement
      if (userSettlements.length > 0) {
        const defaultSettlement = userV2Data?.defaultSettlementId 
          ? userSettlements.find(s => s.id === userV2Data.defaultSettlementId) || userSettlements[0]
          : userSettlements[0];
        
        setCurrentSettlement(defaultSettlement);
        
        // Load projects for current settlement
        await loadProjectsForSettlement(defaultSettlement.id);
      }
    } catch (err) {
      console.error('Error loading settlement data:', err);
      setError('Failed to load settlement data');
    } finally {
      setLoading(false);
    }
  };

  const loadProjectsForSettlement = async (settlementId: string) => {
    try {
      // Load projects for current settlement
      const settlementProjects = await settlementService.getProjectsBySettlement(settlementId);
      setProjects(settlementProjects);
      
      // Load tasks for all projects
      const allTasks: TaskV2[] = [];
      for (const project of settlementProjects) {
        const projectTasks = await settlementService.getTasksByProject(project.id);
        allTasks.push(...projectTasks);
      }
      setTasks(allTasks);
    } catch (err) {
      console.error('Error loading projects:', err);
      setError('Failed to load projects');
    }
  };

  const handleProjectsUpdate = async () => {
    if (currentSettlement) {
      await loadProjectsForSettlement(currentSettlement.id);
    }
  };

  const handleCreateSettlement = async () => {
    if (!user || !newSettlementName.trim()) return;
    
    try {
      const settlementId = await settlementService.createSettlement({
        name: newSettlementName.trim(),
        ownerId: user.uid,
        inventory: {},
        settings: {
          autoAssignTasks: false,
          lowStockThreshold: 10,
          enableNotifications: true
        },
        metadata: {
          description: 'A new BitCraft settlement'
        }
      });
      
      // Update user's default settlement
      if (settlements.length === 0) {
        await settlementService.updateUser(user.uid, {
          defaultSettlementId: settlementId
        });
      }
      
      setNewSettlementName('');
      setShowCreateSettlement(false);
      loadInitialData(); // Reload data
    } catch (err) {
      console.error('Error creating settlement:', err);
      setError('Failed to create settlement');
    }
  };

  const handleCreateProject = async () => {
    if (!user || !currentSettlement || !newProjectName.trim()) return;
    
    try {
      await settlementService.createProject({
        name: newProjectName.trim(),
        description: newProjectDescription.trim() || '',
        ownerId: user.uid,
        settlementId: currentSettlement.id,
        status: 'not_started',
        priority: 'medium',
        items: [],
        notes: '',
        isShared: false,
        isTemplate: false,
        metadata: {}
      });
      
      setNewProjectName('');
      setNewProjectDescription('');
      setShowCreateProject(false);
      
      // Reload projects
      const settlementProjects = await settlementService.getProjectsBySettlement(currentSettlement.id);
      setProjects(settlementProjects);
    } catch (err) {
      console.error('Error creating project:', err);
      setError('Failed to create project');
    }
  };

  const handleCreateTask = async () => {
    if (!selectedProject || !newTaskTitle.trim()) return;
    
    try {
      await settlementService.createTask({
        projectId: selectedProject.id,
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || '',
        status: 'pending',
        priority: 'medium',
        metadata: {}
      });
      
      setNewTaskTitle('');
      setNewTaskDescription('');
      setShowCreateTask(false);
      setSelectedProject(null);
      
      // Reload tasks
      const allTasks: TaskV2[] = [];
      for (const project of projects) {
        const projectTasks = await settlementService.getTasksByProject(project.id);
        allTasks.push(...projectTasks);
      }
      setTasks(allTasks);
    } catch (err) {
      console.error('Error creating task:', err);
      setError('Failed to create task');
    }
  };



  const handleUpdateTaskStatus = async (taskId: string, status: TaskV2['status']) => {
    try {
      await settlementService.updateTask(taskId, { status });
      
      // Update local state
      setTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, status } : t
      ));
    } catch (err) {
      console.error('Error updating task status:', err);
      setError('Failed to update task status');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started': case 'pending': return 'bg-gray-100 text-gray-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTabIcon = (view: string) => {
    switch (view) {
      case 'overview': return '📊';
      case 'settlements': return '🏘️';
      case 'projects': return '🏗️';
      case 'tasks': return '📋';
      case 'inventory': return '📦';
      case 'users': return '👥';
      default: return '📊';
    }
  };

  const getTabCounts = () => {
    return {
      settlements: settlements.length,
      projects: projects.length,
      tasks: tasks.length,
      inventory: currentSettlement ? Object.keys(currentSettlement.inventory).length : 0
    };
  };

  // Settlement System is now available to all users

  if (loading) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
        <div className="text-center">
          <div className="text-gray-500 text-lg">Loading Settlement System...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
        <div className="text-center">
          <div className="text-red-500 text-lg mb-2">❌ Error</div>
          <div className="text-gray-600">{error}</div>
          <button 
            onClick={() => { setError(null); loadInitialData(); }}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const tabs = ['overview', 'settlements', 'projects', 'tasks', 'inventory', 'users'];
  const tabCounts = getTabCounts();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4 rounded-xl mb-4 shadow-lg">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
              🏘️ Settlement System
            </h1>
            <p className="text-purple-100 text-sm">
              {currentSettlement?.name || 'No settlement selected'} - Collaborative project management for BitCraft
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-purple-100">
              {settlements.length} Settlement{settlements.length !== 1 ? 's' : ''}
            </div>
            <div className="text-sm text-purple-100">
              {projects.length} Project{projects.length !== 1 ? 's' : ''}
            </div>
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
                  ? 'border-purple-500 text-purple-600 bg-purple-50'
                  : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50'
              }`}
            >
              <span className="text-lg">{getTabIcon(tab)}</span>
              <span className="capitalize">{tab}</span>
              {(tabCounts[tab as keyof typeof tabCounts] || 0) > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  activeView === tab
                    ? 'bg-purple-200 text-purple-800'
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
      <div className="flex-1 min-h-0 overflow-auto">
        {activeView === 'overview' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
              <h2 className="text-xl font-bold mb-4">📊 Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{settlements.length}</div>
                  <div className="text-blue-800">Settlements</div>
                </div>
                <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{projects.length}</div>
                  <div className="text-green-800">Projects</div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{tasks.length}</div>
                  <div className="text-purple-800">Tasks</div>
                </div>
              </div>
              
              {settlements.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-semibold text-yellow-800 mb-2">🏗️ Get Started</h3>
                  <p className="text-yellow-700 text-sm mb-3">
                    Welcome to the Settlement System! To get started, you'll need to create your first settlement.
                  </p>
                  <button 
                    onClick={() => setActiveView('settlements')}
                    className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm"
                  >
                    Go to Settlements Tab
                  </button>
                </div>
              ) : !currentSettlement ? (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-800 mb-2">🎯 Select a Settlement</h3>
                  <p className="text-blue-700 text-sm mb-3">
                    You have settlements but none is currently selected. Please select one to continue.
                  </p>
                  <button 
                    onClick={() => setActiveView('settlements')}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                  >
                    Select Settlement
                  </button>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">✅ Ready to Go!</h3>
                  <p className="text-green-700 text-sm mb-3">
                    Current settlement: <strong>{currentSettlement.name}</strong>
                  </p>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setActiveView('projects')}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                    >
                      Manage Projects
                    </button>
                    <button 
                      onClick={() => setActiveView('inventory')}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                    >
                      View Inventory
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'settlements' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">🏘️ Settlements</h2>
                <button 
                  onClick={() => setShowCreateSettlement(true)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  + Create Settlement
                </button>
              </div>
              
              {settlements.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No settlements found. Create your first settlement to get started!
                </div>
              ) : (
                <div className="space-y-4">
                  {settlements.map((settlement) => (
                    <div key={settlement.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-semibold">{settlement.name}</h3>
                          <p className="text-gray-600 text-sm">{settlement.metadata?.description}</p>
                          <div className="flex gap-2 mt-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                              {Object.keys(settlement.inventory).length} items
                            </span>
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              {projects.filter(p => p.settlementId === settlement.id).length} projects
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setCurrentSettlement(settlement)}
                            className={`px-3 py-1 rounded text-sm ${
                              currentSettlement?.id === settlement.id
                                ? 'bg-purple-500 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            {currentSettlement?.id === settlement.id ? 'Selected' : 'Select'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'projects' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">🏗️ Projects</h2>
                <button 
                  onClick={() => setShowCreateProject(true)}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  disabled={!currentSettlement}
                >
                  + Create Project
                </button>
              </div>
              
              {!currentSettlement ? (
                <div className="text-center py-8">
                  <div className="text-gray-500 mb-4">
                    Please select a settlement first to view projects.
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mx-auto max-w-md">
                    <h4 className="font-semibold text-yellow-800 mb-2">📋 Quick Start Guide</h4>
                    <ol className="text-yellow-700 text-sm space-y-1 text-left">
                      <li>1. Go to "Settlements" tab</li>
                      <li>2. Create or select a settlement</li>
                      <li>3. Return to "Projects" tab</li>
                      <li>4. Create a project</li>
                      <li>5. Use "+ Add Item" to add items</li>
                    </ol>
                  </div>
                </div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500 mb-4">
                    No projects found for "{currentSettlement.name}". Create your first project to get started!
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mx-auto max-w-md">
                    <h4 className="font-semibold text-blue-800 mb-2">🎯 How to Add Items</h4>
                    <ol className="text-blue-700 text-sm space-y-1 text-left">
                      <li>1. Click "Create Project" above</li>
                      <li>2. Give your project a name</li>
                      <li>3. Click "+ Add Item" in the project</li>
                      <li>4. Search and select items</li>
                      <li>5. Tasks will be auto-generated!</li>
                    </ol>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-green-700 text-sm">
                      💡 <strong>Tip:</strong> Use the "+ Add Item" button in any project to add items with automatic task generation!
                    </p>
                  </div>
                  <ProjectManagementV2 
                    settlementService={settlementService}
                    currentSettlement={currentSettlement}
                    projects={projects}
                    onProjectsUpdate={handleProjectsUpdate}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'tasks' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
              <h2 className="text-xl font-bold mb-4">📋 Tasks</h2>
              
              {tasks.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No tasks found. Create projects and add tasks to get started!
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => {
                    const project = projects.find(p => p.id === task.projectId);
                    return (
                      <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold">{task.title}</h3>
                            <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                            <div className="flex gap-2 mb-2">
                              <span className={`px-2 py-1 text-xs rounded ${getStatusColor(task.status)}`}>
                                {task.status.replace('_', ' ')}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                {project?.name || 'Unknown Project'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              Created: {task.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <select 
                              value={task.status}
                              onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value as TaskV2['status'])}
                              className="px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'inventory' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
              <h2 className="text-xl font-bold mb-4">📦 Inventory</h2>
              
              {!currentSettlement ? (
                <div className="text-gray-500 text-center py-8">
                  Please select a settlement first to view inventory.
                </div>
              ) : Object.keys(currentSettlement.inventory).length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No items in inventory yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(currentSettlement.inventory).map(([itemId, inventoryItem]) => (
                    <div key={itemId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="text-lg font-semibold">{items[itemId]?.name || itemId}</h3>
                          <div className="flex gap-2 mt-1">
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                              {inventoryItem.quantity} available
                            </span>
                            {inventoryItem.reservedQuantity > 0 && (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                                {inventoryItem.reservedQuantity} reserved
                              </span>
                            )}
                            {inventoryItem.storageLocation && (
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                📍 {inventoryItem.storageLocation}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeView === 'users' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">👥 Users</h2>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                  User Management Coming Soon
                </span>
              </div>
              
              {userData && (
                <div className="border border-gray-200 rounded-lg p-4 mb-4">
                  <h3 className="text-lg font-semibold">Current User (You)</h3>
                  <div className="mt-2">
                    <p><strong>Email:</strong> {userData.email}</p>
                    <p><strong>Display Name:</strong> {userData.displayName}</p>
                    <p><strong>Created:</strong> {userData.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}</p>
                    <p><strong>Last Sign In:</strong> {userData.lastSignIn?.toDate?.()?.toLocaleDateString() || 'Unknown'}</p>
                  </div>
                </div>
              )}
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">📝 User Management Features</h3>
                <p className="text-blue-700 text-sm mb-2">
                  The following user management features are planned for future development:
                </p>
                <ul className="text-blue-700 text-sm space-y-1">
                  <li>• Invite users to settlements</li>
                  <li>• Manage user roles and permissions</li>
                  <li>• Assign tasks to specific users</li>
                  <li>• Track user activity and contributions</li>
                  <li>• User collaboration tools</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Settlement Modal */}
      {showCreateSettlement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Create New Settlement</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Settlement Name
                </label>
                <input
                  type="text"
                  value={newSettlementName}
                  onChange={(e) => setNewSettlementName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter settlement name"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreateSettlement}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                disabled={!newSettlementName.trim()}
              >
                Create Settlement
              </button>
              <button
                onClick={() => { setShowCreateSettlement(false); setNewSettlementName(''); }}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Create New Project</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter project name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter project description"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreateProject}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                disabled={!newProjectName.trim()}
              >
                Create Project
              </button>
              <button
                onClick={() => { setShowCreateProject(false); setNewProjectName(''); setNewProjectDescription(''); }}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {showCreateTask && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Create New Task</h3>
            <p className="text-sm text-gray-600 mb-4">For project: {selectedProject.name}</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task description"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleCreateTask}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                disabled={!newTaskTitle.trim()}
              >
                Create Task
              </button>
              <button
                onClick={() => { setShowCreateTask(false); setSelectedProject(null); setNewTaskTitle(''); setNewTaskDescription(''); }}
                className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettlementPage; 