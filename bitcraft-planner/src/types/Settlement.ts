export interface Player {
  id: string;
  name: string;
  dateAdded: Date;
  isActive: boolean;
}

export interface ProjectItem {
  itemId: string; // BitCraft item ID
  itemName: string; // BitCraft item name
  targetQuantity: number; // How many to craft
  recipeIndex: number; // Which recipe to use
  completedQuantity: number; // How many completed
}

export interface Project {
  id: string;
  name: string; // Custom project name
  description?: string; // Optional description
  items: ProjectItem[]; // List of items in this project
  assignedPlayers: string[]; // Player IDs
  priority: 'low' | 'medium' | 'high';
  status: 'not_started' | 'in_progress' | 'blocked' | 'completed';
  deadline?: Date;
  dateCreated: Date;
  dateCompleted?: Date;
  progressPercentage: number;
  notes?: string;
}

export interface Task {
  id: string;
  type: 'craft' | 'gather' | 'collect'; // Type of task
  itemId: string; // What item to craft/gather
  itemName: string; // Item name for display
  targetQuantity: number; // How many needed
  completedQuantity: number; // How many done
  projectId: string; // Which project this belongs to
  assignedPlayerId?: string;
  status: 'planned' | 'in_progress' | 'blocked' | 'completed';
  priority: 'low' | 'medium' | 'high';
  estimatedDuration?: number; // in minutes
  actualDuration?: number; // in minutes
  dateCreated: Date;
  dateAssigned?: Date;
  dateCompleted?: Date;
  dependencies?: string[]; // Task IDs that must complete first
  notes?: string;
  isBaseItem: boolean; // True if this is resource gathering, false if crafting
  recipeIndex?: number; // For crafting tasks
  buildingRequirement?: string; // Required building for crafting
}

export interface SettlementInventoryItem {
  itemId: string;
  itemName: string;
  quantity: number;
  storageLocation?: string;
  reservedQuantity: number; // Amount reserved for projects/tasks
  lastUpdated: Date;
  addedBy?: string; // Player ID
}

export interface SettlementInventory {
  [itemId: string]: SettlementInventoryItem;
}

export interface SettlementData {
  id: string;
  name: string;
  description?: string;
  players: Player[];
  projects: Project[];
  tasks: Task[];
  inventory: SettlementInventory;
  dateCreated: Date;
  settings?: {
    autoAssignTasks: boolean;
    lowStockThreshold: number;
    enableNotifications: boolean;
  };
} 