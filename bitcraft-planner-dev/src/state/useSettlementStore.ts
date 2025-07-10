import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Player, Project, ProjectItem, Task, SettlementInventoryItem, SettlementData, TaskAssignment, TaskContribution } from '../types/Settlement';
import { ItemsData } from '../types/Item';
import { createProjectFromItem, createEmptyProject, addItemToProject, generateTasksForProject, calculateProjectProgress, getAvailableTasks, updateTasksForInventoryChange, getProjectMaterials } from '../utils/settlementIntegration';
import { projectLogger } from '../utils/projectLogger';

// Flag to trigger immediate save for critical operations
let triggerImmediateSave: ((settlement: SettlementData) => void) | null = null;

export const setImmediateSaveCallback = (callback: (settlement: SettlementData) => void) => {
  triggerImmediateSave = callback;
};

interface SettlementStore {
  // Core data
  settlement: SettlementData;
  
  // Player management
  addPlayer: (name: string) => void;
  updatePlayer: (playerId: string, updates: Partial<Player>) => void;
  removePlayer: (playerId: string) => void;
  getPlayerWorkload: (playerId: string) => { tasks: number; projects: number };
  
  // Project management - with named projects and multiple items
  createProject: (name: string, description?: string) => string;
  createLegacyProject: (items: ItemsData, itemId: string, quantity: number, recipeIndex?: number) => string | null;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;
  addItemToProject: (projectId: string, itemId: string, itemName: string, quantity: number, recipeIndex?: number) => void;
  removeItemFromProject: (projectId: string, itemId: string) => void;
  generateTasksForProject: (items: ItemsData, projectId: string) => void;
  assignPlayersToProject: (projectId: string, playerIds: string[]) => void;
  getProjectProgress: (projectId: string) => number;
  
  // Task management
  updateTask: (task: Task) => void;
  assignTaskToPlayer: (taskId: string, playerId: string) => void;
  completeTask: (taskId: string, completedQuantity: number) => void;
  getAvailableTasks: () => Task[];
  
  // Enhanced task assignment and contribution methods
  addTaskAssignment: (assignment: TaskAssignment) => void;
  updateTaskAssignment: (assignmentId: string, updates: Partial<TaskAssignment>) => void;
  removeTaskAssignment: (assignmentId: string) => void;
  getTaskAssignments: (taskId?: string, userId?: string) => TaskAssignment[];
  
  addTaskContribution: (contribution: TaskContribution) => void;
  updateTaskContribution: (contributionId: string, updates: Partial<TaskContribution>) => void;
  removeTaskContribution: (contributionId: string) => void;
  getTaskContributions: (taskId?: string, userId?: string) => TaskContribution[];
  approveContribution: (contributionId: string, approvedBy: string) => void;
  rejectContribution: (contributionId: string, rejectedBy: string, reason: string) => void;
  
  // Inventory management
  addInventoryItem: (itemId: string, itemName: string, quantity: number, storageLocation?: string) => void;
  updateInventoryItem: (itemId: string, updates: Partial<SettlementInventoryItem>) => void;
  removeInventoryItem: (itemId: string) => void;
  reserveInventoryQuantity: (itemId: string, quantity: number) => boolean;
  releaseInventoryQuantity: (itemId: string, quantity: number) => void;
  getAvailableQuantity: (itemId: string) => number;
  getLowStockItems: (threshold?: number) => SettlementInventoryItem[];
  updateTasksForInventoryChange: (items: ItemsData, projectId: string) => void;
  getProjectMaterials: (items: ItemsData, projectId: string) => { itemId: string; itemName: string; quantity: number; isBaseItem: boolean; inInventory: number; stillNeeded: number }[];
  
  // Utility functions
  getPlayerAssignments: (playerId: string) => { projects: Project[]; tasks: Task[] };
  getProjectTasks: (projectId: string) => Task[];
  getActiveProjects: () => Project[];
  getCompletedProjects: () => Project[];
  
  // Reset function
  resetSettlement: () => void;

  // Load settlement data from Firebase
  loadSettlement: (settlementData: SettlementData) => void;

  // Set settlement data (for Firebase loading)
  setSettlement: (settlementData: SettlementData | null, options?: { force?: boolean }) => void;

  // New methods for inventory reservation
  reserveMaterialsForProject: (items: ItemsData, projectId: string) => boolean;
  releaseMaterialsForProject: (items: ItemsData, projectId: string) => void;
}

const createInitialSettlement = (): SettlementData => ({
  id: 'settlement-1',
  name: 'BitCraft Settlement',
  dateCreated: new Date(),
  players: [],
  projects: [],
  tasks: [],
  inventory: {},
  taskContributions: [],
  taskAssignments: [],
  memberRoles: [],
  settings: {
    autoAssignTasks: false,
    lowStockThreshold: 10,
    enableNotifications: true,
    requireContributionApproval: true,
    maxAssigneesPerTask: 5,
    defaultTaskDeadlineDays: 7
  }
});

export const useSettlementStore = create<SettlementStore>()(
  devtools((set, get) => ({
    settlement: createInitialSettlement(),
    
    // Player management
    addPlayer: (name: string) => {
      set((state) => ({
        settlement: {
          ...state.settlement,
          players: [...state.settlement.players, {
            id: `player-${Date.now()}`,
            name: name.trim(),
            dateAdded: new Date(),
            isActive: true
          }]
        }
      }));
    },
    
    updatePlayer: (playerId: string, updates: Partial<Player>) => {
      set((state) => ({
        settlement: {
          ...state.settlement,
          players: state.settlement.players.map(player =>
            player.id === playerId ? { ...player, ...updates } : player
          )
        }
      }));
    },
    
    removePlayer: (playerId: string) => {
      set((state) => ({
        settlement: {
          ...state.settlement,
          players: state.settlement.players.filter(p => p.id !== playerId),
          // Remove player from all project assignments
          projects: state.settlement.projects.map(project => ({
            ...project,
            assignedPlayers: project.assignedPlayers.filter(id => id !== playerId)
          })),
          // Unassign player from all tasks
          tasks: state.settlement.tasks.map(task => ({
            ...task,
            assignedPlayerId: task.assignedPlayerId === playerId ? undefined : task.assignedPlayerId
          }))
        }
      }));
    },
    
    getPlayerWorkload: (playerId: string) => {
      const { settlement } = get();
      const tasks = settlement.tasks.filter(task => 
        task.assignedPlayerId === playerId && 
        (task.status === 'planned' || task.status === 'in_progress')
      ).length;
      
      const projects = settlement.projects.filter(project => 
        project.assignedPlayers.includes(playerId)
      ).length;
      
      return { tasks, projects };
    },
    
    // Project management - with named projects and multiple items
    createProject: (name: string, description?: string) => {
      const projectId = `project-${Date.now()}`;
      const projectData = createEmptyProject(name, description);
      
      const project: Project = {
        id: projectId,
        ...projectData,
        dateCreated: new Date(),
        progressPercentage: 0
      };
      
      projectLogger.logProjectCreate(
        'useSettlementStore.createProject',
        { projectId, name, description }
      );
      
      set((state) => {
        const newSettlement = {
          ...state.settlement,
          projects: [...state.settlement.projects, project]
        };
        
        projectLogger.logStateChange(
          'useSettlementStore.createProject',
          'PROJECT_ADDED_TO_SETTLEMENT',
          newSettlement
        );
        
        console.log('🔄 Project created, new settlement:', {
          projectCount: newSettlement.projects.length,
          latestProject: project.name,
          allProjects: newSettlement.projects.map(p => p.name)
        });
        
        // Trigger immediate save for critical operations
        if (triggerImmediateSave) {
          // Use a longer delay to ensure state is fully updated
          setTimeout(() => {
            console.log('⚡ Triggering immediate save with projects:', newSettlement.projects.length);
            projectLogger.logAutoSave(
              'useSettlementStore.createProject',
              'IMMEDIATE_SAVE_TRIGGERED',
              'Project creation',
              { projectCount: newSettlement.projects.length }
            );
            triggerImmediateSave!(newSettlement);
          }, 500); // Increased delay
        }
        
        return { settlement: newSettlement };
      });
      
      return projectId;
    },
    
    // Legacy method for backward compatibility
    createLegacyProject: (items: ItemsData, itemId: string, quantity: number, recipeIndex = 0) => {
      const { settlement } = get();
      const projectData = createProjectFromItem(items, itemId, quantity, recipeIndex, settlement.inventory);
      if (!projectData) return null;
      
      const projectId = `project-${Date.now()}`;
      const project: Project = {
        id: projectId,
        ...projectData.project,
        dateCreated: new Date(),
        progressPercentage: 0
      };
      
      // Create tasks for this project
      const tasks: Task[] = projectData.tasks.map((taskData, index) => ({
        id: `task-${Date.now()}-${index}`,
        ...taskData,
        projectId,
        status: 'planned',
        priority: 'medium',
        dateCreated: new Date()
      }));
      
      set((state) => ({
        settlement: {
          ...state.settlement,
          projects: [...state.settlement.projects, project],
          tasks: [...state.settlement.tasks, ...tasks]
        }
      }));
      
      // Try to reserve materials for this project
      get().reserveMaterialsForProject(items, projectId);
      
      return projectId;
    },
    
    addItemToProject: (projectId: string, itemId: string, itemName: string, quantity: number, recipeIndex = 0) => {
      const newItem = addItemToProject({} as Project, itemId, itemName, quantity, recipeIndex);
      
      set((state) => {
        const project = state.settlement.projects.find(p => p.id === projectId);
        if (!project) {
          console.error('❌ Project not found:', projectId);
          return state;
        }
        
        const newSettlement = {
          ...state.settlement,
          projects: state.settlement.projects.map(project =>
            project.id === projectId 
              ? { ...project, items: [...project.items, newItem] }
              : project
          )
        };
        
        console.log('📦 Item added to project:', {
          projectId,
          itemName,
          quantity,
          totalItemsInProject: newSettlement.projects.find(p => p.id === projectId)?.items.length || 0
        });
        
        // Trigger immediate save for critical operations
        if (triggerImmediateSave) {
          setTimeout(() => triggerImmediateSave!(newSettlement), 100);
        }
        
        return { settlement: newSettlement };
      });
    },
    
    removeItemFromProject: (projectId: string, itemId: string) => {
      set((state) => {
        const project = state.settlement.projects.find(p => p.id === projectId);
        if (!project) {
          console.error('❌ Project not found:', projectId);
          return state;
        }
        
        const newSettlement = {
          ...state.settlement,
          projects: state.settlement.projects.map(project =>
            project.id === projectId 
              ? { ...project, items: project.items.filter(item => item.itemId !== itemId) }
              : project
          )
        };
        
        console.log('🗑️ Item removed from project:', {
          projectId,
          itemId,
          totalItemsInProject: newSettlement.projects.find(p => p.id === projectId)?.items.length || 0
        });
        
        // Trigger immediate save for critical operations
        if (triggerImmediateSave) {
          setTimeout(() => triggerImmediateSave!(newSettlement), 100);
        }
        
        return { settlement: newSettlement };
      });
    },
    
    generateTasksForProject: (items: ItemsData, projectId: string) => {
      const { settlement } = get();
      const project = settlement.projects.find(p => p.id === projectId);
      if (!project) return;
      
      const taskData = generateTasksForProject(items, project, settlement.inventory);
      
      // Remove existing tasks for this project
      const existingTasks = settlement.tasks.filter(t => t.projectId !== projectId);
      
      // Create new tasks
      const tasks: Task[] = taskData.tasks.map((taskData, index) => ({
        id: `task-${Date.now()}-${index}`,
        ...taskData,
        projectId,
        status: 'planned',
        priority: 'medium',
        dateCreated: new Date()
      }));
      
      set((state) => {
        const newSettlement = {
          ...state.settlement,
          tasks: [...existingTasks, ...tasks]
        };
        
        // Trigger immediate save for critical operations
        if (triggerImmediateSave) {
          setTimeout(() => triggerImmediateSave!(newSettlement), 100);
        }
        
        return { settlement: newSettlement };
      });
      
      // Reserve materials for this project
      get().reserveMaterialsForProject(items, projectId);
    },
    
    updateProject: (projectId: string, updates: Partial<Project>) => {
      set((state) => {
        const newSettlement = {
          ...state.settlement,
          projects: state.settlement.projects.map(project =>
            project.id === projectId ? { ...project, ...updates } : project
          )
        };
        
        // Trigger immediate save for critical operations
        if (triggerImmediateSave) {
          setTimeout(() => triggerImmediateSave!(newSettlement), 100);
        }
        
        return { settlement: newSettlement };
      });
    },
    
    deleteProject: (projectId: string) => {
      const currentState = get();
      const projectToDelete = currentState.settlement.projects.find(p => p.id === projectId);
      
      projectLogger.logProjectDelete(
        'useSettlementStore.deleteProject',
        projectId,
        projectToDelete?.name
      );
      
      set((state) => {
        const newSettlement = {
          ...state.settlement,
          projects: state.settlement.projects.filter(p => p.id !== projectId),
          tasks: state.settlement.tasks.filter(t => t.projectId !== projectId)
        };
        
        projectLogger.logStateChange(
          'useSettlementStore.deleteProject',
          'PROJECT_DELETED_FROM_SETTLEMENT',
          newSettlement
        );
        
        // Trigger immediate save for critical operations
        if (triggerImmediateSave) {
          setTimeout(() => {
            projectLogger.logAutoSave(
              'useSettlementStore.deleteProject',
              'IMMEDIATE_SAVE_TRIGGERED',
              'Project deletion',
              { projectCount: newSettlement.projects.length }
            );
            triggerImmediateSave!(newSettlement);
          }, 100);
        }
        
        return { settlement: newSettlement };
      });
    },
    
    assignPlayersToProject: (projectId: string, playerIds: string[]) => {
      set((state) => {
        const newSettlement = {
          ...state.settlement,
          projects: state.settlement.projects.map(project =>
            project.id === projectId 
              ? { ...project, assignedPlayers: playerIds }
              : project
          )
        };
        
        // Trigger immediate save for critical operations
        if (triggerImmediateSave) {
          setTimeout(() => triggerImmediateSave!(newSettlement), 100);
        }
        
        return { settlement: newSettlement };
      });
    },
    
    getProjectProgress: (projectId: string) => {
      const { settlement } = get();
      const project = settlement.projects.find(p => p.id === projectId);
      if (!project) return 0;
      return calculateProjectProgress(project, settlement.tasks);
    },
    
    // Task management
    updateTask: (task: Task) => {
      set((state) => {
        const taskIndex = state.settlement.tasks.findIndex(t => t.id === task.id);
        if (taskIndex === -1) {
          console.error('❌ Task not found for update:', task.id);
          return state;
        }
        
        const newSettlement = {
          ...state.settlement,
          tasks: state.settlement.tasks.map((t, index) =>
            index === taskIndex ? { ...t, ...task } : t
          )
        };
        
        console.log('📝 Task updated:', {
          taskId: task.id,
          updates: task,
          taskName: task.itemName
        });
        
        // Trigger immediate save for critical operations
        if (triggerImmediateSave) {
          setTimeout(() => triggerImmediateSave!(newSettlement), 100);
        }
        
        return { settlement: newSettlement };
      });
    },
    
    assignTaskToPlayer: (taskId: string, playerId: string) => {
      set((state) => {
        const task = state.settlement.tasks.find(t => t.id === taskId);
        if (!task) {
          console.error('❌ Task not found for assignment:', taskId);
          return state;
        }
        
        const player = state.settlement.players.find(p => p.id === playerId);
        const playerName = player?.name || playerId;
        
        const newSettlement = {
          ...state.settlement,
          tasks: state.settlement.tasks.map(task =>
            task.id === taskId 
              ? { ...task, assignedPlayerId: playerId, status: 'in_progress' as const, dateAssigned: new Date() }
              : task
          )
        };
        
        console.log('👤 Task assigned to player:', {
          taskId,
          taskName: task.itemName,
          playerId,
          playerName,
          status: 'in_progress'
        });
        
        // Trigger immediate save for critical operations
        if (triggerImmediateSave) {
          setTimeout(() => triggerImmediateSave!(newSettlement), 100);
        }
        
        return { settlement: newSettlement };
      });
    },
    
    completeTask: (taskId: string, completedQuantity: number) => {
      set((state) => {
        const task = state.settlement.tasks.find(t => t.id === taskId);
        if (!task) {
          console.error('❌ Task not found for completion:', taskId);
          return state;
        }
        
        const finalQuantity = Math.min(completedQuantity, task.targetQuantity);
        const isCompleted = finalQuantity >= task.targetQuantity;
        
        const newSettlement = {
          ...state.settlement,
          tasks: state.settlement.tasks.map(task =>
            task.id === taskId 
              ? { 
                  ...task, 
                  completedQuantity: finalQuantity,
                  status: isCompleted ? 'completed' as const : task.status,
                  dateCompleted: isCompleted ? new Date() : task.dateCompleted
                }
              : task
          )
        };
        
        console.log('✅ Task progress updated:', {
          taskId,
          taskName: task.itemName,
          completedQuantity: finalQuantity,
          targetQuantity: task.targetQuantity,
          status: isCompleted ? 'completed' : task.status,
          isCompleted
        });
        
        // Trigger immediate save for critical operations
        if (triggerImmediateSave) {
          setTimeout(() => triggerImmediateSave!(newSettlement), 100);
        }
        
        return { settlement: newSettlement };
      });
    },
    
    getAvailableTasks: () => {
      const { settlement } = get();
      return getAvailableTasks(settlement.tasks);
    },
    
    // Enhanced task assignment and contribution methods
    addTaskAssignment: (assignment: TaskAssignment) => {
      set((state) => {
        const newSettlement = {
          ...state.settlement,
          taskAssignments: [...state.settlement.taskAssignments, assignment]
        };
        
        // Also update the task's assignedTo array
        const updatedTasks = newSettlement.tasks.map(task =>
          task.id === assignment.taskId ? {
            ...task,
            assignedTo: [...(task.assignedTo || []), assignment.userId],
            assignmentStatus: 'assigned' as const
          } : task
        );
        
        const finalSettlement = {
          ...newSettlement,
          tasks: updatedTasks
        };
        
        console.log('✅ Task assignment added:', {
          assignmentId: assignment.id,
          taskId: assignment.taskId,
          userId: assignment.userId
        });
        
        // Trigger immediate save for critical operations
        if (triggerImmediateSave) {
          setTimeout(() => triggerImmediateSave!(finalSettlement), 100);
        }
        
        return { settlement: finalSettlement };
      });
    },
    
    updateTaskAssignment: (assignmentId: string, updates: Partial<TaskAssignment>) => {
      set((state) => {
        const newSettlement = {
          ...state.settlement,
          taskAssignments: state.settlement.taskAssignments.map(assignment =>
            assignment.id === assignmentId ? { ...assignment, ...updates } : assignment
          )
        };
        
        console.log('📝 Task assignment updated:', { assignmentId, updates });
        
        // Trigger immediate save for critical operations
        if (triggerImmediateSave) {
          setTimeout(() => triggerImmediateSave!(newSettlement), 100);
        }
        
        return { settlement: newSettlement };
      });
    },
    
    removeTaskAssignment: (assignmentId: string) => {
      set((state) => {
        const assignment = state.settlement.taskAssignments.find(a => a.id === assignmentId);
        if (!assignment) return state;
        
        const newSettlement = {
          ...state.settlement,
          taskAssignments: state.settlement.taskAssignments.filter(a => a.id !== assignmentId)
        };
        
        // Also remove from task's assignedTo array
        const updatedTasks = newSettlement.tasks.map(task =>
          task.id === assignment.taskId ? {
            ...task,
            assignedTo: (task.assignedTo || []).filter(id => id !== assignment.userId)
          } : task
        );
        
        const finalSettlement = {
          ...newSettlement,
          tasks: updatedTasks
        };
        
        console.log('❌ Task assignment removed:', { assignmentId });
        
        // Trigger immediate save for critical operations
        if (triggerImmediateSave) {
          setTimeout(() => triggerImmediateSave!(finalSettlement), 100);
        }
        
        return { settlement: finalSettlement };
      });
    },
    
    getTaskAssignments: (taskId?: string, userId?: string) => {
      const { settlement } = get();
      return settlement.taskAssignments.filter(assignment => 
        (!taskId || assignment.taskId === taskId) && 
        (!userId || assignment.userId === userId)
      );
    },
    
    addTaskContribution: (contribution: TaskContribution) => {
      set((state) => {
        const newSettlement = {
          ...state.settlement,
          taskContributions: [...state.settlement.taskContributions, contribution]
        };
        
        console.log('💰 Task contribution added:', {
          contributionId: contribution.id,
          taskId: contribution.taskId,
          userId: contribution.userId,
          itemsCount: contribution.itemsContributed.length
        });
        
        // Trigger immediate save for critical operations
        if (triggerImmediateSave) {
          setTimeout(() => triggerImmediateSave!(newSettlement), 100);
        }
        
        return { settlement: newSettlement };
      });
    },
    
    updateTaskContribution: (contributionId: string, updates: Partial<TaskContribution>) => {
      set((state) => {
        const newSettlement = {
          ...state.settlement,
          taskContributions: state.settlement.taskContributions.map(contribution =>
            contribution.id === contributionId ? { ...contribution, ...updates } : contribution
          )
        };
        
        console.log('📝 Task contribution updated:', { contributionId, updates });
        
        // Trigger immediate save for critical operations
        if (triggerImmediateSave) {
          setTimeout(() => triggerImmediateSave!(newSettlement), 100);
        }
        
        return { settlement: newSettlement };
      });
    },
    
    removeTaskContribution: (contributionId: string) => {
      set((state) => {
        const newSettlement = {
          ...state.settlement,
          taskContributions: state.settlement.taskContributions.filter(c => c.id !== contributionId)
        };
        
        console.log('❌ Task contribution removed:', { contributionId });
        
        // Trigger immediate save for critical operations
        if (triggerImmediateSave) {
          setTimeout(() => triggerImmediateSave!(newSettlement), 100);
        }
        
        return { settlement: newSettlement };
      });
    },
    
    getTaskContributions: (taskId?: string, userId?: string) => {
      const { settlement } = get();
      return settlement.taskContributions.filter(contribution => 
        (!taskId || contribution.taskId === taskId) && 
        (!userId || contribution.userId === userId)
      );
    },
    
    approveContribution: (contributionId: string, approvedBy: string) => {
      set((state) => {
        const newSettlement = {
          ...state.settlement,
          taskContributions: state.settlement.taskContributions.map(contribution =>
            contribution.id === contributionId ? { 
              ...contribution, 
              status: 'approved' as const, 
              approvedBy, 
              approvedDate: new Date() 
            } : contribution
          )
        };
        
        console.log('✅ Contribution approved:', { contributionId, approvedBy });
        
        // Trigger immediate save for critical operations
        if (triggerImmediateSave) {
          setTimeout(() => triggerImmediateSave!(newSettlement), 100);
        }
        
        return { settlement: newSettlement };
      });
    },
    
    rejectContribution: (contributionId: string, rejectedBy: string, reason: string) => {
      set((state) => {
        const newSettlement = {
          ...state.settlement,
          taskContributions: state.settlement.taskContributions.map(contribution =>
            contribution.id === contributionId ? { 
              ...contribution, 
              status: 'rejected' as const, 
              rejectionReason: reason
            } : contribution
          )
        };
        
        console.log('❌ Contribution rejected:', { contributionId, rejectedBy, reason });
        
        // Trigger immediate save for critical operations
        if (triggerImmediateSave) {
          setTimeout(() => triggerImmediateSave!(newSettlement), 100);
        }
        
        return { settlement: newSettlement };
      });
    },
    
    // Inventory management
    addInventoryItem: (itemId: string, itemName: string, quantity: number, storageLocation?: string) => {
      set((state) => ({
        settlement: {
          ...state.settlement,
          inventory: {
            ...state.settlement.inventory,
            [itemId]: {
              itemId,
              itemName,
              quantity: (state.settlement.inventory[itemId]?.quantity || 0) + quantity,
              storageLocation,
              reservedQuantity: state.settlement.inventory[itemId]?.reservedQuantity || 0,
              lastUpdated: new Date()
            }
          }
        }
      }));
    },
    
    updateInventoryItem: (itemId: string, updates: Partial<SettlementInventoryItem>) => {
      set((state) => ({
        settlement: {
          ...state.settlement,
          inventory: {
            ...state.settlement.inventory,
            [itemId]: {
              ...state.settlement.inventory[itemId],
              ...updates,
              lastUpdated: new Date()
            }
          }
        }
      }));
    },
    
    removeInventoryItem: (itemId: string) => {
      set((state) => {
        const newInventory = { ...state.settlement.inventory };
        delete newInventory[itemId];
        return {
          settlement: {
            ...state.settlement,
            inventory: newInventory
          }
        };
      });
    },
    
    reserveInventoryQuantity: (itemId: string, quantity: number) => {
      const { settlement } = get();
      const item = settlement.inventory[itemId];
      if (!item) return false;
      
      const availableQuantity = item.quantity - item.reservedQuantity;
      if (availableQuantity < quantity) return false;
      
      set((state) => ({
        settlement: {
          ...state.settlement,
          inventory: {
            ...state.settlement.inventory,
            [itemId]: {
              ...item,
              reservedQuantity: item.reservedQuantity + quantity,
              lastUpdated: new Date()
            }
          }
        }
      }));
      
      return true;
    },
    
    releaseInventoryQuantity: (itemId: string, quantity: number) => {
      const { settlement } = get();
      const item = settlement.inventory[itemId];
      if (!item) return;
      
      set((state) => ({
        settlement: {
          ...state.settlement,
          inventory: {
            ...state.settlement.inventory,
            [itemId]: {
              ...item,
              reservedQuantity: Math.max(0, item.reservedQuantity - quantity),
              lastUpdated: new Date()
            }
          }
        }
      }));
    },
    
    getAvailableQuantity: (itemId: string) => {
      const { settlement } = get();
      const item = settlement.inventory[itemId];
      if (!item) return 0;
      return Math.max(0, item.quantity - item.reservedQuantity);
    },
    
    getLowStockItems: (threshold = 10) => {
      const { settlement } = get();
      return Object.values(settlement.inventory).filter(item => 
        get().getAvailableQuantity(item.itemId) < threshold
      );
    },
    
    updateTasksForInventoryChange: (items: ItemsData, projectId: string) => {
      const { settlement } = get();
      const project = settlement.projects.find(p => p.id === projectId);
      if (!project) return;
      
      const projectTasks = settlement.tasks.filter(t => t.projectId === projectId);
      const result = updateTasksForInventoryChange(items, project, projectTasks, settlement.inventory);
      
      // Update existing tasks
      const updatedTasks = settlement.tasks.map(task => {
        const updatedTask = result.updatedTasks.find(ut => ut.id === task.id);
        return updatedTask || task;
      });
      
      // Add new tasks
      const newTasks: Task[] = result.newTasks.map((taskData, index) => ({
        id: `task-${Date.now()}-${index}`,
        ...taskData,
        projectId,
        status: 'planned',
        priority: 'medium',
        dateCreated: new Date()
      }));
      
      set((state) => ({
        settlement: {
          ...state.settlement,
          tasks: [...updatedTasks, ...newTasks]
        }
      }));
    },
    
    getProjectMaterials: (items: ItemsData, projectId: string) => {
      const { settlement } = get();
      const project = settlement.projects.find(p => p.id === projectId);
      if (!project) return [];
      return getProjectMaterials(items, project, settlement.inventory);
    },
    
    // Utility functions
    getPlayerAssignments: (playerId: string) => {
      const { settlement } = get();
      const projects = settlement.projects.filter(project => 
        project.assignedPlayers.includes(playerId)
      );
      const tasks = settlement.tasks.filter(task => 
        task.assignedPlayerId === playerId
      );
      return { projects, tasks };
    },
    
    getProjectTasks: (projectId: string) => {
      const { settlement } = get();
      return settlement.tasks.filter(task => task.projectId === projectId);
    },
    
    getActiveProjects: () => {
      const { settlement } = get();
      return settlement.projects.filter(project => 
        project.status === 'not_started' || project.status === 'in_progress'
      );
    },
    
    getCompletedProjects: () => {
      const { settlement } = get();
      return settlement.projects.filter(project => 
        project.status === 'completed'
      );
    },
    
    // Reset function
    resetSettlement: () => {
      set({ settlement: createInitialSettlement() });
    },

    // Load settlement data from Firebase
    loadSettlement: (settlementData: SettlementData) => {
      set({ settlement: settlementData });
    },

    // Set settlement data (for Firebase loading)
    setSettlement: (settlementData: SettlementData | null, options?: { force?: boolean }) => {
      projectLogger.logStateChange(
        'useSettlementStore.setSettlement',
        'SET_SETTLEMENT_CALLED',
        settlementData
      );
      
      console.log('🔍 setSettlement called with:', {
        hasData: !!settlementData,
        projectCount: settlementData?.projects?.length || 0,
        settlementName: settlementData?.name,
        projects: settlementData?.projects?.map(p => ({ id: p.id, name: p.name })) || []
      });
      
      // Get current state for comparison
      const currentState = get();
      const currentProjects = currentState.settlement?.projects || [];
      
      // CRITICAL SAFETY CHECK: Prevent accidental data loss
      if (!settlementData && currentProjects.length > 0 && !options?.force) {
        console.error('🚨🚨🚨 CRITICAL SAFETY CHECK ACTIVATED! 🚨🚨🚨');
        console.error('🛡️ Prevented project data loss!');
        console.error('📊 Projects that would have been lost:', currentProjects.map(p => ({ id: p.id, name: p.name })));
        console.error('💡 To override this safety check, use setSettlement(null, { force: true })');
        console.error('📱 For emergency recovery, open Debug tab and use Emergency Recovery');
        
        // Log the stack trace to see what called this
        console.error('📍 Call stack:', new Error().stack);
        
        // Show user notification if possible
        if (typeof window !== 'undefined') {
          setTimeout(() => {
            alert(`🛡️ DATA PROTECTION: Prevented loss of ${currentProjects.length} project(s). Your data is safe!\n\nIf you're experiencing sync issues, go to Debug tab → Emergency Recovery.`);
          }, 100);
        }
        
        projectLogger.logError(
          'useSettlementStore.setSettlement',
          'SAFETY_CHECK_PREVENTED_DATA_LOSS',
          {
            protectedProjects: currentProjects.map(p => ({ id: p.id, name: p.name })),
            currentCount: currentProjects.length,
            attemptedToSetNull: true,
            forceOption: options?.force || false,
            timestamp: new Date().toISOString(),
            location: 'SAFETY_CHECK_BARRIER'
          }
        );
        
        // Don't proceed with setting to null - keep existing data
        console.log('🛡️ SAFETY BARRIER: Keeping existing settlement to prevent data loss');
        return;
      }
      
      // Log when force option is used
      if (!settlementData && options?.force && currentProjects.length > 0) {
        console.log('⚠️ FORCE OPTION: Clearing settlement despite existing projects:', currentProjects.length);
        projectLogger.logStateChange(
          'useSettlementStore.setSettlement',
          'FORCE_CLEAR_SETTLEMENT',
          settlementData
        );
      }
      
      if (settlementData) {
        const newProjects = settlementData.projects || [];
        
        // Check for lost projects
        const lostProjects = currentProjects.filter(current => 
          !newProjects.some(newP => newP.id === current.id)
        );
        
        const gainedProjects = newProjects.filter(newP => 
          !currentProjects.some(current => current.id === newP.id)
        );
        
        if (lostProjects.length > 0) {
          projectLogger.logError(
            'useSettlementStore.setSettlement',
            'PROJECTS_LOST_DURING_SET_SETTLEMENT',
            {
              lostProjects: lostProjects.map(p => ({ id: p.id, name: p.name })),
              previousCount: currentProjects.length,
              newCount: newProjects.length,
              currentProjects: currentProjects.map(p => ({ id: p.id, name: p.name })),
              newProjectsReceived: newProjects.map(p => ({ id: p.id, name: p.name }))
            }
          );
          
          console.error('🚨 PROJECTS LOST during setSettlement!', {
            lostProjects: lostProjects.map(p => ({ id: p.id, name: p.name })),
            previousCount: currentProjects.length,
            newCount: newProjects.length,
            stackTrace: new Error().stack
          });
        }
        
        if (gainedProjects.length > 0) {
          projectLogger.logStateChange(
            'useSettlementStore.setSettlement',
            'PROJECTS_GAINED',
            settlementData
          );
          
          console.log('✅ New projects loaded:', {
            gainedProjects: gainedProjects.map(p => ({ id: p.id, name: p.name })),
            previousCount: currentProjects.length,
            newCount: newProjects.length
          });
        }
        
        set({ settlement: settlementData });
        
        projectLogger.logStateChange(
          'useSettlementStore.setSettlement',
          'SETTLEMENT_SET_WITH_DATA',
          settlementData
        );
        
        console.log('✅ Settlement set with projects:', settlementData.projects?.length || 0);
      } else {
        if (currentProjects.length > 0) {
          projectLogger.logError(
            'useSettlementStore.setSettlement',
            'PROJECTS_LOST_SETTLEMENT_SET_TO_NULL',
            {
              lostProjects: currentProjects.map(p => ({ id: p.id, name: p.name })),
              previousCount: currentProjects.length
            }
          );
          
          console.error('🚨 PROJECTS LOST - settlement set to null!', {
            lostProjects: currentProjects.map(p => ({ id: p.id, name: p.name })),
            stackTrace: new Error().stack
          });
        }
        
        const initialSettlement = createInitialSettlement();
        set({ settlement: initialSettlement });
        
        projectLogger.logStateChange(
          'useSettlementStore.setSettlement',
          'SETTLEMENT_SET_TO_INITIAL',
          initialSettlement
        );
        
        console.log('✅ Settlement set to initial state');
      }
    },

    // New methods for inventory reservation
    reserveMaterialsForProject: (items: ItemsData, projectId: string) => {
      const { settlement } = get();
      const project = settlement.projects.find(p => p.id === projectId);
      if (!project) return false;
      
      const materials = getProjectMaterials(items, project, settlement.inventory);
      let allReserved = true;
      
      materials.forEach(material => {
        if (material.stillNeeded > 0) {
          const reserved = get().reserveInventoryQuantity(material.itemId, material.stillNeeded);
          if (!reserved) {
            allReserved = false;
          }
        }
      });
      
      return allReserved;
    },
    
    releaseMaterialsForProject: (items: ItemsData, projectId: string) => {
      const { settlement } = get();
      const project = settlement.projects.find(p => p.id === projectId);
      if (!project) return;
      
      const materials = getProjectMaterials(items, project, settlement.inventory);
      
      materials.forEach(material => {
        if (material.stillNeeded > 0) {
          get().releaseInventoryQuantity(material.itemId, material.stillNeeded);
        }
      });
    }
  }))
); 