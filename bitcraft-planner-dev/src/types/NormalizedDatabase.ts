// ============================================================================
// NORMALIZED DATABASE SCHEMA TYPES
// ============================================================================
// This file defines the new normalized database structure that separates
// users, settlements, projects, tasks, and collaborations into their own collections
// ============================================================================

// ============================================================================
// BASE TYPES
// ============================================================================

export type ProjectStatus = 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'cancelled';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high';
export type CollaboratorRole = 'viewer' | 'contributor' | 'admin' | 'owner';
export type CollaborationStatus = 'pending' | 'active' | 'removed' | 'blocked';
export type ShareAccessType = 'public' | 'link_only' | 'private';

// ============================================================================
// USER COLLECTION
// ============================================================================

export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  username?: string; // Game username/nickname that other players see
  emailVerified: boolean;
  providerId: string;
  createdAt: Date;
  lastSignIn: Date;
  
  // Default settlement for this user
  defaultSettlementId?: string;
  
  // User preferences and settings
  preferences: UserPreferences;
  
  // Metadata
  metadata: {
    totalProjects: number;
    totalCollaborations: number;
    lastActiveAt: Date;
    version: number;
  };
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    taskReminders: boolean;
    collaborationInvites: boolean;
    projectUpdates: boolean;
  };
  privacy: {
    showEmail: boolean;
    allowDiscovery: boolean;
    shareStatistics: boolean;
  };
}

// ============================================================================
// SETTLEMENT COLLECTION
// ============================================================================

export interface Settlement {
  id: string;
  name: string;
  description?: string;
  
  // Owner relationship
  ownerId: string; // FK to User
  
  // Settlement data
  inventory: Record<string, number>; // itemId -> quantity
  
  // Settings and configuration
  settings: SettlementSettings;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  metadata: {
    totalProjects: number;
    totalMembers: number;
    isActive: boolean;
    version: number;
  };
}

export interface SettlementSettings {
  isPublic: boolean;
  allowCollaborations: boolean;
  defaultProjectVisibility: 'private' | 'settlement' | 'public';
  inventoryManagement: {
    enableReservations: boolean;
    allowOvercommit: boolean;
    trackingEnabled: boolean;
  };
}

// ============================================================================
// PROJECT COLLECTION
// ============================================================================

export interface Project {
  id: string;
  name: string;
  description: string;
  
  // Relationships
  ownerId: string; // FK to User
  settlementId: string; // FK to Settlement
  
  // Project data
  status: ProjectStatus;
  priority: ProjectPriority;
  items: ProjectItem[];
  progressPercentage: number;
  notes: string;
  
  // Sharing and collaboration
  isShared: boolean;
  isTemplate: boolean;
  visibility: 'private' | 'settlement' | 'public';
  
  // Dates
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  completedAt?: Date;
  
  // Metadata
  metadata: {
    totalTasks: number;
    totalCollaborators: number;
    estimatedHours?: number;
    actualHours?: number;
    tags: string[];
    version: number;
  };
}

export interface ProjectItem {
  itemId: string;
  name: string;
  quantity: number;
  recipeIndex?: number;
  isCompleted: boolean;
  notes?: string;
  reservedQuantity?: number;
  requiredBy?: Date;
}

// ============================================================================
// TASK COLLECTION
// ============================================================================

export interface Task {
  id: string;
  title: string;
  description: string;
  
  // Relationships
  projectId: string; // FK to Project
  assignedTo?: string; // FK to User (optional - can be unassigned)
  createdBy: string; // FK to User
  
  // Task data
  status: TaskStatus;
  priority: TaskPriority;
  estimatedHours?: number;
  actualHours?: number;
  
  // Dates
  createdAt: Date;
  updatedAt: Date;
  dueDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
  
  // Task-specific data
  requirements: TaskRequirement[];
  dependencies: string[]; // Array of task IDs this task depends on
  
  // Metadata
  metadata: {
    tags: string[];
    attachments: TaskAttachment[];
    comments: TaskComment[];
    version: number;
  };
}

export interface TaskRequirement {
  itemId: string;
  itemName: string;
  quantityRequired: number;
  quantityAvailable: number;
  isOptional: boolean;
}

export interface TaskAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
  uploadedAt: Date;
  uploadedBy: string; // FK to User
}

export interface TaskComment {
  id: string;
  content: string;
  authorId: string; // FK to User
  createdAt: Date;
  updatedAt?: Date;
  isEdited: boolean;
}

// ============================================================================
// PROJECT COLLABORATIONS COLLECTION
// ============================================================================

export interface ProjectCollaboration {
  id: string;
  
  // Relationships
  projectId: string; // FK to Project
  userId: string; // FK to User
  invitedBy: string; // FK to User
  
  // Collaboration data
  role: CollaboratorRole;
  status: CollaborationStatus;
  permissions: CollaborationPermissions;
  
  // Dates
  invitedAt: Date;
  acceptedAt?: Date;
  lastActiveAt?: Date;
  removedAt?: Date;
  
  // Metadata
  metadata: {
    inviteMessage?: string;
    removalReason?: string;
    activityLog: CollaborationActivity[];
    version: number;
  };
}

export interface CollaborationPermissions {
  canEdit: boolean;
  canDelete: boolean;
  canInvite: boolean;
  canManageTasks: boolean;
  canManageInventory: boolean;
  canExport: boolean;
}

export interface CollaborationActivity {
  action: string;
  timestamp: Date;
  details?: Record<string, any>;
}

// ============================================================================
// SETTLEMENT COLLABORATION
// ============================================================================

export interface SettlementCollaboration {
  id: string;
  
  // Relationships
  settlementId: string; // FK to Settlement
  userId: string; // FK to User
  invitedBy: string; // FK to User
  
  // Collaboration data
  role: SettlementCollaboratorRole;
  status: CollaborationStatus;
  permissions: SettlementCollaborationPermissions;
  
  // Dates
  invitedAt: Date;
  acceptedAt?: Date;
  lastActiveAt?: Date;
  removedAt?: Date;
  
  // Invitation data
  inviteCode?: string;
  inviteMessage?: string;
  
  // Metadata
  metadata: {
    removalReason?: string;
    activityLog: CollaborationActivity[];
    version: number;
  };
}

export type SettlementCollaboratorRole = 'viewer' | 'contributor' | 'admin' | 'co_owner';

export interface SettlementCollaborationPermissions {
  // Project permissions
  canViewProjects: boolean;
  canCreateProjects: boolean;
  canEditProjects: boolean;
  canDeleteProjects: boolean;
  
  // Task permissions
  canViewTasks: boolean;
  canCreateTasks: boolean;
  canEditTasks: boolean;
  canDeleteTasks: boolean;
  canAssignTasks: boolean;
  
  // Inventory permissions
  canViewInventory: boolean;
  canEditInventory: boolean;
  canManageReservations: boolean;
  
  // Collaboration permissions
  canInviteUsers: boolean;
  canRemoveUsers: boolean;
  canChangeRoles: boolean;
  
  // Settlement permissions
  canEditSettings: boolean;
  canDeleteSettlement: boolean;
  canExportData: boolean;
}

export interface SettlementInviteLink {
  id: string;
  settlementId: string;
  createdBy: string;
  inviteCode: string;
  role: SettlementCollaboratorRole;
  permissions: SettlementCollaborationPermissions;
  isActive: boolean;
  expiresAt?: Date;
  maxUses?: number;
  currentUses: number;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface SettlementMember {
  user: User;
  collaboration: SettlementCollaboration;
  isOwner: boolean;
}

export interface SettlementWithMembers extends Settlement {
  members: SettlementMember[];
  collaborationCount: number;
}

// ============================================================================
// SHARED PROJECTS COLLECTION
// ============================================================================

export interface SharedProject {
  id: string;
  
  // Relationships
  projectId: string; // FK to Project
  sharedBy: string; // FK to User
  
  // Sharing configuration
  accessType: ShareAccessType;
  shareCode?: string; // For link-only access
  
  // Metadata
  sharedAt: Date;
  lastAccessedAt?: Date;
  downloadCount: number;
  viewCount: number;
  isActive: boolean;
  
  // Optional restrictions
  expiresAt?: Date;
  maxDownloads?: number;
  allowedDomains?: string[];
  
  metadata: {
    description?: string;
    tags: string[];
    version: number;
  };
}

// ============================================================================
// BUILD LISTS COLLECTION
// ============================================================================

export interface BuildList {
  id: string;
  
  // Relationships
  userId: string; // FK to User
  settlementId: string; // FK to Settlement
  
  // Build list data
  name: string;
  description?: string;
  items: BuildListItem[];
  
  // Dates
  createdAt: Date;
  updatedAt: Date;
  
  // Metadata
  metadata: {
    totalItems: number;
    estimatedCost?: number;
    tags: string[];
    isTemplate: boolean;
    version: number;
  };
}

export interface BuildListItem {
  itemId: string;
  name: string;
  quantity: number;
  recipeIndex?: number;
  priority: number;
  notes?: string;
  isCompleted: boolean;
  addedAt: Date;
}

// ============================================================================
// QUERY RESULT TYPES
// ============================================================================

// For complex queries that join multiple collections
export interface UserDashboard {
  user: User;
  settlements: Settlement[];
  ownedProjects: Project[];
  collaborativeProjects: ProjectWithCollaboration[];
  assignedTasks: TaskWithProject[];
  recentActivity: ActivityItem[];
}

export interface ProjectWithCollaboration extends Project {
  collaboration: ProjectCollaboration;
  settlement: Settlement;
}

export interface TaskWithProject extends Task {
  project: Project;
  settlement: Settlement;
}

export interface ProjectDetails {
  project: Project;
  settlement: Settlement;
  tasks: Task[];
  collaborators: ProjectCollaboratorInfo[];
  buildLists: BuildList[];
}

export interface ProjectCollaboratorInfo {
  collaboration: ProjectCollaboration;
  user: User;
}

export interface ActivityItem {
  id: string;
  type: 'project_created' | 'task_completed' | 'collaboration_invited' | 'project_shared';
  entityId: string;
  entityName: string;
  actorId: string;
  actorName: string;
  timestamp: Date;
  details: Record<string, any>;
}

// ============================================================================
// MIGRATION TYPES
// ============================================================================

export interface MigrationResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsSkipped: number;
  errors: string[];
  warnings: string[];
  timeElapsed: number;
}

export interface MigrationReport {
  totalUsers: number;
  totalSettlements: number;
  totalProjects: number;
  totalTasks: number;
  totalCollaborations: number;
  orphanedRecords: number;
  duplicateRecords: number;
  dataIntegrityIssues: string[];
}

// ============================================================================
// DATABASE OPERATION TYPES
// ============================================================================

export interface CreateProjectRequest {
  name: string;
  description: string;
  settlementId: string;
  priority?: ProjectPriority;
  items?: ProjectItem[];
  dueDate?: Date;
  isShared?: boolean;
  visibility?: 'private' | 'settlement' | 'public';
}

export interface CreateTaskRequest {
  title: string;
  description: string;
  projectId: string;
  assignedTo?: string;
  priority?: TaskPriority;
  dueDate?: Date;
  estimatedHours?: number;
  requirements?: TaskRequirement[];
}

export interface CreateCollaborationRequest {
  projectId: string;
  userId: string;
  role: CollaboratorRole;
  inviteMessage?: string;
  permissions?: Partial<CollaborationPermissions>;
}

// ============================================================================
// SEARCH AND FILTER TYPES
// ============================================================================

export interface SearchQuery {
  text?: string;
  userId?: string;
  settlementId?: string;
  status?: ProjectStatus[];
  priority?: ProjectPriority[];
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
    field: 'createdAt' | 'updatedAt' | 'dueDate';
  };
  limit?: number;
  offset?: number;
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

export interface SearchResult<T> {
  results: T[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string;
}

// ============================================================================
// FIREBASE SPECIFIC TYPES
// ============================================================================

export interface FirestoreDocument {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BatchOperation {
  type: 'create' | 'update' | 'delete';
  collection: string;
  documentId: string;
  data?: any;
}

export interface DatabaseConfig {
  enablePersistence: boolean;
  enableMultiTabSupport: boolean;
  cacheSizeBytes: number;
  experimentalForceLongPolling: boolean;
}

// ============================================================================
// COMPATIBILITY ALIASES
// ============================================================================
// These aliases provide backward compatibility and clearer naming

export type NormalizedUserData = User;
export type NormalizedSettlement = Settlement;
export type NormalizedProject = Project;
export type NormalizedTask = Task;
export type NormalizedProjectCollaboration = ProjectCollaboration;
export type NormalizedBuildList = BuildList;
export type NormalizedSharedProject = SharedProject;

export interface ProjectWithTasks extends Project {
  tasks: Task[];
}

export interface CollaborativeProject extends ProjectWithTasks {
  collaboration: ProjectCollaboration;
  isCollaborative: true;
}

export interface SettlementWithProjects extends Settlement {
  projects: ProjectWithTasks[];
}

export type UserRole = CollaboratorRole;
export type MigrationStatus = {
  status: 'in_progress' | 'completed' | 'failed';
  migrationId: string;
  timestamp: Date;
  stats?: MigrationStats;
};

export interface MigrationStats {
  totalUsers: number;
  migratedUsers: number;
  totalSettlements: number;
  migratedSettlements: number;
  totalProjects: number;
  migratedProjects: number;
  totalTasks: number;
  migratedTasks: number;
  totalCollaborations: number;
  migratedCollaborations: number;
  totalBuildLists: number;
  migratedBuildLists: number;
  errors: Array<{
    type: string;
    message: string;
    entityType?: string;
    entityId?: string;
    timestamp: Date;
  }>;
  startTime: Date | null;
  endTime: Date | null;
}

export interface LegacyUserData {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  settlement?: {
    name: string;
    inventory: Record<string, number>;
    projects?: Array<{
      id: string;
      name: string;
      description: string;
      status: string;
      items: any[];
      tasks?: any[];
    }>;
  };
  buildList?: any;
} 