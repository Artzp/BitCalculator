import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useItemsStore } from '../state/useItemsStore';
import { isAdmin } from '../utils/adminCheck';
import { SettlementV2Service, SettlementV2, ProjectV2, TaskV2, UserV2 } from '../services/settlementV2Service';
import { SettlementMember, SettlementCollaboratorRole, SettlementInviteLink } from '../types/NormalizedDatabase';
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
  const [settlementMembers, setSettlementMembers] = useState<SettlementMember[]>([]);
  const [inviteLinks, setInviteLinks] = useState<SettlementInviteLink[]>([]);
  
  // Form states
  const [showCreateSettlement, setShowCreateSettlement] = useState<boolean>(false);
  const [showCreateProject, setShowCreateProject] = useState<boolean>(false);
  const [showCreateTask, setShowCreateTask] = useState<boolean>(false);
  const [selectedProject, setSelectedProject] = useState<ProjectV2 | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState<boolean>(false);
  const [showJoinDialog, setShowJoinDialog] = useState<boolean>(false);
  const [showManageMembersDialog, setShowManageMembersDialog] = useState<boolean>(false);
  
  // Form data
  const [newSettlementName, setNewSettlementName] = useState<string>('');
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newProjectDescription, setNewProjectDescription] = useState<string>('');
  const [newTaskTitle, setNewTaskTitle] = useState<string>('');
  const [newTaskDescription, setNewTaskDescription] = useState<string>('');
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<SettlementCollaboratorRole>('contributor');
  const [inviteMessage, setInviteMessage] = useState<string>('');
  const [joinCode, setJoinCode] = useState<string>('');
  const [generatedInviteCode, setGeneratedInviteCode] = useState<string>('');

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
      
      // Check if user data is corrupted (empty email/displayName) or doesn't exist
      const isUserDataCorrupted = userV2Data && (!userV2Data.email || !userV2Data.displayName);
      
      if (!userV2Data || isUserDataCorrupted) {
        // Create or fix user data
        const newUserData = {
          email: user.email || '',
          displayName: user.displayName || user.email || 'Unknown User',
          photoURL: user.photoURL || undefined,
          preferences: {
            theme: 'light' as const,
            notifications: true
          }
        };
        
        if (userV2Data) {
          // Update existing corrupted user
          await settlementService.updateUser(user.uid, newUserData);
        } else {
          // Create new user
          await settlementService.createUser(user.uid, newUserData);
        }
        
        userV2Data = await settlementService.getUser(user.uid);
      }
      setUserData(userV2Data);
      
      // Load settlements (both owned and collaborated)
      const userSettlements = await settlementService.getSettlementsUserCanAccess(user.uid);
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
      
      // Load settlement members
      await loadSettlementMembers(settlementId);
    } catch (err) {
      console.error('Error loading projects:', err);
      setError('Failed to load projects');
    }
  };

  const loadSettlementMembers = async (settlementId: string) => {
    try {
      const members = await settlementService.getSettlementMembers(settlementId);
      setSettlementMembers(members);
    } catch (err) {
      console.error('Error loading settlement members:', err);
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

  // Settlement collaboration handlers
  const handleGenerateInviteLink = async () => {
    if (!currentSettlement || !user) return;
    
    try {
      const inviteCode = await settlementService.createSettlementInviteLink({
        settlementId: currentSettlement.id,
        createdBy: user.uid,
        role: inviteRole,
        permissions: settlementService.getDefaultPermissions(inviteRole),
        isActive: true,
        maxUses: 1 // Single use only
      });
      
      // Set the real invite code returned from the service
      setGeneratedInviteCode(inviteCode);
      
    } catch (err) {
      console.error('Error generating invite link:', err);
      setError('Failed to generate invite link');
    }
  };

  const handleJoinSettlement = async () => {
    if (!user || !joinCode.trim()) return;
    
    try {
      const inviteLink = await settlementService.getSettlementInviteLink(joinCode.trim());
      if (!inviteLink) {
        setError('Invalid or expired invite code');
        return;
      }
      
      // Check if user is already a member of this settlement
      const isAlreadyMember = await settlementService.isUserSettlementMember(user.uid, inviteLink.settlementId);
      if (isAlreadyMember) {
        setError('You are already a member of this settlement');
        return;
      }
      
      // Create collaboration
      await settlementService.createSettlementCollaboration({
        settlementId: inviteLink.settlementId,
        userId: user.uid,
        invitedBy: inviteLink.createdBy,
        role: inviteLink.role,
        status: 'active',
        permissions: inviteLink.permissions,
        inviteCode: joinCode.trim(),
        metadata: {
          activityLog: [],
          version: 1
        }
      });
      
      // Use invite link (this will automatically deactivate single-use codes)
      await settlementService.useSettlementInviteLink(inviteLink.id);
      
      setJoinCode('');
      setShowJoinDialog(false);
      
      // Reload data
      await loadInitialData();
      
    } catch (err) {
      console.error('Error joining settlement:', err);
      setError('Failed to join settlement. ' + (err as Error).message);
    }
  };

  const handleRemoveMember = async (memberId: string, settlementId: string) => {
    if (!user) return;
    
    if (!memberId) {
      console.error('Invalid member ID:', memberId);
      setError('Invalid member ID - cannot remove member');
      return;
    }
    
    try {
      console.log('Removing member:', { memberId, settlementId });
      await settlementService.removeSettlementCollaborator(memberId, settlementId);
      await loadSettlementMembers(settlementId);
    } catch (err) {
      console.error('Error removing member:', err);
      setError('Failed to remove member: ' + (err as Error).message);
    }
  };

  const handleChangeRole = async (memberId: string, settlementId: string, newRole: SettlementCollaboratorRole) => {
    if (!user) return;
    
    try {
      const collaborationId = `${memberId}_${settlementId}`;
      await settlementService.updateSettlementCollaboration(collaborationId, {
        role: newRole,
        permissions: settlementService.getDefaultPermissions(newRole)
      });
      await loadSettlementMembers(settlementId);
    } catch (err) {
      console.error('Error changing role:', err);
      setError('Failed to change role');
    }
  };

  const handleCleanupDuplicates = async () => {
    if (!currentSettlement || !user) return;
    
    try {
      setLoading(true);
      
      // Clean up duplicate collaborations
      await settlementService.cleanupDuplicateCollaborations(currentSettlement.id);
      
      // Clean up expired invite links
      await settlementService.cleanupExpiredInviteLinks(currentSettlement.id);
      
      // Reload data
      await loadInitialData();
      
      alert('✅ Cleanup completed! Duplicate memberships and expired invite codes have been removed.');
    } catch (err) {
      console.error('Error during cleanup:', err);
      setError('Failed to cleanup duplicates: ' + (err as Error).message);
    } finally {
      setLoading(false);
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
                <h2 className="text-xl font-bold">👥 Settlement Members</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowInviteDialog(true)}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    disabled={!currentSettlement}
                  >
                    ➕ Invite User
                  </button>
                  <button
                    onClick={() => setShowJoinDialog(true)}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                  >
                    🤝 Join Settlement
                  </button>
                  {currentSettlement && (
                    <button
                      onClick={handleCleanupDuplicates}
                      className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                      title="Remove duplicate memberships and expired invite codes"
                    >
                      🧹 Cleanup
                    </button>
                  )}
                </div>
              </div>

              {!currentSettlement ? (
                <div className="text-gray-500 text-center py-8">
                  Please select a settlement first to view members.
                </div>
              ) : (
                <div className="space-y-4">
                  {settlementMembers.length === 0 ? (
                    <div className="text-gray-500 text-center py-8">
                      <p>No members found.</p>
                      <p className="text-sm mt-2">Invite users to collaborate on this settlement.</p>
                    </div>
                  ) : (
                    settlementMembers.map((member) => (
                      <div key={member.collaboration.userId || member.user.id || member.collaboration.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-purple-400 to-blue-400 flex items-center justify-center text-white font-semibold">
                              {member.user.displayName?.[0]?.toUpperCase() || member.user.email?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div>
                              <h3 className="font-semibold">{member.user.displayName || member.user.email || 'Unknown User'}</h3>
                              <p className="text-sm text-gray-600">{member.user.email || 'No email'}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  member.isOwner ? 'bg-purple-100 text-purple-800' :
                                  member.collaboration.role === 'admin' ? 'bg-red-100 text-red-800' :
                                  member.collaboration.role === 'contributor' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {member.isOwner ? '👑 Owner' : member.collaboration.role}
                                </span>
                                <span className={`px-2 py-1 rounded text-xs ${
                                  member.collaboration.status === 'active' ? 'bg-green-100 text-green-800' :
                                  member.collaboration.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {member.collaboration.status}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {!member.isOwner && user && (
                            <div className="flex items-center gap-2">
                              <select
                                value={member.collaboration.role}
                                onChange={(e) => handleChangeRole(member.collaboration.userId || member.user.id, currentSettlement.id, e.target.value as SettlementCollaboratorRole)}
                                className="text-sm border border-gray-300 rounded px-2 py-1"
                                disabled={user.uid !== currentSettlement.ownerId}
                              >
                                <option value="viewer">Viewer</option>
                                <option value="contributor">Contributor</option>
                                <option value="admin">Admin</option>
                              </select>
                              
                              {user.uid === currentSettlement.ownerId && (
                                <button
                                  onClick={() => handleRemoveMember(member.collaboration.userId || member.user.id, currentSettlement.id)}
                                  className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm"
                                >
                                  Remove
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {member.collaboration.permissions && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className="text-sm font-medium text-gray-700 mb-2">Permissions:</p>
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(member.collaboration.permissions)
                                .filter(([_, value]) => value === true)
                                .map(([key, _]) => (
                                  <span key={key} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                                    {key.replace(/^can/, '').replace(/([A-Z])/g, ' $1').toLowerCase()}
                                  </span>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
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

      {/* Invite User Modal */}
      {showInviteDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Invite User to Settlement</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as SettlementCollaboratorRole)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="viewer">Viewer (View only)</option>
                  <option value="contributor">Contributor (Can edit projects/tasks)</option>
                  <option value="admin">Admin (Full management access)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invite Message (Optional)
                </label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Add a personal message..."
                  rows={3}
                />
              </div>
            </div>
            
            {generatedInviteCode ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mt-4">
                <h4 className="font-semibold text-green-800 mb-2">✅ Invite Link Generated!</h4>
                <div className="bg-white border rounded p-3 mb-3">
                  <code className="text-sm font-mono text-green-600">{generatedInviteCode}</code>
                </div>
                <p className="text-green-700 text-sm">
                  Share this code with the user you want to invite. They can join using the "Join Settlement" button.
                </p>
              </div>
            ) : (
              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleGenerateInviteLink}
                  className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Generate Invite Link
                </button>
                <button
                  onClick={() => {
                    setShowInviteDialog(false);
                    setInviteRole('contributor');
                    setInviteMessage('');
                    setGeneratedInviteCode('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            )}

            {generatedInviteCode && (
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => {
                    setShowInviteDialog(false);
                    setInviteRole('contributor');
                    setInviteMessage('');
                    setGeneratedInviteCode('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Join Settlement Modal */}
      {showJoinDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Join Settlement</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invite Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Enter invite code"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-700 text-sm">
                  💡 <strong>Tip:</strong> Get an invite code from a settlement owner or admin to join their settlement and collaborate on projects.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={handleJoinSettlement}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                disabled={!joinCode.trim()}
              >
                Join Settlement
              </button>
              <button
                onClick={() => {
                  setShowJoinDialog(false);
                  setJoinCode('');
                }}
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