// ============================================================================
// DATABASE MIGRATION UTILITIES
// ============================================================================
// Utility functions for migrating data from the embedded document structure
// to the new normalized database architecture
// ============================================================================

import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
  serverTimestamp,
  type Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { COLLECTION_NAMES } from '../config/NormalizedFirestoreStructure';
import type {
  User,
  Settlement,
  Project,
  Task,
  ProjectCollaboration,
  MigrationResult,
  MigrationReport
} from '../types/NormalizedDatabase';
import type { SettlementData as LegacySettlement } from '../types/Settlement';

// ============================================================================
// MIGRATION CONFIGURATION
// ============================================================================

export interface MigrationOptions {
  batchSize: number;
  dryRun: boolean;
  validateOnly: boolean;
  skipValidation: boolean;
  targetCollections?: string[];
  sourceUserId?: string; // For single-user migrations
}

export const DEFAULT_MIGRATION_OPTIONS: MigrationOptions = {
  batchSize: 500,
  dryRun: false,
  validateOnly: false,
  skipValidation: false
};

// ============================================================================
// LEGACY DATA TYPES (for migration compatibility)
// ============================================================================

interface LegacyUserData {
  userId?: string;
  email?: string;
  inventory?: Record<string, number>;
  buildList?: Array<{ itemId: string; quantity: number; recipeIndex?: number }>;
  settlement?: LegacySettlement;
  lastUpdated?: any;
  version?: number;
  userProfile?: {
    email: string;
    displayName?: string;
    photoURL?: string;
    emailVerified?: boolean;
    providerId?: string;
    createdAt?: any;
    lastSignIn?: any;
  };
}

interface LegacyCollaboration {
  id: string;
  projectId: string;
  projectName: string;
  ownerId: string;
  ownerName: string;
  collaborators: string[];
  isActive: boolean;
  createdAt: any;
  updatedAt?: any;
}

// ============================================================================
// DATA TRANSFORMATION FUNCTIONS
// ============================================================================

/**
 * Converts inventory from legacy format to normalized Record<string, number>
 */
function convertInventoryToRecord(inventory: any): Record<string, number> {
  if (!inventory) return {};
  
  // If it's already a Record<string, number>, return it
  if (typeof inventory === 'object' && !Array.isArray(inventory)) {
    // Check if it's SettlementInventory format
    const firstKey = Object.keys(inventory)[0];
    if (firstKey && typeof inventory[firstKey] === 'object' && inventory[firstKey].quantity !== undefined) {
      // Convert SettlementInventory to Record<string, number>
      const result: Record<string, number> = {};
      for (const [itemId, item] of Object.entries(inventory)) {
        result[itemId] = (item as any).quantity || 0;
      }
      return result;
    }
    
    // Already in Record<string, number> format
    return inventory;
  }
  
  return {};
}

/**
 * Transform legacy user data to normalized User entity
 */
export function transformLegacyUser(
  userId: string,
  legacyData: LegacyUserData
): User {
  const now = new Date();
  
  return {
    id: userId,
    email: legacyData.userProfile?.email || legacyData.email || '',
    displayName: legacyData.userProfile?.displayName,
    photoURL: legacyData.userProfile?.photoURL,
    emailVerified: legacyData.userProfile?.emailVerified || false,
    providerId: legacyData.userProfile?.providerId || 'unknown',
    createdAt: convertFirestoreTimestamp(legacyData.userProfile?.createdAt) || now,
    lastSignIn: convertFirestoreTimestamp(legacyData.userProfile?.lastSignIn) || now,
    
    defaultSettlementId: `settlement-${userId}`,
    
    preferences: {
      theme: 'auto',
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notifications: {
        email: true,
        taskReminders: true,
        collaborationInvites: true,
        projectUpdates: true
      },
      privacy: {
        showEmail: false,
        allowDiscovery: true,
        shareStatistics: false
      }
    },
    
    metadata: {
      totalProjects: legacyData.settlement?.projects?.length || 0,
      totalCollaborations: 0, // Will be calculated during collaboration migration
      lastActiveAt: convertFirestoreTimestamp(legacyData.lastUpdated) || now,
      version: 1
    }
  };
}

/**
 * Transform legacy settlement data to normalized Settlement entity
 */
export function transformLegacySettlement(
  userId: string,
  legacySettlement: LegacySettlement,
  legacyInventory?: Record<string, number>
): Settlement {
  const now = new Date();
  
  return {
    id: `settlement-${userId}`,
    name: legacySettlement.name || 'My Settlement',
    description: `Migrated settlement from legacy data`,
    ownerId: userId,
    
    inventory: convertInventoryToRecord(legacyInventory || legacySettlement.inventory || {}),
    
    settings: {
      isPublic: false,
      allowCollaborations: true,
      defaultProjectVisibility: 'private',
      inventoryManagement: {
        enableReservations: true,
        allowOvercommit: false,
        trackingEnabled: true
      }
    },
    
    createdAt: convertFirestoreTimestamp(legacySettlement.dateCreated) || now,
    updatedAt: now,
    
    metadata: {
      totalProjects: legacySettlement.projects?.length || 0,
      totalMembers: 1,
      isActive: true,
      version: 1
    }
  };
}

/**
 * Transform legacy project data to normalized Project entity
 */
export function transformLegacyProject(
  legacyProject: any,
  ownerId: string,
  settlementId: string
): Project {
  const now = new Date();
  
  return {
    id: legacyProject.id,
    name: legacyProject.name || 'Untitled Project',
    description: legacyProject.description || '',
    
    ownerId,
    settlementId,
    
    status: legacyProject.status || 'not_started',
    priority: legacyProject.priority || 'medium',
    items: legacyProject.items?.map((item: any) => ({
      itemId: item.itemId,
      name: item.name || item.itemId,
      quantity: item.quantity || 0,
      recipeIndex: item.recipeIndex,
      isCompleted: item.isCompleted || false,
      notes: item.notes,
      reservedQuantity: 0,
      requiredBy: convertFirestoreTimestamp(item.requiredBy)
    })) || [],
    progressPercentage: legacyProject.progressPercentage || 0,
    notes: legacyProject.notes || '',
    
    isShared: false, // Will be determined by collaboration records
    isTemplate: false,
    visibility: 'private',
    
    createdAt: convertFirestoreTimestamp(legacyProject.dateCreated) || now,
    updatedAt: now,
    dueDate: convertFirestoreTimestamp(legacyProject.dueDate),
    completedAt: legacyProject.status === 'completed' ? now : undefined,
    
    metadata: {
      totalTasks: 0, // Will be calculated during task migration
      totalCollaborators: 0, // Will be calculated during collaboration migration
      estimatedHours: legacyProject.estimatedHours,
      actualHours: legacyProject.actualHours,
      tags: legacyProject.tags || [],
      version: 1
    }
  };
}

/**
 * Transform legacy task data to normalized Task entity
 */
export function transformLegacyTask(
  legacyTask: any,
  projectId: string,
  createdBy: string
): Task {
  const now = new Date();
  
  return {
    id: legacyTask.id,
    title: legacyTask.title || legacyTask.name || 'Untitled Task',
    description: legacyTask.description || '',
    
    projectId,
    assignedTo: legacyTask.assignedTo,
    createdBy,
    
    status: legacyTask.status || 'pending',
    priority: legacyTask.priority || 'medium',
    estimatedHours: legacyTask.estimatedHours,
    actualHours: legacyTask.actualHours,
    
    createdAt: convertFirestoreTimestamp(legacyTask.dateCreated) || now,
    updatedAt: convertFirestoreTimestamp(legacyTask.lastUpdated) || now,
    dueDate: convertFirestoreTimestamp(legacyTask.dueDate),
    startedAt: convertFirestoreTimestamp(legacyTask.startedAt),
    completedAt: convertFirestoreTimestamp(legacyTask.completedAt),
    
    requirements: legacyTask.requirements?.map((req: any) => ({
      itemId: req.itemId,
      itemName: req.itemName || req.itemId,
      quantityRequired: req.quantityRequired || 0,
      quantityAvailable: req.quantityAvailable || 0,
      isOptional: req.isOptional || false
    })) || [],
    dependencies: legacyTask.dependencies || [],
    
    metadata: {
      tags: legacyTask.tags || [],
      attachments: [],
      comments: [],
      version: 1
    }
  };
}

/**
 * Transform legacy collaboration data to normalized ProjectCollaboration entity
 */
export function transformLegacyCollaboration(
  legacyCollab: LegacyCollaboration,
  collaboratorId: string
): ProjectCollaboration {
  const now = new Date();
  
  return {
    id: `${legacyCollab.projectId}_${collaboratorId}`,
    
    projectId: legacyCollab.projectId,
    userId: collaboratorId,
    invitedBy: legacyCollab.ownerId,
    
    role: 'contributor',
    status: legacyCollab.isActive ? 'active' : 'removed',
    permissions: {
      canEdit: true,
      canDelete: false,
      canInvite: false,
      canManageTasks: true,
      canManageInventory: false,
      canExport: true
    },
    
    invitedAt: convertFirestoreTimestamp(legacyCollab.createdAt) || now,
    acceptedAt: legacyCollab.isActive ? (convertFirestoreTimestamp(legacyCollab.createdAt) || now) : undefined,
    lastActiveAt: convertFirestoreTimestamp(legacyCollab.updatedAt),
    removedAt: !legacyCollab.isActive ? (convertFirestoreTimestamp(legacyCollab.updatedAt) || now) : undefined,
    
    metadata: {
      inviteMessage: 'Migrated from legacy collaboration system',
      activityLog: [
        {
          action: 'migrated_from_legacy',
          timestamp: now,
          details: {
            legacyCollaborationId: legacyCollab.id,
            projectName: legacyCollab.projectName
          }
        }
      ],
      version: 1
    }
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Convert Firestore Timestamp to Date, handle various input types
 */
export function convertFirestoreTimestamp(timestamp: any): Date | undefined {
  if (!timestamp) return undefined;
  
  if (timestamp instanceof Date) return timestamp;
  
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }
  
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  
  if (typeof timestamp === 'string') {
    const parsed = new Date(timestamp);
    return isNaN(parsed.getTime()) ? undefined : parsed;
  }
  
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }
  
  return undefined;
}

/**
 * Generate unique ID for entities
 */
export function generateId(prefix: string, ...parts: string[]): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2);
  const combined = parts.filter(Boolean).join('_');
  return combined ? `${prefix}_${combined}_${timestamp}${random}` : `${prefix}_${timestamp}${random}`;
}

/**
 * Validate data integrity before migration
 */
export function validateMigrationData(data: any, entityType: string): string[] {
  const errors: string[] = [];
  
  switch (entityType) {
    case 'user':
      if (!data.email) errors.push('User missing email');
      if (!data.id) errors.push('User missing ID');
      break;
      
    case 'settlement':
      if (!data.ownerId) errors.push('Settlement missing ownerId');
      if (!data.name) errors.push('Settlement missing name');
      break;
      
    case 'project':
      if (!data.ownerId) errors.push('Project missing ownerId');
      if (!data.settlementId) errors.push('Project missing settlementId');
      if (!data.name) errors.push('Project missing name');
      break;
      
    case 'task':
      if (!data.projectId) errors.push('Task missing projectId');
      if (!data.createdBy) errors.push('Task missing createdBy');
      if (!data.title) errors.push('Task missing title');
      break;
      
    case 'collaboration':
      if (!data.projectId) errors.push('Collaboration missing projectId');
      if (!data.userId) errors.push('Collaboration missing userId');
      if (!data.invitedBy) errors.push('Collaboration missing invitedBy');
      break;
  }
  
  return errors;
}

/**
 * Create batch operations for efficient writes
 */
export function createBatchOperations(
  operations: Array<{
    type: 'create' | 'update' | 'delete';
    collection: string;
    id: string;
    data?: any;
  }>,
  batchSize: number = 500
): Array<Array<typeof operations[0]>> {
  const batches: Array<Array<typeof operations[0]>> = [];
  
  for (let i = 0; i < operations.length; i += batchSize) {
    batches.push(operations.slice(i, i + batchSize));
  }
  
  return batches;
}

/**
 * Execute batch operations with error handling
 */
export async function executeBatchOperations(
  operations: Array<{
    type: 'create' | 'update' | 'delete';
    collection: string;
    id: string;
    data?: any;
  }>,
  options: MigrationOptions = DEFAULT_MIGRATION_OPTIONS
): Promise<MigrationResult> {
  const startTime = Date.now();
  const result: MigrationResult = {
    success: true,
    recordsProcessed: 0,
    recordsCreated: 0,
    recordsSkipped: 0,
    errors: [],
    warnings: [],
    timeElapsed: 0
  };
  
  try {
    const batches = createBatchOperations(operations, options.batchSize);
    
    for (const batchOps of batches) {
      const batch = writeBatch(db);
      
      for (const op of batchOps) {
        const docRef = doc(db, op.collection, op.id);
        
        if (options.dryRun) {
          console.log(`[DRY RUN] ${op.type}: ${op.collection}/${op.id}`);
          result.recordsProcessed++;
          continue;
        }
        
        try {
          switch (op.type) {
            case 'create':
            case 'update':
              if (!op.data) {
                result.errors.push(`No data provided for ${op.type} operation: ${op.collection}/${op.id}`);
                continue;
              }
              batch.set(docRef, {
                ...op.data,
                updatedAt: serverTimestamp()
              }, { merge: op.type === 'update' });
              result.recordsCreated++;
              break;
              
            case 'delete':
              batch.delete(docRef);
              break;
          }
          
          result.recordsProcessed++;
        } catch (error) {
          result.errors.push(`Error processing ${op.type} for ${op.collection}/${op.id}: ${error}`);
        }
      }
      
      if (!options.dryRun && batchOps.length > 0) {
        await batch.commit();
      }
    }
    
  } catch (error) {
    result.success = false;
    result.errors.push(`Batch execution failed: ${error}`);
  }
  
  result.timeElapsed = Date.now() - startTime;
  return result;
}

/**
 * Log migration progress and results
 */
export function logMigrationResult(
  phase: string,
  result: MigrationResult,
  options: MigrationOptions
): void {
  const prefix = options.dryRun ? '[DRY RUN]' : '';
  
  console.log(`${prefix} ${phase} Migration Result:`);
  console.log(`  Success: ${result.success}`);
  console.log(`  Records Processed: ${result.recordsProcessed}`);
  console.log(`  Records Created: ${result.recordsCreated}`);
  console.log(`  Records Skipped: ${result.recordsSkipped}`);
  console.log(`  Time Elapsed: ${result.timeElapsed}ms`);
  
  if (result.errors.length > 0) {
    console.error(`  Errors (${result.errors.length}):`);
    result.errors.forEach(error => console.error(`    - ${error}`));
  }
  
  if (result.warnings.length > 0) {
    console.warn(`  Warnings (${result.warnings.length}):`);
    result.warnings.forEach(warning => console.warn(`    - ${warning}`));
  }
}

// ============================================================================
// MIGRATION VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validate migration results by comparing record counts
 */
export async function validateMigrationResults(): Promise<MigrationReport> {
  const report: MigrationReport = {
    totalUsers: 0,
    totalSettlements: 0,
    totalProjects: 0,
    totalTasks: 0,
    totalCollaborations: 0,
    orphanedRecords: 0,
    duplicateRecords: 0,
    dataIntegrityIssues: []
  };
  
  try {
    // Count records in new collections
    const [users, settlements, projects, tasks, collaborations] = await Promise.all([
      getDocs(collection(db, COLLECTION_NAMES.USERS)),
      getDocs(collection(db, COLLECTION_NAMES.SETTLEMENTS)),
      getDocs(collection(db, COLLECTION_NAMES.PROJECTS)),
      getDocs(collection(db, COLLECTION_NAMES.TASKS)),
      getDocs(collection(db, COLLECTION_NAMES.PROJECT_COLLABORATIONS))
    ]);
    
    report.totalUsers = users.size;
    report.totalSettlements = settlements.size;
    report.totalProjects = projects.size;
    report.totalTasks = tasks.size;
    report.totalCollaborations = collaborations.size;
    
    // Validate data integrity
    // Check for orphaned records
    const orphanedTasks = await validateTaskProjectReferences();
    const orphanedCollaborations = await validateCollaborationReferences();
    
    report.orphanedRecords = orphanedTasks.length + orphanedCollaborations.length;
    
    if (orphanedTasks.length > 0) {
      report.dataIntegrityIssues.push(`Found ${orphanedTasks.length} orphaned tasks`);
    }
    
    if (orphanedCollaborations.length > 0) {
      report.dataIntegrityIssues.push(`Found ${orphanedCollaborations.length} orphaned collaborations`);
    }
    
  } catch (error) {
    report.dataIntegrityIssues.push(`Validation failed: ${error}`);
  }
  
  return report;
}

/**
 * Validate task-project references
 */
async function validateTaskProjectReferences(): Promise<string[]> {
  const orphanedTasks: string[] = [];
  
  try {
    const tasksSnapshot = await getDocs(collection(db, COLLECTION_NAMES.TASKS));
    const projectIds = new Set<string>();
    
    // Get all project IDs
    const projectsSnapshot = await getDocs(collection(db, COLLECTION_NAMES.PROJECTS));
    projectsSnapshot.forEach(doc => projectIds.add(doc.id));
    
    // Check for orphaned tasks
    tasksSnapshot.forEach(taskDoc => {
      const task = taskDoc.data();
      if (!projectIds.has(task.projectId)) {
        orphanedTasks.push(taskDoc.id);
      }
    });
    
  } catch (error) {
    console.error('Error validating task references:', error);
  }
  
  return orphanedTasks;
}

/**
 * Validate collaboration-project references
 */
async function validateCollaborationReferences(): Promise<string[]> {
  const orphanedCollaborations: string[] = [];
  
  try {
    const collaborationsSnapshot = await getDocs(collection(db, COLLECTION_NAMES.PROJECT_COLLABORATIONS));
    const projectIds = new Set<string>();
    const userIds = new Set<string>();
    
    // Get all project and user IDs
    const [projectsSnapshot, usersSnapshot] = await Promise.all([
      getDocs(collection(db, COLLECTION_NAMES.PROJECTS)),
      getDocs(collection(db, COLLECTION_NAMES.USERS))
    ]);
    
    projectsSnapshot.forEach(doc => projectIds.add(doc.id));
    usersSnapshot.forEach(doc => userIds.add(doc.id));
    
    // Check for orphaned collaborations
    collaborationsSnapshot.forEach(collabDoc => {
      const collab = collabDoc.data();
      if (!projectIds.has(collab.projectId) || !userIds.has(collab.userId)) {
        orphanedCollaborations.push(collabDoc.id);
      }
    });
    
  } catch (error) {
    console.error('Error validating collaboration references:', error);
  }
  
  return orphanedCollaborations;
} 