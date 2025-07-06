import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Player, Project, ProjectItem, Task, SettlementInventoryItem, SettlementData } from '../types/Settlement';
import { ItemsData } from '../types/Item';
import { createProjectFromItem, createEmptyProject, addItemToProject, generateTasksForProject, calculateProjectProgress, getAvailableTasks, updateTasksForInventoryChange, getProjectMaterials } from '../utils/settlementIntegration';

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
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  assignTaskToPlayer: (taskId: string, playerId: string) => void;
  completeTask: (taskId: string, completedQuantity: number) => void;
  getAvailableTasks: () => Task[];
  
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
  settings: {
    autoAssignTasks: false,
    lowStockThreshold: 10,
    enableNotifications: true
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
      
      set((state) => ({
        settlement: {
          ...state.settlement,
          projects: [...state.settlement.projects, project]
        }
      }));
      
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
      
      set((state) => ({
        settlement: {
          ...state.settlement,
          projects: state.settlement.projects.map(project =>
            project.id === projectId 
              ? { ...project, items: [...project.items, newItem] }
              : project
          )
        }
      }));
    },
    
    removeItemFromProject: (projectId: string, itemId: string) => {
      set((state) => ({
        settlement: {
          ...state.settlement,
          projects: state.settlement.projects.map(project =>
            project.id === projectId 
              ? { ...project, items: project.items.filter(item => item.itemId !== itemId) }
              : project
          )
        }
      }));
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
      
      set((state) => ({
        settlement: {
          ...state.settlement,
          tasks: [...existingTasks, ...tasks]
        }
      }));
      
      // Reserve materials for this project
      get().reserveMaterialsForProject(items, projectId);
    },
    
    updateProject: (projectId: string, updates: Partial<Project>) => {
      set((state) => ({
        settlement: {
          ...state.settlement,
          projects: state.settlement.projects.map(project =>
            project.id === projectId ? { ...project, ...updates } : project
          )
        }
      }));
    },
    
    deleteProject: (projectId: string) => {
      set((state) => ({
        settlement: {
          ...state.settlement,
          projects: state.settlement.projects.filter(p => p.id !== projectId),
          tasks: state.settlement.tasks.filter(t => t.projectId !== projectId)
        }
      }));
    },
    
    assignPlayersToProject: (projectId: string, playerIds: string[]) => {
      set((state) => ({
        settlement: {
          ...state.settlement,
          projects: state.settlement.projects.map(project =>
            project.id === projectId 
              ? { ...project, assignedPlayers: playerIds }
              : project
          )
        }
      }));
    },
    
    getProjectProgress: (projectId: string) => {
      const { settlement } = get();
      const project = settlement.projects.find(p => p.id === projectId);
      if (!project) return 0;
      return calculateProjectProgress(project, settlement.tasks);
    },
    
    // Task management
    updateTask: (taskId: string, updates: Partial<Task>) => {
      set((state) => ({
        settlement: {
          ...state.settlement,
          tasks: state.settlement.tasks.map(task =>
            task.id === taskId ? { ...task, ...updates } : task
          )
        }
      }));
    },
    
    assignTaskToPlayer: (taskId: string, playerId: string) => {
      set((state) => ({
        settlement: {
          ...state.settlement,
          tasks: state.settlement.tasks.map(task =>
            task.id === taskId 
              ? { ...task, assignedPlayerId: playerId, status: 'in_progress' }
              : task
          )
        }
      }));
    },
    
    completeTask: (taskId: string, completedQuantity: number) => {
      set((state) => ({
        settlement: {
          ...state.settlement,
          tasks: state.settlement.tasks.map(task =>
            task.id === taskId 
              ? { 
                  ...task, 
                  completedQuantity: Math.min(completedQuantity, task.targetQuantity),
                  status: completedQuantity >= task.targetQuantity ? 'completed' : task.status,
                  dateCompleted: completedQuantity >= task.targetQuantity ? new Date() : task.dateCompleted
                }
              : task
          )
        }
      }));
    },
    
    getAvailableTasks: () => {
      const { settlement } = get();
      return getAvailableTasks(settlement.tasks);
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