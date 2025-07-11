import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  Timestamp,
  collection,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  updateDoc,
  arrayUnion,
  arrayRemove,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from '../firebase/config';
import { SettlementCollaboration, SettlementCollaboratorRole, SettlementCollaborationPermissions, SettlementInviteLink, SettlementMember, User } from '../types/NormalizedDatabase';

// New database structure interfaces
export interface UserV2 {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string;
  username?: string; // Game username/nickname that other players see
  professions?: string[];
  skills?: string[];
  customDisplayName?: string; // Custom display name for privacy
  createdAt: any; // Firestore Timestamp
  lastSignIn: any; // Firestore Timestamp
  defaultSettlementId?: string;
  preferences: {
    theme?: 'light' | 'dark';
    notifications?: boolean;
    [key: string]: any;
  };
}

export interface SettlementV2 {
  id: string;
  name: string;
  ownerId: string;
  createdAt: Timestamp;
  inventory: {
    [itemId: string]: {
      quantity: number;
      reservedQuantity: number;
      storageLocation?: string;
      lastUpdated: Timestamp;
    };
  };
  settings: {
    autoAssignTasks: boolean;
    lowStockThreshold: number;
    enableNotifications: boolean;
    [key: string]: any;
  };
  metadata: {
    description?: string;
    [key: string]: any;
  };
}

export interface ProjectV2 {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  settlementId: string;
  status: 'not_started' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  items: Array<{
    itemId: string;
    itemName: string;
    targetQuantity: number;
    completedQuantity: number;
    recipeIndex: number;
  }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  notes: string;
  isShared: boolean;
  isTemplate: boolean;
  metadata: {
    deadline?: Timestamp;
    estimatedDuration?: number;
    [key: string]: any;
  };
}

export interface TaskV2 {
  id: string;
  projectId: string;
  assignedTo?: string | string[]; // Support both single string (legacy) and array of user IDs
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  metadata: {
    itemId?: string;
    itemName?: string;
    targetQuantity?: number;
    completedQuantity?: number;
    isBaseItem?: boolean;
    buildingRequirement?: string;
    [key: string]: any;
  };
}

export interface TaskContributionV2 {
  id: string;
  userId: string;
  taskId: string;
  settlementId: string;
  itemsContributed: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
  }>;
  submissionDate: Timestamp;
  status: 'pending' | 'approved' | 'rejected';
  notes?: string;
  proofOfWork?: string;
  submittedBy: {
    displayName: string;
    email: string;
  };
  approvedBy?: string;
  approvedAt?: Timestamp;
  rejectedBy?: string;
  rejectedAt?: Timestamp;
  rejectionReason?: string;
}

export interface ProjectCollaboratorV2 {
  id: string;
  projectId: string;
  userId: string;
  role: 'viewer' | 'contributor' | 'admin';
  invitedBy: string;
  invitedAt: Timestamp;
  acceptedAt?: Timestamp;
  status: 'pending' | 'active' | 'removed';
  permissions: {
    canEdit: boolean;
    canDelete: boolean;
    canInvite: boolean;
    [key: string]: any;
  };
}

export interface SharedProjectV2 {
  id: string;
  projectId: string;
  sharedBy: string;
  sharedAt: Timestamp;
  accessType: 'public' | 'link_only';
  downloadCount: number;
  isActive: boolean;
}

export interface BuildListV2 {
  id: string;
  userId: string;
  settlementId: string;
  items: Array<{
    itemId: string;
    itemName: string;
    quantity: number;
    recipeIndex: number;
  }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  metadata: {
    name?: string;
    description?: string;
    [key: string]: any;
  };
}

export class SettlementV2Service {
  // Helper function to safely convert timestamp to date
  private safeToDate(timestamp: any): Date {
    if (!timestamp) {
      return new Date();
    }
    if (timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate();
    }
    if (timestamp instanceof Date) {
      return timestamp;
    }
    return new Date(timestamp);
  }

  // User management
  async createUser(userId: string, userData: Omit<UserV2, 'id' | 'createdAt' | 'lastSignIn'>): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...userData,
      id: userId,
      createdAt: serverTimestamp(),
      lastSignIn: serverTimestamp()
    });
  }

  async getUser(userId: string): Promise<UserV2 | null> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() } as UserV2;
    }
    return null;
  }

  async updateUser(userId: string, updates: Partial<UserV2>): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...updates,
      lastSignIn: serverTimestamp()
    });
  }

  async ensureUserExists(userId: string, userInfo: { email: string; displayName?: string; photoURL?: string }): Promise<UserV2> {
    // First check if user already exists
    const existingUser = await this.getUser(userId);
    if (existingUser) {
      // Update last sign in time
      await this.updateUser(userId, {});
      return existingUser;
    }

    // Create new user with initial username based on display name or email
    const username = userInfo.displayName || userInfo.email?.split('@')[0] || 'User';
    
    const newUserData: Omit<UserV2, 'id' | 'createdAt' | 'lastSignIn'> = {
      email: userInfo.email,
      displayName: userInfo.displayName || '',
      photoURL: userInfo.photoURL,
      username: username,
      preferences: {
        theme: 'light',
        notifications: true
      }
    };

    await this.createUser(userId, newUserData);
    
    // Return the newly created user
    const createdUser = await this.getUser(userId);
    return createdUser!;
  }

  // Settlement management
  async createSettlement(settlementData: Omit<SettlementV2, 'id' | 'createdAt'>): Promise<string> {
    const settlementsRef = collection(db, 'settlements');
    const settlementRef = await addDoc(settlementsRef, {
      ...settlementData,
      createdAt: serverTimestamp()
    });
    
    return settlementRef.id;
  }

  async getSettlement(settlementId: string): Promise<SettlementV2 | null> {
    const settlementRef = doc(db, 'settlements', settlementId);
    const settlementSnap = await getDoc(settlementRef);
    
    if (settlementSnap.exists()) {
      return { id: settlementSnap.id, ...settlementSnap.data() } as SettlementV2;
    }
    return null;
  }

  async updateSettlement(settlementId: string, updates: Partial<SettlementV2>): Promise<void> {
    const settlementRef = doc(db, 'settlements', settlementId);
    await updateDoc(settlementRef, updates);
  }

  async getSettlementsByOwner(ownerId: string): Promise<SettlementV2[]> {
    const q = query(
      collection(db, 'settlements'),
      where('ownerId', '==', ownerId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SettlementV2));
  }

  async getSettlementsUserCanAccess(userId: string): Promise<SettlementV2[]> {
    // Get settlements the user owns
    const ownedSettlements = await this.getSettlementsByOwner(userId);
    
    // Get settlements the user collaborates on
    const collaborationsQuery = query(
      collection(db, 'settlement_collaborations_v2'),
      where('userId', '==', userId),
      where('status', '==', 'active')
    );
    
    const collaborationsSnapshot = await getDocs(collaborationsQuery);
    const collaboratedSettlements: SettlementV2[] = [];
    
    // For each collaboration, get the settlement
    for (const collabDoc of collaborationsSnapshot.docs) {
      const collab = collabDoc.data();
      try {
        const settlement = await this.getSettlement(collab.settlementId);
        if (settlement) {
          collaboratedSettlements.push(settlement);
        }
      } catch (error) {
        console.warn(`Failed to load settlement ${collab.settlementId}:`, error);
      }
    }
    
    // Combine and deduplicate (in case user owns and collaborates on same settlement)
    const allSettlements = [...ownedSettlements];
    for (const settlement of collaboratedSettlements) {
      if (!allSettlements.find(s => s.id === settlement.id)) {
        allSettlements.push(settlement);
      }
    }
    
    // Sort by creation date (newest first)
    return allSettlements.sort((a, b) => {
      const aTime = this.safeToDate(a.createdAt).getTime();
      const bTime = this.safeToDate(b.createdAt).getTime();
      return bTime - aTime;
    });
  }

  // Project management
  async createProject(projectData: Omit<ProjectV2, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const projectsRef = collection(db, 'projects');
    const projectRef = await addDoc(projectsRef, {
      ...projectData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return projectRef.id;
  }

  async getProject(projectId: string): Promise<ProjectV2 | null> {
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (projectSnap.exists()) {
      return { id: projectSnap.id, ...projectSnap.data() } as ProjectV2;
    }
    return null;
  }

  async updateProject(projectId: string, updates: Partial<ProjectV2>): Promise<void> {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  }

  async deleteProject(projectId: string): Promise<void> {
    const batch = writeBatch(db);
    
    // Delete the project
    const projectRef = doc(db, 'projects', projectId);
    batch.delete(projectRef);
    
    // Delete all associated tasks
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('projectId', '==', projectId)
    );
    const tasksSnapshot = await getDocs(tasksQuery);
    tasksSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete all collaborators
    const collaboratorsQuery = query(
      collection(db, 'project_collaborators'),
      where('projectId', '==', projectId)
    );
    const collaboratorsSnapshot = await getDocs(collaboratorsQuery);
    collaboratorsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
  }

  async getProjectsBySettlement(settlementId: string): Promise<ProjectV2[]> {
    const q = query(
      collection(db, 'projects'),
      where('settlementId', '==', settlementId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectV2));
  }

  async getProjectsByOwner(ownerId: string): Promise<ProjectV2[]> {
    const q = query(
      collection(db, 'projects'),
      where('ownerId', '==', ownerId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectV2));
  }

  // Task management
  async createTask(taskData: Omit<TaskV2, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const tasksRef = collection(db, 'tasks_v2');
    const taskRef = await addDoc(tasksRef, {
      ...taskData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return taskRef.id;
  }

  async getTask(taskId: string): Promise<TaskV2 | null> {
    const taskRef = doc(db, 'tasks_v2', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (taskSnap.exists()) {
      return { id: taskSnap.id, ...taskSnap.data() } as TaskV2;
    }
    return null;
  }

  async updateTask(taskId: string, updates: Partial<TaskV2>): Promise<void> {
    const taskRef = doc(db, 'tasks_v2', taskId);
    
    // Filter out undefined values to prevent Firestore errors
    const cleanUpdates: any = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value;
      }
    }
    
    await updateDoc(taskRef, {
      ...cleanUpdates,
      updatedAt: serverTimestamp()
    });
  }

  async deleteTask(taskId: string): Promise<void> {
    const taskRef = doc(db, 'tasks_v2', taskId);
    await deleteDoc(taskRef);
  }

  async getTasksByProject(projectId: string): Promise<TaskV2[]> {
    const q = query(
      collection(db, 'tasks_v2'),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskV2));
  }

  // Public method to refresh all task progress based on current inventory
  async refreshTaskProgressFromInventory(settlementId: string): Promise<void> {
    console.log('🔄 REFRESHING ALL TASK PROGRESS FROM INVENTORY');
    await this.updateAllTaskProgressFromInventory(settlementId);
  }

  // Public method to add items directly to settlement inventory
  async addItemsToInventory(settlementId: string, items: Array<{itemId?: string, itemName: string, quantity: number}>): Promise<void> {
    try {
      console.log('📦 ADDING ITEMS TO INVENTORY:', { settlementId, items });

      const settlement = await this.getSettlement(settlementId);
      if (!settlement) {
        throw new Error(`Settlement ${settlementId} not found`);
      }

      const updatedInventory = { ...settlement.inventory };
      
      for (const item of items) {
        const itemKey = item.itemId || item.itemName;
        
        if (updatedInventory[itemKey]) {
          updatedInventory[itemKey].quantity += item.quantity;
          updatedInventory[itemKey].lastUpdated = serverTimestamp() as any;
        } else {
          updatedInventory[itemKey] = {
            quantity: item.quantity,
            reservedQuantity: 0,
            lastUpdated: serverTimestamp() as any
          };
        }
        
        console.log(`📦 Added ${item.quantity}x ${item.itemName} to inventory`);
      }

      await this.updateSettlement(settlementId, {
        inventory: updatedInventory
      });

      // Auto-update all tasks after inventory change
      await this.updateAllTaskProgressFromInventory(settlementId);

      console.log('✅ Items added to inventory and tasks updated');

    } catch (error) {
      console.error('❌ ERROR adding items to inventory:', error);
      throw error;
    }
  }

  async getTasksByAssignee(assigneeId: string): Promise<TaskV2[]> {
    const q = query(
      collection(db, 'tasks_v2'),
      where('assignedTo', '==', assigneeId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskV2));
  }

  // Task Contributions
  async createTaskContribution(contributionData: Omit<TaskContributionV2, 'id' | 'submissionDate'>): Promise<string> {
    const contributionRef = collection(db, 'task_contributions_v2');
    const docRef = await addDoc(contributionRef, {
      ...contributionData,
      submissionDate: serverTimestamp()
    });
    return docRef.id;
  }

  async getTaskContribution(contributionId: string): Promise<TaskContributionV2 | null> {
    const contributionRef = doc(db, 'task_contributions_v2', contributionId);
    const contributionSnap = await getDoc(contributionRef);
    
    if (contributionSnap.exists()) {
      return { id: contributionSnap.id, ...contributionSnap.data() } as TaskContributionV2;
    }
    return null;
  }

  async updateTaskContribution(contributionId: string, updates: Partial<TaskContributionV2>): Promise<void> {
    const contributionRef = doc(db, 'task_contributions_v2', contributionId);
    await updateDoc(contributionRef, updates);
  }

  async getTaskContributionsByTask(taskId: string): Promise<TaskContributionV2[]> {
    const q = query(
      collection(db, 'task_contributions_v2'),
      where('taskId', '==', taskId),
      orderBy('submissionDate', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskContributionV2));
  }

  async getTaskContributionsByUser(userId: string): Promise<TaskContributionV2[]> {
    const q = query(
      collection(db, 'task_contributions_v2'),
      where('userId', '==', userId),
      orderBy('submissionDate', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskContributionV2));
  }

  async getTaskContributionsBySettlement(settlementId: string): Promise<TaskContributionV2[]> {
    try {
      // Try optimized query with index
      const q = query(
        collection(db, 'task_contributions_v2'),
        where('settlementId', '==', settlementId),
        orderBy('submissionDate', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskContributionV2));
    } catch (error: any) {
      // Fallback for missing index - query without orderBy and sort in memory
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        console.log('Using fallback query for task contributions (index building...)');
        
        const simpleQuery = query(
          collection(db, 'task_contributions_v2'),
          where('settlementId', '==', settlementId)
        );
        
        const querySnapshot = await getDocs(simpleQuery);
        const contributions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskContributionV2));
        
        // Sort in memory by submission date
        return contributions.sort((a, b) => {
          const dateA = this.safeToDate(a.submissionDate);
          const dateB = this.safeToDate(b.submissionDate);
          return dateB.getTime() - dateA.getTime();
        });
      }
      throw error;
    }
  }

  async approveTaskContribution(contributionId: string, approvedBy: string): Promise<void> {
    // Get the contribution details first
    const contribution = await this.getTaskContribution(contributionId);
    if (!contribution) {
      throw new Error('Contribution not found');
    }

    // Update contribution status
    const contributionRef = doc(db, 'task_contributions_v2', contributionId);
    await updateDoc(contributionRef, {
      status: 'approved',
      approvedBy,
      approvedAt: serverTimestamp()
    });

    // Add contributed items to settlement inventory
    await this.updateSettlementInventoryFromContribution(contribution);
    
    // Auto-update all tasks based on new inventory levels
    await this.updateAllTaskProgressFromInventory(contribution.settlementId);
  }

  private async updateSettlementInventoryFromContribution(contribution: TaskContributionV2): Promise<void> {
    try {
      console.log('📦 UPDATING INVENTORY FROM CONTRIBUTION:', {
        contributionId: contribution.id,
        settlementId: contribution.settlementId,
        itemsContributed: contribution.itemsContributed
      });

      // Get current settlement
      const settlement = await this.getSettlement(contribution.settlementId);
      if (!settlement) {
        throw new Error(`Settlement ${contribution.settlementId} not found`);
      }

      // Update inventory with contributed items
      const updatedInventory = { ...settlement.inventory };
      
      for (const item of contribution.itemsContributed) {
        const itemKey = item.itemId || item.itemName; // Use itemId if available, fallback to itemName
        
        if (updatedInventory[itemKey]) {
          // Item exists - add to quantity
          updatedInventory[itemKey].quantity += item.quantity;
          updatedInventory[itemKey].lastUpdated = serverTimestamp() as any;
        } else {
          // New item - create entry
          updatedInventory[itemKey] = {
            quantity: item.quantity,
            reservedQuantity: 0,
            lastUpdated: serverTimestamp() as any
          };
        }
        
        console.log(`📦 Added ${item.quantity}x ${item.itemName} to inventory`);
      }

      // Update settlement with new inventory
      await this.updateSettlement(contribution.settlementId, {
        inventory: updatedInventory
      });

      console.log('✅ Settlement inventory updated successfully');

    } catch (error) {
      console.error('❌ ERROR updating settlement inventory:', error);
      throw error;
    }
  }

  private async updateAllTaskProgressFromInventory(settlementId: string): Promise<void> {
    try {
      console.log('🔄 UPDATING ALL TASKS FROM INVENTORY:', { settlementId });

      // Get settlement with current inventory
      const settlement = await this.getSettlement(settlementId);
      if (!settlement) {
        throw new Error(`Settlement ${settlementId} not found`);
      }

      // Get all projects for this settlement
      const projects = await this.getProjectsBySettlement(settlementId);
      console.log(`📋 Found ${projects.length} projects to check`);

      let tasksUpdated = 0;
      let tasksCompleted = 0;

      for (const project of projects) {
        // Get all tasks for this project
        const projectTasks = await this.getTasksByProject(project.id);
        console.log(`📋 Project "${project.name}" has ${projectTasks.length} tasks`);

        for (const task of projectTasks) {
          const wasUpdated = await this.updateSingleTaskFromInventory(task, settlement.inventory);
          if (wasUpdated) {
            tasksUpdated++;
            if (task.status === 'completed') {
              tasksCompleted++;
            }
          }
        }

        // Update project progress after all tasks checked
        await this.updateProjectProgressFromInventory(project, settlement.inventory);
      }

      console.log(`✅ INVENTORY UPDATE COMPLETE:`, {
        tasksUpdated,
        tasksCompleted,
        projectsChecked: projects.length
      });

    } catch (error) {
      console.error('❌ ERROR updating tasks from inventory:', error);
      // Don't throw - contribution approval should still work
    }
  }

  private async updateSingleTaskFromInventory(task: TaskV2, inventory: any): Promise<boolean> {
    try {
      if (!task.metadata?.itemName || !task.metadata?.targetQuantity) {
        // Skip tasks without item requirements
        return false;
      }

      const itemKey = task.metadata.itemId || task.metadata.itemName;
      const availableQuantity = inventory[itemKey]?.quantity || 0;
      const targetQuantity = task.metadata.targetQuantity;

      // Calculate new progress and status
      const newCompletedQuantity = Math.min(availableQuantity, targetQuantity);
      let newStatus = task.status;

      if (newCompletedQuantity >= targetQuantity) {
        newStatus = 'completed';
      } else if (newCompletedQuantity > 0) {
        newStatus = 'in_progress';
      } else {
        newStatus = 'pending';
      }

      // Check if task needs updating
      const currentCompleted = task.metadata.completedQuantity || 0;
      if (newCompletedQuantity !== currentCompleted || newStatus !== task.status) {
        console.log(`🔄 Updating task "${task.title}":`, {
          item: task.metadata.itemName,
          available: availableQuantity,
          target: targetQuantity,
          oldCompleted: currentCompleted,
          newCompleted: newCompletedQuantity,
          oldStatus: task.status,
          newStatus
        });

        await this.updateTask(task.id, {
          status: newStatus,
          metadata: {
            ...task.metadata,
            completedQuantity: newCompletedQuantity
          }
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error(`❌ ERROR updating task ${task.id}:`, error);
      return false;
    }
  }

  private async updateProjectProgressFromInventory(project: ProjectV2, inventory: any): Promise<void> {
    try {
      const projectTasks = await this.getTasksByProject(project.id);
      
      // Calculate completion status based on tasks
      const totalTasks = projectTasks.length;
      const completedTasks = projectTasks.filter(task => task.status === 'completed').length;
      
      if (totalTasks === 0) return;
      
      // Determine new project status
      let newProjectStatus = project.status;
      if (completedTasks === totalTasks) {
        newProjectStatus = 'completed';
      } else if (completedTasks > 0) {
        newProjectStatus = 'in_progress';
      } else {
        newProjectStatus = 'not_started';
      }

      // Update project if status changed
      if (newProjectStatus !== project.status) {
        await this.updateProject(project.id, {
          status: newProjectStatus
        });
        
        console.log(`📋 Project "${project.name}" status: ${project.status} → ${newProjectStatus} (${completedTasks}/${totalTasks} tasks)`);
      }
    } catch (error) {
      console.error(`❌ ERROR updating project ${project.id} progress:`, error);
    }
  }



  async rejectTaskContribution(contributionId: string, rejectedBy: string, rejectionReason: string): Promise<void> {
    const contributionRef = doc(db, 'task_contributions_v2', contributionId);
    await updateDoc(contributionRef, {
      status: 'rejected',
      rejectedBy,
      rejectedAt: serverTimestamp(),
      rejectionReason
    });

    // Note: We don't reverse task progress for rejected contributions
    // This prevents gaming the system and maintains data integrity
    console.log(`Contribution ${contributionId} rejected by ${rejectedBy}: ${rejectionReason}`);
  }

  // Project Collaborations
  async createCollaboration(collaborationData: Omit<ProjectCollaboratorV2, 'id' | 'invitedAt'>): Promise<string> {
    const collaborationRef = collection(db, 'project_collaborators_v2');
    const docRef = await addDoc(collaborationRef, {
      ...collaborationData,
      invitedAt: serverTimestamp()
    });
    return docRef.id;
  }

  async getProjectCollaborators(projectId: string): Promise<ProjectCollaboratorV2[]> {
    const q = query(
      collection(db, 'project_collaborators'),
      where('projectId', '==', projectId),
      where('status', '==', 'active')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectCollaboratorV2));
  }

  // Settlement collaboration management
  async createSettlementCollaboration(collaborationData: Omit<SettlementCollaboration, 'id' | 'invitedAt'>): Promise<string> {
    // Use predictable ID format: userId_settlementId
    const collaborationId = `${collaborationData.userId}_${collaborationData.settlementId}`;
    const collabRef = doc(db, 'settlement_collaborations_v2', collaborationId);
    
    // 🔍 DEBUG: Log the actual write attempt
    console.log('🔍 DEBUG: Attempting to write collaboration:', {
      collaborationId,
      collection: 'settlement_collaborations_v2',
      data: {
        ...collaborationData,
        invitedAt: 'serverTimestamp()'
      },
      currentUser: auth.currentUser?.uid,
      documentPath: `settlement_collaborations_v2/${collaborationId}`,
      expectedFormat: `${collaborationData.userId}_${collaborationData.settlementId}`
    });
    
    try {
      await setDoc(collabRef, {
        ...collaborationData,
        invitedAt: new Date() // Testing without serverTimestamp
      });
      
      console.log('✅ DEBUG: Successfully created collaboration:', collaborationId);
      return collaborationId;
    } catch (error) {
      console.error('❌ DEBUG: Failed to create collaboration:', {
        error,
        collaborationId,
        userId: collaborationData.userId,
        settlementId: collaborationData.settlementId,
        currentUser: auth.currentUser?.uid
      });
      throw error;
    }
  }

  async getSettlementCollaborators(settlementId: string): Promise<SettlementCollaboration[]> {
    console.log('DEBUG: getSettlementCollaborators called with settlementId:', settlementId);
    
    const q = query(
      collection(db, 'settlement_collaborations_v2'),
      where('settlementId', '==', settlementId),
      where('status', '==', 'active')
    );
    
    const querySnapshot = await getDocs(q);
    const collaborations = querySnapshot.docs.map(doc => {
      const data = { id: doc.id, ...doc.data() } as SettlementCollaboration;
      console.log('DEBUG: Raw collaboration data:', { docId: doc.id, data });
      return data;
    });
    
    console.log('DEBUG: Total collaborations found:', collaborations.length);
    return collaborations;
  }

  async getSettlementCollaboration(userId: string, settlementId: string): Promise<SettlementCollaboration | null> {
    const collaborationId = `${userId}_${settlementId}`;
    const collabRef = doc(db, 'settlement_collaborations_v2', collaborationId);
    const collabSnap = await getDoc(collabRef);
    
    if (collabSnap.exists()) {
      return { id: collabSnap.id, ...collabSnap.data() } as SettlementCollaboration;
    }
    return null;
  }

  async isUserSettlementMember(userId: string, settlementId: string): Promise<boolean> {
    // Check if user is settlement owner
    const settlement = await this.getSettlement(settlementId);
    if (settlement && settlement.ownerId === userId) {
      return true;
    }
    
    // Check if user has active collaboration
    const collaboration = await this.getSettlementCollaboration(userId, settlementId);
    return collaboration !== null && collaboration.status === 'active';
  }

  async updateSettlementCollaboration(collaborationId: string, updates: Partial<SettlementCollaboration>): Promise<void> {
    const collabRef = doc(db, 'settlement_collaborations_v2', collaborationId);
    await updateDoc(collabRef, {
      ...updates,
      lastActiveAt: serverTimestamp()
    });
  }

  async removeSettlementCollaborator(userId: string, settlementId: string): Promise<void> {
    console.log('DEBUG removeSettlementCollaborator called with:', { userId, settlementId });
    
    if (!userId || userId === 'undefined') {
      throw new Error(`Invalid userId: ${userId}`);
    }
    
    if (!settlementId || settlementId === 'undefined') {
      throw new Error(`Invalid settlementId: ${settlementId}`);
    }
    
    const collaborationId = `${userId}_${settlementId}`;
    console.log('DEBUG: Generated collaboration ID:', collaborationId);
    
    const collabRef = doc(db, 'settlement_collaborations_v2', collaborationId);
    
    try {
      await updateDoc(collabRef, {
        status: 'removed',
        removedAt: serverTimestamp()
      });
      console.log('DEBUG: Successfully updated collaboration to removed status');
    } catch (error) {
      console.error('DEBUG: Error updating collaboration:', error);
      throw error;
    }
  }

  async acceptSettlementInvitation(userId: string, settlementId: string): Promise<void> {
    const collaborationId = `${userId}_${settlementId}`;
    const collabRef = doc(db, 'settlement_collaborations_v2', collaborationId);
    await updateDoc(collabRef, {
      status: 'active',
      acceptedAt: serverTimestamp(),
      lastActiveAt: serverTimestamp()
    });
  }

  async createSettlementInviteLink(linkData: Omit<SettlementInviteLink, 'id' | 'createdAt' | 'inviteCode' | 'currentUses'>): Promise<string> {
    const inviteCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const linkRef = collection(db, 'settlement_invite_links_v2');
    
    // Set default maxUses to 1 for single-use functionality
    const finalLinkData = {
      ...linkData,
      maxUses: linkData.maxUses || 1, // Default to single use
      inviteCode,
      currentUses: 0,
      createdAt: serverTimestamp()
    };
    
    const inviteRef = await addDoc(linkRef, finalLinkData);
    
    return inviteCode; // Return the actual invite code, not the document ID
  }

  async getSettlementInviteLink(inviteCode: string): Promise<SettlementInviteLink | null> {
    const q = query(
      collection(db, 'settlement_invite_links_v2'),
      where('inviteCode', '==', inviteCode),
      where('isActive', '==', true),
      limit(1)
    );
    
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const linkData = { id: doc.id, ...doc.data() } as SettlementInviteLink;
      
      // Check if invite has expired
      if (linkData.expiresAt) {
        const now = new Date();
        const expiresAt = this.safeToDate(linkData.expiresAt);
        if (now > expiresAt) {
          return null; // Expired
        }
      }
      
      // Check if invite has reached max uses
      const maxUses = linkData.maxUses || 1; // Default to single use
      const currentUses = linkData.currentUses || 0;
      if (currentUses >= maxUses) {
        return null; // Fully used
      }
      
      return linkData;
    }
    return null;
  }

  async useSettlementInviteLink(linkId: string): Promise<void> {
    const linkRef = doc(db, 'settlement_invite_links_v2', linkId);
    const linkDoc = await getDoc(linkRef);
    
    if (!linkDoc.exists()) {
      throw new Error('Invite link not found');
    }
    
    const linkData = linkDoc.data() as SettlementInviteLink;
    const newUseCount = (linkData.currentUses || 0) + 1;
    const maxUses = linkData.maxUses || 1; // Default to single use
    
    const updateData: any = {
      currentUses: newUseCount,
      lastUsedAt: serverTimestamp()
    };
    
    // If we've reached max uses, deactivate the invite link
    if (newUseCount >= maxUses) {
      updateData.isActive = false;
    }
    
    await updateDoc(linkRef, updateData);
  }

  async getSettlementMembers(settlementId: string): Promise<SettlementMember[]> {
    // Get settlement owner
    const settlement = await this.getSettlement(settlementId);
    if (!settlement) return [];

    const ownerV2 = await this.getUser(settlement.ownerId);
    const members: SettlementMember[] = [];

    if (ownerV2) {
      const owner = this.convertUserV2ToUser(ownerV2);
      
      members.push({
        user: owner,
        collaboration: {
          id: `owner_${settlement.ownerId}`,
          settlementId,
          userId: settlement.ownerId,
          invitedBy: settlement.ownerId,
          role: 'co_owner',
          status: 'active',
          permissions: this.getFullPermissions(),
          invitedAt: this.safeToDate(settlement.createdAt),
          acceptedAt: this.safeToDate(settlement.createdAt),
          metadata: {
            activityLog: [],
            version: 1
          }
        },
        isOwner: true
      });
    }

    // Get collaborators
    const collaborators = await this.getSettlementCollaborators(settlementId);
    for (const collab of collaborators) {
      console.log('Processing collaborator:', { userId: collab.userId, collaborationId: collab.id });
      const userV2 = await this.getUser(collab.userId);
      if (userV2) {
        const user = this.convertUserV2ToUser(userV2);
        // Convert timestamps to dates in collaboration
        const convertedCollab: SettlementCollaboration = {
          ...collab,
          invitedAt: this.safeToDate(collab.invitedAt),
          acceptedAt: collab.acceptedAt ? this.safeToDate(collab.acceptedAt) : undefined,
          lastActiveAt: collab.lastActiveAt ? this.safeToDate(collab.lastActiveAt) : undefined,
          removedAt: collab.removedAt ? this.safeToDate(collab.removedAt) : undefined
        };
        
        console.log('Added member:', { userId: user.id, collaborationUserId: collab.userId });
        
        members.push({
          user,
          collaboration: convertedCollab,
          isOwner: false
        });
      } else {
        console.warn('Could not find user for collaboration:', collab.userId);
      }
    }

    return members;
  }

  private convertUserV2ToUser(userV2: UserV2): User {
    // This is a temporary compatibility layer.
    // Eventually, the app should use UserV2 directly.
    const safePreferences = userV2.preferences || {};

    return {
      id: userV2.id,
      email: userV2.email || '',
      displayName: userV2.displayName || '',
      photoURL: userV2.photoURL,
      username: userV2.username, // Include the username field
      professions: userV2.professions || [], // Include professions
      skills: userV2.skills || [], // Include skills
      emailVerified: true, // Default value
      providerId: 'firebase', // Default value
      createdAt: this.safeToDate(userV2.createdAt),
      lastSignIn: this.safeToDate(userV2.lastSignIn),
      defaultSettlementId: userV2.defaultSettlementId,
      preferences: {
        theme: safePreferences.theme || 'auto',
        language: 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        notifications: {
          email: safePreferences.notifications || false,
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
        totalProjects: 0,
        totalCollaborations: 0,
        lastActiveAt: this.safeToDate(userV2.lastSignIn),
        version: 1
      }
    };
  }

  private getFullPermissions(): SettlementCollaborationPermissions {
    return {
      canViewProjects: true,
      canCreateProjects: true,
      canEditProjects: true,
      canDeleteProjects: true,
      canViewTasks: true,
      canCreateTasks: true,
      canEditTasks: true,
      canDeleteTasks: true,
      canAssignTasks: true,
      canViewInventory: true,
      canEditInventory: true,
      canManageReservations: true,
      canInviteUsers: true,
      canRemoveUsers: true,
      canChangeRoles: true,
      canEditSettings: true,
      canDeleteSettlement: true,
      canExportData: true
    };
  }

  getDefaultPermissions(role: SettlementCollaboratorRole): SettlementCollaborationPermissions {
    const base = {
      canViewProjects: false,
      canCreateProjects: false,
      canEditProjects: false,
      canDeleteProjects: false,
      canViewTasks: false,
      canCreateTasks: false,
      canEditTasks: false,
      canDeleteTasks: false,
      canAssignTasks: false,
      canViewInventory: false,
      canEditInventory: false,
      canManageReservations: false,
      canInviteUsers: false,
      canRemoveUsers: false,
      canChangeRoles: false,
      canEditSettings: false,
      canDeleteSettlement: false,
      canExportData: false
    };

    switch (role) {
      case 'viewer':
        return {
          ...base,
          canViewProjects: true,
          canViewTasks: true,
          canViewInventory: true
        };
      case 'contributor':
        return {
          ...base,
          canViewProjects: true,
          canCreateProjects: true,
          canEditProjects: true,
          canViewTasks: true,
          canCreateTasks: true,
          canEditTasks: true,
          canAssignTasks: true,
          canViewInventory: true,
          canEditInventory: true
        };
      case 'admin':
        return {
          ...base,
          canViewProjects: true,
          canCreateProjects: true,
          canEditProjects: true,
          canDeleteProjects: true,
          canViewTasks: true,
          canCreateTasks: true,
          canEditTasks: true,
          canDeleteTasks: true,
          canAssignTasks: true,
          canViewInventory: true,
          canEditInventory: true,
          canManageReservations: true,
          canInviteUsers: true,
          canRemoveUsers: true,
          canChangeRoles: true,
          canExportData: true
        };
      case 'co_owner':
        return this.getFullPermissions();
      default:
        return base;
    }
  }

  // Real-time subscriptions
  subscribeToSettlement(settlementId: string, callback: (settlement: SettlementV2 | null) => void) {
    const settlementRef = doc(db, 'settlements', settlementId);
    return onSnapshot(settlementRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() } as SettlementV2);
      } else {
        callback(null);
      }
    });
  }

  subscribeToProjects(settlementId: string, callback: (projects: ProjectV2[]) => void) {
    const q = query(
      collection(db, 'projects'),
      where('settlementId', '==', settlementId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const projects = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProjectV2));
      callback(projects);
    });
  }

  subscribeToTasks(projectId: string, callback: (tasks: TaskV2[]) => void) {
    const q = query(
      collection(db, 'tasks'),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    );
    
    return onSnapshot(q, (querySnapshot) => {
      const tasks = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskV2));
      callback(tasks);
    });
  }

  // Build list management
  async createBuildList(buildListData: Omit<BuildListV2, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const buildListRef = collection(db, 'build_lists');
    const buildRef = await addDoc(buildListRef, {
      ...buildListData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return buildRef.id;
  }

  async getBuildListsByUser(userId: string): Promise<BuildListV2[]> {
    const q = query(
      collection(db, 'build_lists'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BuildListV2));
  }

  // Utility method to clean up expired or used invite links
  async cleanupExpiredInviteLinks(settlementId: string): Promise<void> {
    const q = query(
      collection(db, 'settlement_invite_links_v2'),
      where('settlementId', '==', settlementId)
    );
    
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    const now = new Date();
    
    querySnapshot.docs.forEach(doc => {
      const linkData = doc.data() as SettlementInviteLink;
      
      // Check if link should be deactivated
      const shouldDeactivate = 
        // Already inactive
        !linkData.isActive ||
        // Expired
        (linkData.expiresAt && now > this.safeToDate(linkData.expiresAt)) ||
        // Reached max uses
        ((linkData.currentUses || 0) >= (linkData.maxUses || 1));
      
      if (shouldDeactivate && linkData.isActive) {
        batch.update(doc.ref, { isActive: false });
      }
    });
    
    await batch.commit();
  }

  // Utility method to deactivate all invite links for a settlement
  async deactivateAllInviteLinks(settlementId: string): Promise<void> {
    const q = query(
      collection(db, 'settlement_invite_links_v2'),
      where('settlementId', '==', settlementId),
      where('isActive', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    
    querySnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { isActive: false });
    });
    
    await batch.commit();
  }

  // Utility method to clean up duplicate collaborations for a settlement
  async cleanupDuplicateCollaborations(settlementId: string): Promise<void> {
    const collaborators = await this.getSettlementCollaborators(settlementId);
    const userIdMap = new Map<string, SettlementCollaboration[]>();
    
    // Group collaborations by userId
    collaborators.forEach(collab => {
      const existing = userIdMap.get(collab.userId) || [];
      existing.push(collab);
      userIdMap.set(collab.userId, existing);
    });
    
    const batch = writeBatch(db);
    let hasOperations = false;
    
    // For each user with multiple collaborations, keep only the most recent active one
    userIdMap.forEach((collabs, userId) => {
      if (collabs.length > 1) {
        // Sort by invite date, most recent first
        collabs.sort((a, b) => {
          const dateA = this.safeToDate(a.invitedAt);
          const dateB = this.safeToDate(b.invitedAt);
          return dateB.getTime() - dateA.getTime();
        });
        
        // Keep the first (most recent) collaboration, remove the rest
        for (let i = 1; i < collabs.length; i++) {
          const collabRef = doc(db, 'settlement_collaborations_v2', collabs[i].id);
          batch.delete(collabRef);
          hasOperations = true;
        }
      }
    });
    
    if (hasOperations) {
      await batch.commit();
    }
  }
} 