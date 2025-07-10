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

// Enhanced Task interface with assignment and contribution features
export interface Task {
  id: string;
  type: 'craft' | 'gather' | 'collect'; // Type of task
  itemId: string; // What item to craft/gather
  itemName: string; // Item name for display
  targetQuantity: number; // How many needed
  completedQuantity: number; // How many done
  projectId: string; // Which project this belongs to
  
  // Enhanced Assignment Features
  assignedTo: string[]; // Array of user IDs (multiple assignees)
  assignmentStatus: 'unassigned' | 'assigned' | 'in-progress' | 'completed';
  assignedBy?: string; // Admin who made the assignment
  assignedDate?: Date; // When assignment was made
  
  // Legacy single assignment (for backwards compatibility)
  assignedPlayerId?: string;
  
  status: 'planned' | 'in_progress' | 'blocked' | 'completed';
  priority: 'low' | 'medium' | 'high';
  estimatedDuration?: number; // in minutes
  actualDuration?: number; // in minutes
  dateCreated: Date;
  dateCompleted?: Date;
  dependencies?: string[]; // Task IDs that must complete first
  notes?: string;
  isBaseItem: boolean; // True if this is resource gathering, false if crafting
  recipeIndex?: number; // For crafting tasks
  buildingRequirement?: string; // Required building for crafting
  
  // New assignment features
  deadline?: Date; // Task-specific deadline
  maxAssignees?: number; // Maximum number of people who can be assigned
  requiresApproval?: boolean; // Whether contributions need approval
}

// New: Task Contribution tracking
export interface TaskContribution {
  id: string; // Format: {taskId}_{userId}_{timestamp}
  userId: string;
  taskId: string;
  settlementId: string;
  itemsContributed: {
    itemId: string;
    itemName: string;
    quantity: number;
  }[];
  submissionDate: Date;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  proofOfWork?: string; // Optional evidence/screenshots
  approvedBy?: string; // Admin who approved
  approvedDate?: Date;
  rejectionReason?: string;
}

// New: Task Assignment record
export interface TaskAssignment {
  id: string;
  taskId: string;
  userId: string;
  assignedBy: string;
  assignedDate: Date;
  acceptedDate?: Date;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
  estimatedCompletion?: Date;
  personalNotes?: string;
}

// Enhanced Settlement Permissions
export interface SettlementRole {
  userId: string;
  role: 'owner' | 'co-owner' | 'admin' | 'contributor' | 'viewer';
  permissions: {
    canAssignTasks: boolean;
    canApproveContributions: boolean;
    canViewAllContributions: boolean;
    canSubmitContributions: boolean;
    canManageMembers: boolean;
    canEditProjects: boolean;
  };
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
  
  // Enhanced features
  taskContributions: TaskContribution[];
  taskAssignments: TaskAssignment[];
  memberRoles: SettlementRole[];
  
  settings?: {
    autoAssignTasks: boolean;
    lowStockThreshold: number;
    enableNotifications: boolean;
    requireContributionApproval: boolean;
    maxAssigneesPerTask: number;
    defaultTaskDeadlineDays: number;
  };
} 