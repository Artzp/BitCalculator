import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useItemsStore } from '../state/useItemsStore';
import { isAdmin } from '../utils/adminCheck';
import { SettlementV2Service, SettlementV2, ProjectV2, TaskV2, UserV2 } from '../services/settlementV2Service';
import { SettlementMember, SettlementCollaboratorRole, SettlementInviteLink } from '../types/NormalizedDatabase';
import { calculateMaterials } from '../utils/calculator';
import ProjectManagementV2 from './ProjectManagementV2';
import { TaskAssignmentInterface } from './TaskAssignmentInterface';
import { ContributionSubmissionInterface } from './ContributionSubmissionInterface';
import { ContributionDashboard } from './ContributionDashboard';
import { SettlementInventoryV2 } from './SettlementInventoryV2';
import { getPrivateDisplayName, getPrivateEmailDisplay, getMemberInitials, isValidCustomDisplayName } from '../utils/userUtils';

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
  
  // New task assignment and contribution states
  const [showTaskAssignmentInterface, setShowTaskAssignmentInterface] = useState<boolean>(false);
  const [showContributionInterface, setShowContributionInterface] = useState<boolean>(false);
  const [showContributionDashboard, setShowContributionDashboard] = useState<boolean>(false);
  
  // Profile settings state
  const [showProfileSettings, setShowProfileSettings] = useState<boolean>(false);
  const [customDisplayName, setCustomDisplayName] = useState<string>('');
  const [profileUpdateMessage, setProfileUpdateMessage] = useState<string>('');
  
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
  
  // Task filters
  const [taskSearchTerm, setTaskSearchTerm] = useState<string>('');
  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('all');
  const [taskPriorityFilter, setTaskPriorityFilter] = useState<string>('all');
  const [taskAssigneeFilter, setTaskAssigneeFilter] = useState<string>('all');
  
  // Task assignment tracking - map of taskId to array of selected userIds
  const [selectedAssignees, setSelectedAssignees] = useState<{[taskId: string]: string[]}>({});
  
  // Assignment interface state
  const [assignmentSearchTerm, setAssignmentSearchTerm] = useState<{[taskId: string]: string}>({});
  const [showAssignmentInterface, setShowAssignmentInterface] = useState<{[taskId: string]: boolean}>({});
  const [assignmentRoleFilter, setAssignmentRoleFilter] = useState<{[taskId: string]: string}>({});

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

  // Function to update user's display name
  const updateUserDisplayName = async (newDisplayName: string) => {
    if (!user) return;
    
    try {
      await settlementService.updateUser(user.uid, {
        displayName: newDisplayName
      });
      
      // Reload settlement members to reflect the change
      if (currentSettlement) {
        await loadSettlementMembers(currentSettlement.id);
      }
      
      console.log(`Updated display name to: ${newDisplayName}`);
    } catch (error) {
      console.error('Error updating display name:', error);
    }
  };

  // Function to update user's custom display name for privacy
  const updateCustomDisplayName = async (newCustomDisplayName: string) => {
    if (!user) return;
    
    try {
      setProfileUpdateMessage('');
      
      // Validate the custom display name
      const validation = isValidCustomDisplayName(newCustomDisplayName);
      if (!validation.isValid) {
        setProfileUpdateMessage(validation.error || 'Invalid display name');
        return;
      }
      
      await settlementService.updateUser(user.uid, {
        customDisplayName: newCustomDisplayName.trim()
      });
      
      // Reload user data and settlement members to reflect the change
      const updatedUserData = await settlementService.getUser(user.uid);
      setUserData(updatedUserData);
      
      if (currentSettlement) {
        await loadSettlementMembers(currentSettlement.id);
      }
      
      setProfileUpdateMessage('Display name updated successfully!');
      setCustomDisplayName('');
      
      // Auto-close the dialog after 2 seconds
      setTimeout(() => {
        setShowProfileSettings(false);
        setProfileUpdateMessage('');
      }, 2000);
      
    } catch (error) {
      console.error('Error updating custom display name:', error);
      setProfileUpdateMessage('Failed to update display name. Please try again.');
    }
  };

  const handleProjectsUpdate = async () => {
    if (currentSettlement) {
      await loadProjectsForSettlement(currentSettlement.id);
    }
  };

  const handleSelectSettlement = async (settlement: SettlementV2) => {
    setCurrentSettlement(settlement);
    await loadProjectsForSettlement(settlement.id);
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
      // Reload tasks to show updated status
      if (currentSettlement) {
        await loadProjectsForSettlement(currentSettlement.id);
      }
    } catch (err) {
      console.error('Error updating task status:', err);
      setError('Failed to update task status');
    }
  };

  const handleAssignTask = async (taskId: string, assignedTo: string | null) => {
    if (!user || !currentSettlement) {
      setError('User or settlement not available');
      return;
    }

    try {
      // Prepare update data - never use undefined, use null for unassignment
      const updateData: any = {
        status: assignedTo ? 'pending' : 'pending'
      };
      
      // Only include assignedTo field if we're assigning (not null/empty)
      if (assignedTo && assignedTo.trim() !== '') {
        updateData.assignedTo = assignedTo.trim();
      } else {
        // For unassignment, explicitly set to null (Firestore accepts null but not undefined)
        updateData.assignedTo = null;
      }
      
      await settlementService.updateTask(taskId, updateData);
      // Reload tasks to show updated assignment
      await loadProjectsForSettlement(currentSettlement.id);
    } catch (err) {
      console.error('Error assigning task:', err);
      setError('Failed to assign task');
    }
  };

  // New function to handle multiple assignee assignment from checkboxes
  const handleAssignTaskToSelectedUsers = async (taskId: string) => {
    if (!user || !currentSettlement) {
      setError('User or settlement not available');
      return;
    }

    const selectedUsers = selectedAssignees[taskId] || [];
    
    try {
      const updateData: any = {};
      
      if (selectedUsers.length > 0) {
        // Assign to multiple users
        updateData.assignedTo = selectedUsers.length === 1 ? selectedUsers[0] : selectedUsers;
      } else {
        // Unassign (no users selected)
        updateData.assignedTo = null;
      }
      
      await settlementService.updateTask(taskId, updateData);
      
      // Clear the selected assignees for this task
      setSelectedAssignees(prev => ({
        ...prev,
        [taskId]: []
      }));
      
      // Reload tasks to show updated assignment
      await loadProjectsForSettlement(currentSettlement.id);
    } catch (err) {
      console.error('Error assigning task to multiple users:', err);
      setError('Failed to assign task');
    }
  };

  // Toggle user selection for task assignment
  const toggleUserSelection = (taskId: string, userId: string) => {
    setSelectedAssignees(prev => {
      const currentSelections = prev[taskId] || [];
      const isSelected = currentSelections.includes(userId);
      
      return {
        ...prev,
        [taskId]: isSelected 
          ? currentSelections.filter(id => id !== userId)
          : [...currentSelections, userId]
      };
    });
  };

  // Get currently assigned users for a task (handle both string and array formats)
  const getAssignedUsers = (task: TaskV2): string[] => {
    if (!task.assignedTo) return [];
    if (typeof task.assignedTo === 'string') return [task.assignedTo];
    return task.assignedTo;
  };

  // Toggle assignment interface visibility
  const toggleAssignmentInterface = (taskId: string) => {
    setShowAssignmentInterface(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  // Get filtered users for assignment interface
  const getFilteredUsersForAssignment = (taskId: string) => {
    const searchTerm = assignmentSearchTerm[taskId] || '';
    const roleFilter = assignmentRoleFilter[taskId] || 'all';
    
    return settlementMembers.filter(member => {
      const userName = member.user?.displayName || member.user?.email || 'Unknown User';
      const userRole = member.collaboration?.role || 'viewer';
      
      // Search filter
      const matchesSearch = searchTerm === '' || 
        userName.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Role filter
      const matchesRole = roleFilter === 'all' || userRole === roleFilter;
      
      return matchesSearch && matchesRole;
    });
  };

  // Select all filtered users for a task
  const selectAllFilteredUsers = (taskId: string) => {
    const filteredUsers = getFilteredUsersForAssignment(taskId);
    const userIds = filteredUsers.map(member => member.collaboration?.userId || member.user?.id || '').filter(id => id);
    
    setSelectedAssignees(prev => ({
      ...prev,
      [taskId]: userIds
    }));
  };

  // Clear all selected users for a task
  const clearAllSelectedUsers = (taskId: string) => {
    setSelectedAssignees(prev => ({
      ...prev,
      [taskId]: []
    }));
  };

  // Update assignment search term
  const updateAssignmentSearchTerm = (taskId: string, searchTerm: string) => {
    setAssignmentSearchTerm(prev => ({
      ...prev,
      [taskId]: searchTerm
    }));
  };

  // Update assignment role filter
  const updateAssignmentRoleFilter = (taskId: string, roleFilter: string) => {
    setAssignmentRoleFilter(prev => ({
      ...prev,
      [taskId]: roleFilter
    }));
  };

  // Check if current user can assign tasks
  const canAssignTasks = (): boolean => {
    if (!user || !currentSettlement) return false;
    
    // Check if user is admin
    if (isUserAdmin) return true;
    
    // Check if user is settlement owner
    if (currentSettlement.ownerId === user.uid) return true;
    
    // Check if user has assignment permissions in this settlement
    const userMember = settlementMembers.find((member) => 
      (member.collaboration?.userId || member.user?.id) === user.uid
    );
    
    if (userMember?.collaboration?.permissions?.canAssignTasks) {
      return true;
    }
    
    // Check role-based permissions (admin, co_owner roles can assign)
    if (userMember?.collaboration?.role && 
        ['admin', 'co_owner'].includes(userMember.collaboration.role)) {
      return true;
    }
    
    return false;
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
    if (!user || !currentSettlement) {
      setError('User or settlement not available');
      return;
    }
    
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
      case 'assignments': return '👨‍💼';
      case 'contributions': return '🎯';
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

  // Helper function to get inventory status for a task
  const getInventoryStatus = (task: TaskV2) => {
    if (!currentSettlement?.inventory || !task.metadata?.itemId || !task.metadata?.targetQuantity) {
      return null;
    }
    
    const itemId = task.metadata.itemId;
    const needed = parseInt(task.metadata.targetQuantity.toString()) || 0;
    const inventoryItem = currentSettlement.inventory[itemId];
    const available = inventoryItem ? (inventoryItem.quantity - (inventoryItem.reservedQuantity || 0)) : 0;
    
    return {
      available,
      needed,
      itemName: task.metadata.itemName,
      isEnough: available >= needed,
      shortage: Math.max(0, needed - available)
    };
  };

  // Memoized filter function to optimize performance with large task lists
  const filteredTasks = useMemo(() => {
    const filtered = tasks.filter(task => {
      // Search filter
      const matchesSearch = taskSearchTerm === '' || 
        task.title.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(taskSearchTerm.toLowerCase()) ||
        task.metadata?.itemName?.toLowerCase().includes(taskSearchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus = taskStatusFilter === 'all' || task.status === taskStatusFilter;
      
      // Priority filter
      const matchesPriority = taskPriorityFilter === 'all' || task.priority === taskPriorityFilter;
      
      // Assignee filter (updated to handle multiple assignees)
      const assignedUserIds = getAssignedUsers(task);
      const matchesAssignee = taskAssigneeFilter === 'all' || 
        (taskAssigneeFilter === 'unassigned' && assignedUserIds.length === 0) ||
        (taskAssigneeFilter === 'assigned' && assignedUserIds.length > 0) ||
        assignedUserIds.includes(taskAssigneeFilter);
      
      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    });
    
    // Only log when filters actually change, not on every render
    if (tasks.length > 0) {
      console.log('🔍 TASKS FILTERED:', {
        totalTasks: tasks.length,
        filteredTasks: filtered.length,
        filters: {
          search: taskSearchTerm,
          status: taskStatusFilter,
          priority: taskPriorityFilter,
          assignee: taskAssigneeFilter
        }
      });
    }
    
    return filtered;
  }, [tasks, taskSearchTerm, taskStatusFilter, taskPriorityFilter, taskAssigneeFilter]);

  // Keep the function for backward compatibility but use memoized result
  const getFilteredTasks = () => filteredTasks;

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

  const tabs = ['overview', 'settlements', 'projects', 'tasks', 'assignments', 'contributions', 'inventory', 'users'];
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
            <div className="mt-2">
              <button
                onClick={() => setShowProfileSettings(true)}
                className="px-3 py-1 bg-white bg-opacity-20 text-white rounded-lg hover:bg-opacity-30 transition-colors text-sm"
              >
                👤 Profile Settings
              </button>
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
                <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="font-semibold text-gray-800 mb-3">🏗️ Welcome to the Settlement System!</h3>
                  <p className="text-gray-700 text-sm mb-4">
                    Get started by creating your own settlement or joining an existing one with an invite code.
                  </p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowCreateSettlement(true)}
                      className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                    >
                      🏗️ Create Settlement
                    </button>
                    <button 
                      onClick={() => setShowJoinDialog(true)}
                      className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                    >
                      🤝 Join Settlement
                    </button>
                  </div>
                  <p className="text-gray-600 text-xs mt-3 text-center">
                    Or visit the <button 
                      onClick={() => setActiveView('settlements')}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      Settlements tab
                    </button> for more options
                  </p>
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
                <div className="flex gap-2">
                  <button 
                    onClick={() => setShowJoinDialog(true)}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    🤝 Join Settlement
                  </button>
                  <button 
                    onClick={() => setShowCreateSettlement(true)}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    + Create Settlement
                  </button>
                </div>
              </div>
              
              {settlements.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500 mb-6">
                    Welcome to the Settlement System! Get started by creating your own settlement or joining an existing one.
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                      <h3 className="font-semibold text-blue-800 mb-3">🏗️ Create Settlement</h3>
                      <p className="text-blue-700 text-sm mb-4">
                        Start your own settlement to manage projects, inventory, and collaborate with others.
                      </p>
                      <button 
                        onClick={() => setShowCreateSettlement(true)}
                        className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Create New Settlement
                      </button>
                    </div>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <h3 className="font-semibold text-green-800 mb-3">🤝 Join Settlement</h3>
                      <p className="text-green-700 text-sm mb-4">
                        Join an existing settlement using an invite code to collaborate on projects.
                      </p>
                      <button 
                        onClick={() => setShowJoinDialog(true)}
                        className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                      >
                        Join with Code
                      </button>
                    </div>
                  </div>
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
                            onClick={() => handleSelectSettlement(settlement)}
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
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">📋 Tasks</h2>
                <div className="text-sm text-gray-600">
                  {getFilteredTasks().length} of {tasks.length} tasks
                  {/* Cache buster v2.0 - Enhanced with filters and inventory */}
                </div>
              </div>
              
              {/* Filter Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                  <input
                    type="text"
                    value={taskSearchTerm}
                    onChange={(e) => setTaskSearchTerm(e.target.value)}
                    placeholder="Search tasks..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={taskStatusFilter}
                    onChange={(e) => setTaskStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={taskPriorityFilter}
                    onChange={(e) => setTaskPriorityFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="all">All Priority</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assignment</label>
                  <select
                    value={taskAssigneeFilter}
                    onChange={(e) => setTaskAssigneeFilter(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="all">All Tasks</option>
                    <option value="unassigned">Unassigned</option>
                    <option value="assigned">Assigned</option>
                    {settlementMembers.map(member => (
                      <option key={member.collaboration?.userId || member.user?.id} value={member.collaboration?.userId || member.user?.id}>
                        {member.user?.displayName || member.user?.email || 'Unknown User'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {tasks.length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No tasks found. Create projects and add tasks to get started!
                </div>
              ) : getFilteredTasks().length === 0 ? (
                <div className="text-gray-500 text-center py-8">
                  No tasks match the current filters. Try adjusting your search criteria.
                </div>
              ) : (
                <div className="space-y-4">
                  {getFilteredTasks().map((task) => {
                    const project = projects.find(p => p.id === task.projectId);
                    const inventoryStatus = getInventoryStatus(task);
                    const assignedUserIds = getAssignedUsers(task);
                    const assignedMembers = settlementMembers.filter(m => 
                      assignedUserIds.includes(m.collaboration?.userId || m.user?.id || '')
                    );
                    
                    return (
                      <div key={task.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-1">{task.title}</h3>
                            
                            {/* Inventory Status Display */}
                            {inventoryStatus && (
                              <div className={`text-sm px-3 py-1 rounded mb-2 inline-block ${
                                inventoryStatus.isEnough 
                                  ? 'bg-green-100 text-green-700 border border-green-200' 
                                  : 'bg-red-100 text-red-700 border border-red-200'
                              }`}>
                                📦 Inventory: {inventoryStatus.available}/{inventoryStatus.needed} available
                                {inventoryStatus.isEnough ? (
                                  <span className="font-medium"> ✅ Ready to complete</span>
                                ) : (
                                  <span className="font-medium"> • Need {inventoryStatus.shortage} more</span>
                                )}
                              </div>
                            )}
                            
                            {task.description && (
                              <p className="text-gray-600 text-sm mb-2">{task.description}</p>
                            )}
                            
                            <div className="flex flex-wrap gap-2 mb-2">
                              <span className={`px-2 py-1 text-xs rounded ${getStatusColor(task.status)}`}>
                                {task.status.replace('_', ' ')}
                              </span>
                              <span className={`px-2 py-1 text-xs rounded ${getPriorityColor(task.priority)}`}>
                                {task.priority}
                              </span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                {project?.name || 'Unknown Project'}
                              </span>
                              {assignedMembers.length > 0 ? (
                                assignedMembers.map((member, index) => (
                                  <span key={index} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                                    👤 {member.user?.displayName || member.user?.email || 'Unknown User'}
                                  </span>
                                ))
                              ) : (
                                <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                                  Unassigned
                                </span>
                              )}
                            </div>
                            
                            {/* User Assignment Interface */}
                            {canAssignTasks() && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
                                <div className="flex justify-between items-center mb-2">
                                  <h4 className="text-sm font-medium text-gray-700">
                                    Assign to Users ({settlementMembers.length} available)
                                  </h4>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => toggleAssignmentInterface(task.id)}
                                      className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
                                    >
                                      {showAssignmentInterface[task.id] ? 'Hide' : 'Show'} Users
                                    </button>
                                    <button
                                      onClick={() => handleAssignTaskToSelectedUsers(task.id)}
                                      disabled={(selectedAssignees[task.id] || []).length === 0}
                                      className={`px-3 py-1 rounded text-sm font-medium ${
                                        (selectedAssignees[task.id] || []).length > 0
                                          ? 'bg-blue-500 text-white hover:bg-blue-600'
                                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                      }`}
                                    >
                                      Assign ({(selectedAssignees[task.id] || []).length})
                                    </button>
                                  </div>
                                </div>
                                
                                {showAssignmentInterface[task.id] && (
                                  <div className="space-y-3">
                                    {/* Search and Filter Controls */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                      <div>
                                        <input
                                          type="text"
                                          placeholder="Search users..."
                                          value={assignmentSearchTerm[task.id] || ''}
                                          onChange={(e) => updateAssignmentSearchTerm(task.id, e.target.value)}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        />
                                      </div>
                                      <div>
                                        <select
                                          value={assignmentRoleFilter[task.id] || 'all'}
                                          onChange={(e) => updateAssignmentRoleFilter(task.id, e.target.value)}
                                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                        >
                                          <option value="all">All Roles</option>
                                          <option value="owner">Owner</option>
                                          <option value="co_owner">Co-Owner</option>
                                          <option value="admin">Admin</option>
                                          <option value="contributor">Contributor</option>
                                          <option value="viewer">Viewer</option>
                                        </select>
                                      </div>
                                    </div>
                                    
                                    {/* Quick Actions */}
                                    <div className="flex gap-2 flex-wrap">
                                      <button
                                        onClick={() => selectAllFilteredUsers(task.id)}
                                        className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                                      >
                                        Select All Filtered
                                      </button>
                                      <button
                                        onClick={() => clearAllSelectedUsers(task.id)}
                                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
                                      >
                                        Clear All
                                      </button>
                                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                                        {getFilteredUsersForAssignment(task.id).length} users shown
                                      </span>
                                    </div>
                                    
                                    {/* User List */}
                                    <div className="max-h-60 overflow-y-auto border border-gray-200 rounded">
                                      {getFilteredUsersForAssignment(task.id).length === 0 ? (
                                        <div className="p-4 text-center text-gray-500">
                                          No users match the current filters
                                        </div>
                                      ) : (
                                        <div className="divide-y divide-gray-200">
                                          {getFilteredUsersForAssignment(task.id).map((member) => {
                                            const userId = member.collaboration?.userId || member.user?.id || '';
                                            const isSelected = (selectedAssignees[task.id] || []).includes(userId);
                                            const isCurrentlyAssigned = assignedUserIds.includes(userId);
                                            const userRole = member.collaboration?.role || 'viewer';
                                            
                                            return (
                                              <label 
                                                key={userId}
                                                className={`flex items-center p-3 cursor-pointer hover:bg-gray-100 ${
                                                  isSelected ? 'bg-blue-50' : ''
                                                } ${isCurrentlyAssigned ? 'bg-purple-50' : ''}`}
                                              >
                                                <input
                                                  type="checkbox"
                                                  checked={isSelected}
                                                  onChange={() => toggleUserSelection(task.id, userId)}
                                                  className="mr-3"
                                                />
                                                <div className="flex-1 min-w-0">
                                                  <div className={`text-sm ${isCurrentlyAssigned ? 'font-semibold text-purple-700' : 'text-gray-900'}`}>
                                                    {member.user?.displayName || member.user?.email || 'Unknown User'}
                                                    {isCurrentlyAssigned && (
                                                      <span className="ml-2 text-xs text-purple-600">(currently assigned)</span>
                                                    )}
                                                  </div>
                                                  <div className="text-xs text-gray-500 capitalize">
                                                    {userRole.replace('_', ' ')}
                                                  </div>
                                                </div>
                                              </label>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            
                            <div className="text-xs text-gray-500 mt-2">
                              Created: {task.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <select 
                              value={task.status}
                              onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value as TaskV2['status'])}
                              className="px-2 py-1 border border-gray-300 rounded text-sm hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            {/* Important Notice about Inventory Separation */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="text-blue-400 text-xl">ℹ️</div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Settlement vs Personal Inventory</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p className="mb-2">
                      <strong>This is your settlement's shared inventory</strong> - separate from your personal inventory used in the BitCalculator.
                    </p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>Settlement Inventory:</strong> Shared with all settlement members, used for collaborative projects</li>
                      <li><strong>Personal Inventory:</strong> Your private inventory in the BitCalculator, not shared with others</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <SettlementInventoryV2 currentSettlement={currentSettlement} />
          </div>
        )}

        {activeView === 'users' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">👥 Settlement Members</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateUserDisplayName('Artzp')}
                    className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600 text-sm"
                    title="Update your display name to Artzp for privacy"
                  >
                    🔒 Set Display Name to Artzp
                  </button>
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
                              {getMemberInitials(member)}
                            </div>
                            <div>
                              <h3 className="font-semibold">{getPrivateDisplayName(member, user?.uid)}</h3>
                              <p className="text-sm text-gray-600">{getPrivateEmailDisplay(member, user?.uid)}</p>
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
                                onChange={(e) => {
                                  if (currentSettlement) {
                                    handleChangeRole(member.collaboration.userId || member.user.id, currentSettlement.id, e.target.value as SettlementCollaboratorRole);
                                  }
                                }}
                                className="text-sm border border-gray-300 rounded px-2 py-1"
                                disabled={!user || !currentSettlement || user.uid !== currentSettlement.ownerId}
                              >
                                <option value="viewer">Viewer</option>
                                <option value="contributor">Contributor</option>
                                <option value="admin">Admin</option>
                              </select>
                              
                              {user && currentSettlement && user.uid === currentSettlement.ownerId && (
                                <button
                                  onClick={() => {
                                    console.log('DEBUG: Member data for removal:', {
                                      member,
                                      collaborationUserId: member.collaboration?.userId,
                                      userObjectId: member.user?.id,
                                      collaborationId: member.collaboration?.id,
                                      finalId: member.collaboration?.userId || member.user?.id
                                    });
                                    if (currentSettlement) {
                                      handleRemoveMember(member.collaboration?.userId || member.user?.id, currentSettlement.id);
                                    }
                                  }}
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

        {/* Assignments Tab */}
        {activeView === 'assignments' && (
          <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">👨‍💼 Task Assignments</h2>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowTaskAssignmentInterface(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  🎯 Assign Tasks
                </button>
                <button
                  onClick={() => setShowContributionDashboard(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  📊 View Dashboard
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-3">🎯 For Admins</h3>
                <ul className="text-blue-700 text-sm space-y-2">
                  <li>• Assign tasks to multiple settlement members</li>
                  <li>• Set deadlines and requirements</li>
                  <li>• Track assignment progress</li>
                  <li>• Manage workload distribution</li>
                </ul>
                <button
                  onClick={() => setShowTaskAssignmentInterface(true)}
                  className="mt-3 w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  Open Assignment Interface
                </button>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-3">📈 Progress Tracking</h3>
                <ul className="text-green-700 text-sm space-y-2">
                  <li>• View all contributions and submissions</li>
                  <li>• Approve or reject member work</li>
                  <li>• See contribution leaderboards</li>
                  <li>• Track project completion rates</li>
                </ul>
                <button
                  onClick={() => setShowContributionDashboard(true)}
                  className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  Open Contribution Dashboard
                </button>
              </div>
            </div>

            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">💡 How Task Assignments Work</h3>
              <p className="text-yellow-700 text-sm">
                Admins can assign specific tasks to settlement members. Members receive their assignments 
                and can submit their progress through the contribution system. This enables better 
                collaboration on large projects like town upgrades where multiple people need to 
                contribute different materials.
              </p>
            </div>
          </div>
        )}

        {/* Contributions Tab */}
        {activeView === 'contributions' && (
          <div className="bg-white rounded-xl p-6 shadow-lg border border-slate-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">🎯 My Contributions</h2>
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowContributionInterface(true)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  📤 Submit Work
                </button>
                <button
                  onClick={() => setShowContributionDashboard(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  📊 View Dashboard
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-green-50 p-4 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-3">📤 Submit Your Work</h3>
                <ul className="text-green-700 text-sm space-y-2">
                  <li>• View your assigned tasks</li>
                  <li>• Submit completed materials</li>
                  <li>• Track your contribution progress</li>
                  <li>• Add notes and proof of work</li>
                </ul>
                <button
                  onClick={() => setShowContributionInterface(true)}
                  className="mt-3 w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                >
                  Submit Contributions
                </button>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h3 className="font-semibold text-purple-800 mb-3">📊 View Statistics</h3>
                <ul className="text-purple-700 text-sm space-y-2">
                  <li>• See contribution leaderboards</li>
                  <li>• View settlement-wide progress</li>
                  <li>• Track approval status</li>
                  <li>• Monitor project completion</li>
                </ul>
                <button
                  onClick={() => setShowContributionDashboard(true)}
                  className="mt-3 w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 text-sm"
                >
                  View Dashboard
                </button>
              </div>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">🚀 Contribution Process</h3>
              <div className="text-blue-700 text-sm space-y-1">
                <p><strong>1.</strong> Get assigned tasks from settlement admins</p>
                <p><strong>2.</strong> Work on gathering/crafting the required materials</p>
                <p><strong>3.</strong> Submit your completed work with quantities and notes</p>
                <p><strong>4.</strong> Wait for admin approval (if required)</p>
                <p><strong>5.</strong> See your contributions reflected in project progress</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Modal Components */}
              {showTaskAssignmentInterface && (
          <TaskAssignmentInterface 
            onClose={() => setShowTaskAssignmentInterface(false)} 
            currentSettlement={currentSettlement}
            tasks={tasks}
            projects={projects}
            settlementMembers={settlementMembers}
          />
        )}

      {showContributionInterface && (
        <ContributionSubmissionInterface onClose={() => setShowContributionInterface(false)} />
      )}

      {showContributionDashboard && (
        <ContributionDashboard onClose={() => setShowContributionDashboard(false)} />
      )}

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

      {/* Profile Settings Modal */}
      {showProfileSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 shadow-2xl max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">👤 Profile Settings</h3>
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">🔒 Privacy Settings</h4>
                <p className="text-blue-700 text-sm">
                  Set a custom display name to protect your privacy. Other users will see this name instead of your real name.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Current Display Name
                </label>
                <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                  {userData?.customDisplayName || userData?.displayName || 'Not set'}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Display Name
                </label>
                <input
                  type="text"
                  value={customDisplayName}
                  onChange={(e) => setCustomDisplayName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your preferred display name (e.g., Artzp)"
                />
                <p className="text-xs text-gray-500 mt-1">
                  This name will be shown to other settlement members instead of your real name.
                </p>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-700 text-sm">
                  ✅ <strong>Privacy Protection:</strong> Your email will be hidden from other users and only visible to you.
                </p>
              </div>
              
              {profileUpdateMessage && (
                <div className={`border rounded-lg p-3 ${
                  profileUpdateMessage.includes('successfully') 
                    ? 'bg-green-50 border-green-200 text-green-700' 
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {profileUpdateMessage}
                </div>
              )}
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => updateCustomDisplayName(customDisplayName)}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                disabled={!customDisplayName.trim()}
              >
                Update Display Name
              </button>
              <button
                onClick={() => {
                  setShowProfileSettings(false);
                  setCustomDisplayName('');
                  setProfileUpdateMessage('');
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