// ============================================================================
// NORMALIZED FIRESTORE COLLECTION STRUCTURE
// ============================================================================
// This file defines the new Firestore collection structure, indexes, and
// security rules requirements for the normalized database architecture
// ============================================================================

// ============================================================================
// COLLECTION NAMES
// ============================================================================

export const COLLECTION_NAMES = {
  // Core entities
  USERS: 'users_v2',
  SETTLEMENTS: 'settlements_v2',
  PROJECTS: 'projects_v2',
  TASKS: 'tasks_v2',
  
  // Relationship tables
  PROJECT_COLLABORATIONS: 'project_collaborations_v2',
  SHARED_PROJECTS: 'shared_projects_v2',
  BUILD_LISTS: 'build_lists_v2',
  
  // System collections
  MIGRATION_STATUS: 'migration_status',
  ACTIVITY_LOGS: 'activity_logs_v2',
  SYSTEM_NOTIFICATIONS: 'system_notifications_v2',
  
  // Legacy collections (will be deprecated)
  LEGACY_USERS: 'users',
  LEGACY_PROJECT_COLLABORATIONS: 'projectCollaborations',
  LEGACY_SHARED_PROJECTS: 'sharedProjects'
} as const;

// ============================================================================
// COLLECTION STRUCTURE DEFINITIONS
// ============================================================================

export interface CollectionStructure {
  name: string;
  description: string;
  primaryKey: string;
  foreignKeys: ForeignKey[];
  indexes: IndexDefinition[];
  securityRules: SecurityRule[];
  estimatedDocumentSize: string;
  expectedDocumentCount: string;
}

export interface ForeignKey {
  field: string;
  referencesCollection: string;
  referencesField: string;
  isRequired: boolean;
  cascadeDelete: boolean;
}

export interface IndexDefinition {
  fields: IndexField[];
  description: string;
  type: 'composite' | 'single' | 'array';
  isUnique?: boolean;
  scope: 'collection' | 'collection-group';
}

export interface IndexField {
  fieldPath: string;
  order: 'asc' | 'desc';
  arrayConfig?: 'contains';
}

export interface SecurityRule {
  operation: 'read' | 'write' | 'create' | 'update' | 'delete';
  condition: string;
  description: string;
}

// ============================================================================
// COLLECTION DEFINITIONS
// ============================================================================

export const COLLECTIONS: Record<string, CollectionStructure> = {
  USERS: {
    name: COLLECTION_NAMES.USERS,
    description: 'User accounts and profiles',
    primaryKey: 'id',
    foreignKeys: [
      {
        field: 'defaultSettlementId',
        referencesCollection: COLLECTION_NAMES.SETTLEMENTS,
        referencesField: 'id',
        isRequired: false,
        cascadeDelete: false
      }
    ],
    indexes: [
      {
        fields: [{ fieldPath: 'email', order: 'asc' }],
        description: 'User lookup by email',
        type: 'single',
        isUnique: true,
        scope: 'collection'
      },
      {
        fields: [{ fieldPath: 'createdAt', order: 'desc' }],
        description: 'Recent users',
        type: 'single',
        scope: 'collection'
      },
      {
        fields: [{ fieldPath: 'lastSignIn', order: 'desc' }],
        description: 'Active users',
        type: 'single',
        scope: 'collection'
      }
    ],
    securityRules: [
      {
        operation: 'read',
        condition: 'request.auth != null && request.auth.uid == resource.id',
        description: 'Users can read their own profile'
      },
      {
        operation: 'write',
        condition: 'request.auth != null && request.auth.uid == resource.id',
        description: 'Users can update their own profile'
      }
    ],
    estimatedDocumentSize: '2-5 KB',
    expectedDocumentCount: '1K-10K'
  },

  SETTLEMENTS: {
    name: COLLECTION_NAMES.SETTLEMENTS,
    description: 'User settlements with inventory and settings',
    primaryKey: 'id',
    foreignKeys: [
      {
        field: 'ownerId',
        referencesCollection: COLLECTION_NAMES.USERS,
        referencesField: 'id',
        isRequired: true,
        cascadeDelete: true
      }
    ],
    indexes: [
      {
        fields: [{ fieldPath: 'ownerId', order: 'asc' }],
        description: 'Settlements by owner',
        type: 'single',
        scope: 'collection'
      },
      {
        fields: [
          { fieldPath: 'ownerId', order: 'asc' },
          { fieldPath: 'createdAt', order: 'desc' }
        ],
        description: 'User settlements by creation date',
        type: 'composite',
        scope: 'collection'
      },
      {
        fields: [{ fieldPath: 'settings.isPublic', order: 'asc' }],
        description: 'Public settlements',
        type: 'single',
        scope: 'collection'
      }
    ],
    securityRules: [
      {
        operation: 'read',
        condition: 'request.auth != null && (request.auth.uid == resource.data.ownerId || resource.data.settings.isPublic == true)',
        description: 'Owners and public settlements can be read'
      },
      {
        operation: 'write',
        condition: 'request.auth != null && request.auth.uid == resource.data.ownerId',
        description: 'Only owners can modify settlements'
      }
    ],
    estimatedDocumentSize: '5-20 KB',
    expectedDocumentCount: '1K-15K'
  },

  PROJECTS: {
    name: COLLECTION_NAMES.PROJECTS,
    description: 'Individual projects with items and metadata',
    primaryKey: 'id',
    foreignKeys: [
      {
        field: 'ownerId',
        referencesCollection: COLLECTION_NAMES.USERS,
        referencesField: 'id',
        isRequired: true,
        cascadeDelete: true
      },
      {
        field: 'settlementId',
        referencesCollection: COLLECTION_NAMES.SETTLEMENTS,
        referencesField: 'id',
        isRequired: true,
        cascadeDelete: true
      }
    ],
    indexes: [
      {
        fields: [{ fieldPath: 'ownerId', order: 'asc' }],
        description: 'Projects by owner',
        type: 'single',
        scope: 'collection'
      },
      {
        fields: [{ fieldPath: 'settlementId', order: 'asc' }],
        description: 'Projects by settlement',
        type: 'single',
        scope: 'collection'
      },
      {
        fields: [
          { fieldPath: 'ownerId', order: 'asc' },
          { fieldPath: 'status', order: 'asc' },
          { fieldPath: 'updatedAt', order: 'desc' }
        ],
        description: 'User projects by status and update date',
        type: 'composite',
        scope: 'collection'
      },
      {
        fields: [
          { fieldPath: 'settlementId', order: 'asc' },
          { fieldPath: 'priority', order: 'desc' },
          { fieldPath: 'createdAt', order: 'desc' }
        ],
        description: 'Settlement projects by priority',
        type: 'composite',
        scope: 'collection'
      },
      {
        fields: [{ fieldPath: 'visibility', order: 'asc' }],
        description: 'Projects by visibility',
        type: 'single',
        scope: 'collection'
      },
      {
        fields: [{ fieldPath: 'isShared', order: 'asc' }],
        description: 'Shared projects',
        type: 'single',
        scope: 'collection'
      },
      {
        fields: [{ fieldPath: 'metadata.tags', arrayConfig: 'contains', order: 'asc' }],
        description: 'Projects by tags',
        type: 'array',
        scope: 'collection'
      }
    ],
    securityRules: [
      {
        operation: 'read',
        condition: 'request.auth != null && (request.auth.uid == resource.data.ownerId || resource.data.visibility == "public" || hasCollaboratorAccess(request.auth.uid, resource.id))',
        description: 'Owners, public projects, and collaborators can read'
      },
      {
        operation: 'create',
        condition: 'request.auth != null && request.auth.uid == request.resource.data.ownerId',
        description: 'Users can create projects they own'
      },
      {
        operation: 'update',
        condition: 'request.auth != null && (request.auth.uid == resource.data.ownerId || hasCollaboratorWriteAccess(request.auth.uid, resource.id))',
        description: 'Owners and collaborators with write access can update'
      },
      {
        operation: 'delete',
        condition: 'request.auth != null && request.auth.uid == resource.data.ownerId',
        description: 'Only owners can delete projects'
      }
    ],
    estimatedDocumentSize: '10-50 KB',
    expectedDocumentCount: '5K-50K'
  },

  TASKS: {
    name: COLLECTION_NAMES.TASKS,
    description: 'Individual tasks within projects',
    primaryKey: 'id',
    foreignKeys: [
      {
        field: 'projectId',
        referencesCollection: COLLECTION_NAMES.PROJECTS,
        referencesField: 'id',
        isRequired: true,
        cascadeDelete: true
      },
      {
        field: 'assignedTo',
        referencesCollection: COLLECTION_NAMES.USERS,
        referencesField: 'id',
        isRequired: false,
        cascadeDelete: false
      },
      {
        field: 'createdBy',
        referencesCollection: COLLECTION_NAMES.USERS,
        referencesField: 'id',
        isRequired: true,
        cascadeDelete: false
      }
    ],
    indexes: [
      {
        fields: [{ fieldPath: 'projectId', order: 'asc' }],
        description: 'Tasks by project',
        type: 'single',
        scope: 'collection'
      },
      {
        fields: [{ fieldPath: 'assignedTo', order: 'asc' }],
        description: 'Tasks by assignee',
        type: 'single',
        scope: 'collection'
      },
      {
        fields: [
          { fieldPath: 'assignedTo', order: 'asc' },
          { fieldPath: 'status', order: 'asc' },
          { fieldPath: 'priority', order: 'desc' }
        ],
        description: 'User tasks by status and priority',
        type: 'composite',
        scope: 'collection'
      },
      {
        fields: [
          { fieldPath: 'projectId', order: 'asc' },
          { fieldPath: 'status', order: 'asc' },
          { fieldPath: 'createdAt', order: 'asc' }
        ],
        description: 'Project tasks by status and creation',
        type: 'composite',
        scope: 'collection'
      },
      {
        fields: [{ fieldPath: 'dueDate', order: 'asc' }],
        description: 'Tasks by due date',
        type: 'single',
        scope: 'collection'
      }
    ],
    securityRules: [
      {
        operation: 'read',
        condition: 'request.auth != null && (request.auth.uid == resource.data.assignedTo || request.auth.uid == resource.data.createdBy || hasProjectAccess(request.auth.uid, resource.data.projectId))',
        description: 'Assignees, creators, and project members can read'
      },
      {
        operation: 'create',
        condition: 'request.auth != null && hasProjectWriteAccess(request.auth.uid, request.resource.data.projectId)',
        description: 'Project members with write access can create tasks'
      },
      {
        operation: 'update',
        condition: 'request.auth != null && (request.auth.uid == resource.data.assignedTo || hasProjectWriteAccess(request.auth.uid, resource.data.projectId))',
        description: 'Assignees and project writers can update'
      },
      {
        operation: 'delete',
        condition: 'request.auth != null && (request.auth.uid == resource.data.createdBy || hasProjectWriteAccess(request.auth.uid, resource.data.projectId))',
        description: 'Creators and project writers can delete'
      }
    ],
    estimatedDocumentSize: '2-10 KB',
    expectedDocumentCount: '10K-100K'
  },

  PROJECT_COLLABORATIONS: {
    name: COLLECTION_NAMES.PROJECT_COLLABORATIONS,
    description: 'Project collaboration relationships',
    primaryKey: 'id',
    foreignKeys: [
      {
        field: 'projectId',
        referencesCollection: COLLECTION_NAMES.PROJECTS,
        referencesField: 'id',
        isRequired: true,
        cascadeDelete: true
      },
      {
        field: 'userId',
        referencesCollection: COLLECTION_NAMES.USERS,
        referencesField: 'id',
        isRequired: true,
        cascadeDelete: true
      },
      {
        field: 'invitedBy',
        referencesCollection: COLLECTION_NAMES.USERS,
        referencesField: 'id',
        isRequired: true,
        cascadeDelete: false
      }
    ],
    indexes: [
      {
        fields: [{ fieldPath: 'projectId', order: 'asc' }],
        description: 'Collaborations by project',
        type: 'single',
        scope: 'collection'
      },
      {
        fields: [{ fieldPath: 'userId', order: 'asc' }],
        description: 'Collaborations by user',
        type: 'single',
        scope: 'collection'
      },
      {
        fields: [
          { fieldPath: 'userId', order: 'asc' },
          { fieldPath: 'status', order: 'asc' }
        ],
        description: 'User collaborations by status',
        type: 'composite',
        scope: 'collection'
      },
      {
        fields: [
          { fieldPath: 'projectId', order: 'asc' },
          { fieldPath: 'role', order: 'asc' }
        ],
        description: 'Project collaborators by role',
        type: 'composite',
        scope: 'collection'
      },
      {
        fields: [
          { fieldPath: 'projectId', order: 'asc' },
          { fieldPath: 'userId', order: 'asc' }
        ],
        description: 'Unique project-user pairs',
        type: 'composite',
        isUnique: true,
        scope: 'collection'
      }
    ],
    securityRules: [
      {
        operation: 'read',
        condition: 'request.auth != null && (request.auth.uid == resource.data.userId || hasProjectAccess(request.auth.uid, resource.data.projectId))',
        description: 'Users and project members can read collaborations'
      },
      {
        operation: 'create',
        condition: 'request.auth != null && hasProjectAdminAccess(request.auth.uid, request.resource.data.projectId)',
        description: 'Project admins can invite collaborators'
      },
      {
        operation: 'update',
        condition: 'request.auth != null && (request.auth.uid == resource.data.userId || hasProjectAdminAccess(request.auth.uid, resource.data.projectId))',
        description: 'Users can accept invites, admins can modify roles'
      },
      {
        operation: 'delete',
        condition: 'request.auth != null && (request.auth.uid == resource.data.userId || hasProjectAdminAccess(request.auth.uid, resource.data.projectId))',
        description: 'Users can leave, admins can remove'
      }
    ],
    estimatedDocumentSize: '1-3 KB',
    expectedDocumentCount: '5K-50K'
  }
};

// ============================================================================
// FIRESTORE INDEXES CONFIGURATION
// ============================================================================

export const FIRESTORE_INDEXES = {
  // Generate firestore.indexes.json content
  indexes: Object.values(COLLECTIONS).flatMap(collection => 
    collection.indexes.map(index => ({
      collectionGroup: collection.name,
      queryScope: index.scope.toUpperCase(),
      fields: index.fields.map(field => ({
        fieldPath: field.fieldPath,
        order: field.order?.toUpperCase(),
        arrayConfig: field.arrayConfig?.toUpperCase()
      }))
    }))
  ),
  
  // Field overrides for specific configurations
  fieldOverrides: [
    {
      collectionGroup: COLLECTION_NAMES.PROJECTS,
      fieldPath: 'metadata.tags',
      indexes: [
        {
          order: 'ASCENDING',
          queryScope: 'COLLECTION'
        },
        {
          arrayConfig: 'CONTAINS',
          queryScope: 'COLLECTION'
        }
      ]
    }
  ]
};

// ============================================================================
// SECURITY RULES HELPERS
// ============================================================================

export const SECURITY_RULE_FUNCTIONS = `
// Helper functions for security rules
function hasProjectAccess(userId, projectId) {
  return exists(/databases/$(database)/documents/project_collaborations_v2/$(userId + '_' + projectId));
}

function hasProjectWriteAccess(userId, projectId) {
  let collaboration = get(/databases/$(database)/documents/project_collaborations_v2/$(userId + '_' + projectId));
  return collaboration.data.status == 'active' && 
         (collaboration.data.role in ['contributor', 'admin', 'owner']) &&
         collaboration.data.permissions.canEdit == true;
}

function hasProjectAdminAccess(userId, projectId) {
  let collaboration = get(/databases/$(database)/documents/project_collaborations_v2/$(userId + '_' + projectId));
  return collaboration.data.status == 'active' && 
         (collaboration.data.role in ['admin', 'owner']);
}

function hasCollaboratorAccess(userId, projectId) {
  return exists(/databases/$(database)/documents/project_collaborations_v2/$(userId + '_' + projectId));
}

function hasCollaboratorWriteAccess(userId, projectId) {
  return hasProjectWriteAccess(userId, projectId);
}
`;

// ============================================================================
// MIGRATION UTILITIES
// ============================================================================

export interface MigrationConfig {
  batchSize: number;
  collections: string[];
  dryRun: boolean;
  validateOnly: boolean;
  skipValidation: boolean;
  parallelWorkers: number;
}

export const DEFAULT_MIGRATION_CONFIG: MigrationConfig = {
  batchSize: 500,
  collections: Object.values(COLLECTION_NAMES),
  dryRun: false,
  validateOnly: false,
  skipValidation: false,
  parallelWorkers: 3
};

export const MIGRATION_PHASES = [
  {
    name: 'Phase 1: Users and Settlements',
    collections: [COLLECTION_NAMES.USERS, COLLECTION_NAMES.SETTLEMENTS],
    dependencies: [],
    description: 'Migrate user profiles and extract settlements'
  },
  {
    name: 'Phase 2: Projects',
    collections: [COLLECTION_NAMES.PROJECTS],
    dependencies: [COLLECTION_NAMES.USERS, COLLECTION_NAMES.SETTLEMENTS],
    description: 'Extract and normalize project data'
  },
  {
    name: 'Phase 3: Tasks',
    collections: [COLLECTION_NAMES.TASKS],
    dependencies: [COLLECTION_NAMES.PROJECTS],
    description: 'Extract and link task data'
  },
  {
    name: 'Phase 4: Collaborations',
    collections: [COLLECTION_NAMES.PROJECT_COLLABORATIONS],
    dependencies: [COLLECTION_NAMES.PROJECTS, COLLECTION_NAMES.USERS],
    description: 'Migrate collaboration relationships'
  },
  {
    name: 'Phase 5: Additional Collections',
    collections: [COLLECTION_NAMES.SHARED_PROJECTS, COLLECTION_NAMES.BUILD_LISTS],
    dependencies: [COLLECTION_NAMES.PROJECTS, COLLECTION_NAMES.USERS],
    description: 'Migrate remaining collections'
  }
]; 