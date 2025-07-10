# 🔗 Database Relationship Mappings

## 📋 **Overview**
This document defines the relationships between entities in the normalized BitCraft database schema, including foreign key constraints, join patterns, and data access flows.

---

## 🏗️ **Entity Relationship Diagram**

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     USERS       │    │   SETTLEMENTS   │    │    PROJECTS     │
│                 │    │                 │    │                 │
│ • id (PK)       │◄──┐│ • id (PK)       │◄──┐│ • id (PK)       │
│ • email         │   ││ • ownerId (FK)  │   ││ • ownerId (FK)  │
│ • displayName   │   ││ • name          │   ││ • settlementId  │
│ • preferences   │   ││ • inventory     │   ││ • name          │
│ • metadata      │   ││ • settings      │   ││ • status        │
└─────────────────┘   │└─────────────────┘   │└─────────────────┘
                      │                      │
                      │                      │
┌─────────────────┐   │┌─────────────────┐   │┌─────────────────┐
│PROJECT_COLLABS  │   ││    BUILD_LISTS  │   ││     TASKS       │
│                 │   ││                 │   ││                 │
│ • id (PK)       │   ││ • id (PK)       │   ││ • id (PK)       │
│ • projectId (FK)│───┼┤ • userId (FK)   │───┘│ • projectId (FK)│──┐
│ • userId (FK)   │───┘│ • settlementId  │    │ • assignedTo    │  │
│ • role          │    │ • items         │    │ • createdBy     │  │
│ • permissions   │    └─────────────────┘    │ • status        │  │
└─────────────────┘                          └─────────────────┘  │
                                                                  │
┌─────────────────┐                          ┌─────────────────┐  │
│ SHARED_PROJECTS │                          │ ACTIVITY_LOGS   │  │
│                 │                          │                 │  │
│ • id (PK)       │                          │ • id (PK)       │  │
│ • projectId (FK)│──────────────────────────│ • entityId      │──┘
│ • sharedBy (FK) │                          │ • actorId (FK)  │
│ • accessType    │                          │ • action        │
│ • shareCode     │                          │ • timestamp     │
└─────────────────┘                          └─────────────────┘
```

---

## 🔗 **Relationship Definitions**

### **1. Users → Settlements (1:N)**
```typescript
// One user can own multiple settlements
User.id → Settlement.ownerId
User.defaultSettlementId → Settlement.id (optional)
```

**Relationship Type:** One-to-Many  
**Cascade Delete:** Yes - when user is deleted, their settlements are deleted  
**Foreign Key:** `Settlement.ownerId` references `User.id`

**Query Patterns:**
```typescript
// Get all settlements for a user
query(collection(db, 'settlements_v2'), where('ownerId', '==', userId))

// Get user's default settlement
getDoc(doc(db, 'settlements_v2', user.defaultSettlementId))
```

### **2. Settlements → Projects (1:N)**
```typescript
// One settlement can contain multiple projects
Settlement.id → Project.settlementId
```

**Relationship Type:** One-to-Many  
**Cascade Delete:** Yes - when settlement is deleted, its projects are deleted  
**Foreign Key:** `Project.settlementId` references `Settlement.id`

**Query Patterns:**
```typescript
// Get all projects in a settlement
query(collection(db, 'projects_v2'), where('settlementId', '==', settlementId))

// Get projects by owner and settlement
query(collection(db, 'projects_v2'), 
  where('ownerId', '==', userId),
  where('settlementId', '==', settlementId)
)
```

### **3. Users → Projects (1:N)**
```typescript
// One user can own multiple projects
User.id → Project.ownerId
```

**Relationship Type:** One-to-Many  
**Cascade Delete:** Yes - when user is deleted, their projects are deleted  
**Foreign Key:** `Project.ownerId` references `User.id`

**Query Patterns:**
```typescript
// Get all projects owned by a user
query(collection(db, 'projects_v2'), where('ownerId', '==', userId))

// Get user's projects by status
query(collection(db, 'projects_v2'), 
  where('ownerId', '==', userId),
  where('status', '==', 'in_progress')
)
```

### **4. Projects → Tasks (1:N)**
```typescript
// One project can have multiple tasks
Project.id → Task.projectId
```

**Relationship Type:** One-to-Many  
**Cascade Delete:** Yes - when project is deleted, its tasks are deleted  
**Foreign Key:** `Task.projectId` references `Project.id`

**Query Patterns:**
```typescript
// Get all tasks for a project
query(collection(db, 'tasks_v2'), where('projectId', '==', projectId))

// Get project tasks by status
query(collection(db, 'tasks_v2'), 
  where('projectId', '==', projectId),
  where('status', '==', 'pending')
)
```

### **5. Users → Tasks (1:N) [Assignment]**
```typescript
// One user can be assigned to multiple tasks
User.id → Task.assignedTo (optional)
User.id → Task.createdBy
```

**Relationship Type:** One-to-Many  
**Cascade Delete:** No - when user is deleted, tasks remain but assignment is cleared  
**Foreign Key:** `Task.assignedTo` references `User.id` (nullable)

**Query Patterns:**
```typescript
// Get all tasks assigned to a user
query(collection(db, 'tasks_v2'), where('assignedTo', '==', userId))

// Get tasks created by a user
query(collection(db, 'tasks_v2'), where('createdBy', '==', userId))

// Get user's pending tasks
query(collection(db, 'tasks_v2'), 
  where('assignedTo', '==', userId),
  where('status', '==', 'pending')
)
```

### **6. Projects ↔ Users (M:N) [Collaborations]**
```typescript
// Many projects can have many collaborators (through ProjectCollaboration)
Project.id → ProjectCollaboration.projectId
User.id → ProjectCollaboration.userId
```

**Relationship Type:** Many-to-Many (through junction table)  
**Cascade Delete:** Yes - when project or user is deleted, collaborations are deleted  
**Junction Table:** `ProjectCollaboration`

**Query Patterns:**
```typescript
// Get all collaborators for a project
query(collection(db, 'project_collaborations_v2'), 
  where('projectId', '==', projectId),
  where('status', '==', 'active')
)

// Get all projects a user collaborates on
query(collection(db, 'project_collaborations_v2'), 
  where('userId', '==', userId),
  where('status', '==', 'active')
)

// Get user's role in a specific project
getDoc(doc(db, 'project_collaborations_v2', `${projectId}_${userId}`))
```

### **7. Users → Build Lists (1:N)**
```typescript
// One user can have multiple build lists
User.id → BuildList.userId
Settlement.id → BuildList.settlementId
```

**Relationship Type:** One-to-Many  
**Cascade Delete:** Yes - when user is deleted, their build lists are deleted  
**Foreign Key:** `BuildList.userId` references `User.id`

**Query Patterns:**
```typescript
// Get all build lists for a user
query(collection(db, 'build_lists_v2'), where('userId', '==', userId))

// Get build lists for a settlement
query(collection(db, 'build_lists_v2'), where('settlementId', '==', settlementId))
```

---

## 🎯 **Complex Query Patterns**

### **User Dashboard Query**
```typescript
async function loadUserDashboard(userId: string): Promise<UserDashboard> {
  // Load user data
  const user = await getDoc(doc(db, 'users_v2', userId));
  
  // Load user's settlements
  const settlementsQuery = query(
    collection(db, 'settlements_v2'),
    where('ownerId', '==', userId)
  );
  const settlements = await getDocs(settlementsQuery);
  
  // Load owned projects
  const ownedProjectsQuery = query(
    collection(db, 'projects_v2'),
    where('ownerId', '==', userId),
    orderBy('updatedAt', 'desc'),
    limit(10)
  );
  const ownedProjects = await getDocs(ownedProjectsQuery);
  
  // Load collaborative projects
  const collaborationsQuery = query(
    collection(db, 'project_collaborations_v2'),
    where('userId', '==', userId),
    where('status', '==', 'active')
  );
  const collaborations = await getDocs(collaborationsQuery);
  
  // Load projects from collaborations
  const collaborativeProjectIds = collaborations.docs.map(doc => doc.data().projectId);
  const collaborativeProjects = await Promise.all(
    collaborativeProjectIds.map(id => getDoc(doc(db, 'projects_v2', id)))
  );
  
  // Load assigned tasks
  const tasksQuery = query(
    collection(db, 'tasks_v2'),
    where('assignedTo', '==', userId),
    where('status', 'in', ['pending', 'in_progress']),
    orderBy('dueDate', 'asc'),
    limit(5)
  );
  const tasks = await getDocs(tasksQuery);
  
  return {
    user: user.data(),
    settlements: settlements.docs.map(doc => doc.data()),
    ownedProjects: ownedProjects.docs.map(doc => doc.data()),
    collaborativeProjects: collaborativeProjects.map(doc => doc.data()),
    assignedTasks: tasks.docs.map(doc => doc.data())
  };
}
```

### **Project Details Query**
```typescript
async function loadProjectDetails(projectId: string): Promise<ProjectDetails> {
  // Load project
  const project = await getDoc(doc(db, 'projects_v2', projectId));
  const projectData = project.data();
  
  // Load settlement
  const settlement = await getDoc(doc(db, 'settlements_v2', projectData.settlementId));
  
  // Load tasks
  const tasksQuery = query(
    collection(db, 'tasks_v2'),
    where('projectId', '==', projectId),
    orderBy('createdAt', 'desc')
  );
  const tasks = await getDocs(tasksQuery);
  
  // Load collaborators
  const collaboratorsQuery = query(
    collection(db, 'project_collaborations_v2'),
    where('projectId', '==', projectId),
    where('status', '==', 'active')
  );
  const collaborations = await getDocs(collaboratorsQuery);
  
  // Load user details for collaborators
  const userIds = collaborations.docs.map(doc => doc.data().userId);
  const users = await Promise.all(
    userIds.map(id => getDoc(doc(db, 'users_v2', id)))
  );
  
  const collaborators = collaborations.docs.map((collabDoc, index) => ({
    collaboration: collabDoc.data(),
    user: users[index].data()
  }));
  
  return {
    project: projectData,
    settlement: settlement.data(),
    tasks: tasks.docs.map(doc => doc.data()),
    collaborators
  };
}
```

---

## 🔐 **Security Rule Implications**

### **Hierarchical Access Control**
```javascript
// Users can access their own data
allow read, write: if request.auth.uid == resource.id;

// Settlement access through ownership
allow read: if request.auth.uid == resource.data.ownerId;

// Project access through ownership or collaboration
allow read: if request.auth.uid == resource.data.ownerId 
  || hasCollaboratorAccess(request.auth.uid, resource.id);

// Task access through project ownership or assignment
allow read: if request.auth.uid == resource.data.assignedTo
  || hasProjectAccess(request.auth.uid, resource.data.projectId);
```

### **Permission Levels**
1. **Owner**: Full access to entity and all related entities
2. **Admin Collaborator**: Can manage entity and invite others
3. **Contributor**: Can edit entity content
4. **Viewer**: Read-only access to entity

---

## 📊 **Data Consistency Rules**

### **Referential Integrity**
- All foreign keys must reference valid entities
- Orphaned records are automatically cleaned up
- Cascade deletes maintain data consistency

### **Business Rules**
- Users can only have one default settlement
- Projects must belong to settlements owned by their creator
- Tasks can only be assigned to project collaborators
- Collaboration invites expire after 30 days

### **Data Validation**
- Email addresses must be unique across users
- Project names must be unique within settlements
- Task dependencies cannot create cycles
- Collaboration roles must follow hierarchy (viewer < contributor < admin < owner)

---

## 🔄 **Migration Mapping**

### **Legacy → Normalized Transformations**

#### **User Document Split**
```
Legacy: users/{userId}
├── userProfile       → users_v2/{userId}
├── inventory         → settlements_v2/{settlementId}.inventory
├── buildList         → build_lists_v2/{buildListId}
└── settlement
    ├── projects      → projects_v2/{projectId}
    ├── tasks         → tasks_v2/{taskId}
    └── inventory     → settlements_v2/{settlementId}.inventory
```

#### **Collaboration Normalization**
```
Legacy: projectCollaborations/{collabId}
├── projectId         → project_collaborations_v2/{id}.projectId
├── ownerId           → project_collaborations_v2/{id}.invitedBy
├── collaborators[]   → Multiple project_collaborations_v2 records
└── projectName       → Resolved via projectId reference
```

---

## 🎯 **Query Optimization Strategies**

### **Index Requirements**
```typescript
// Primary indexes for common queries
users_v2: ['email', 'createdAt', 'lastSignIn']
settlements_v2: ['ownerId', 'ownerId+createdAt', 'settings.isPublic']
projects_v2: ['ownerId', 'settlementId', 'ownerId+status+updatedAt']
tasks_v2: ['projectId', 'assignedTo', 'assignedTo+status+priority']
project_collaborations_v2: ['projectId', 'userId', 'userId+status']
```

### **Denormalization Decisions**
- **User metadata**: Store project/collaboration counts for quick dashboard stats
- **Project metadata**: Store task counts and collaborator counts
- **Settlement metadata**: Store project counts and member counts

### **Caching Strategy**
- **User profiles**: Cache for 1 hour
- **Project lists**: Cache for 15 minutes
- **Task assignments**: Real-time updates
- **Collaboration status**: Cache for 5 minutes

---

This relationship mapping ensures data integrity, optimal query performance, and clear access patterns for the normalized BitCraft database architecture. 