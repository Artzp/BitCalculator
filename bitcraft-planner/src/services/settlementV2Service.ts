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
import { db } from '../firebase/config';
import { SettlementCollaboration, SettlementCollaboratorRole, SettlementCollaborationPermissions, SettlementInviteLink, SettlementMember, User } from '../types/NormalizedDatabase';

// New database structure interfaces
export interface UserV2 {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  createdAt: Timestamp;
  lastSignIn: Timestamp;
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
  assignedTo?: string;
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
      return userSnap.data() as UserV2;
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
    const tasksRef = collection(db, 'tasks');
    const taskRef = await addDoc(tasksRef, {
      ...taskData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    return taskRef.id;
  }

  async getTask(taskId: string): Promise<TaskV2 | null> {
    const taskRef = doc(db, 'tasks', taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (taskSnap.exists()) {
      return { id: taskSnap.id, ...taskSnap.data() } as TaskV2;
    }
    return null;
  }

  async updateTask(taskId: string, updates: Partial<TaskV2>): Promise<void> {
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  }

  async deleteTask(taskId: string): Promise<void> {
    const taskRef = doc(db, 'tasks', taskId);
    await deleteDoc(taskRef);
  }

  async getTasksByProject(projectId: string): Promise<TaskV2[]> {
    const q = query(
      collection(db, 'tasks'),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskV2));
  }

  async getTasksByAssignee(assigneeId: string): Promise<TaskV2[]> {
    const q = query(
      collection(db, 'tasks'),
      where('assignedTo', '==', assigneeId),
      orderBy('createdAt', 'desc')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskV2));
  }

  // Collaboration management
  async createCollaboration(collaborationData: Omit<ProjectCollaboratorV2, 'id' | 'invitedAt'>): Promise<string> {
    const collaborationRef = collection(db, 'project_collaborators');
    const collabRef = await addDoc(collaborationRef, {
      ...collaborationData,
      invitedAt: serverTimestamp()
    });
    
    return collabRef.id;
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
    
    await setDoc(collabRef, {
      ...collaborationData,
      invitedAt: serverTimestamp()
    });
    
    return collaborationId;
  }

  async getSettlementCollaborators(settlementId: string): Promise<SettlementCollaboration[]> {
    const q = query(
      collection(db, 'settlement_collaborations_v2'),
      where('settlementId', '==', settlementId),
      where('status', '==', 'active')
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SettlementCollaboration));
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
    const collaborationId = `${userId}_${settlementId}`;
    const collabRef = doc(db, 'settlement_collaborations_v2', collaborationId);
    await updateDoc(collabRef, {
      status: 'removed',
      removedAt: serverTimestamp()
    });
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
        
        members.push({
          user,
          collaboration: convertedCollab,
          isOwner: false
        });
      }
    }

    return members;
  }

  private convertUserV2ToUser(userV2: UserV2): User {
    // Safe access to preferences object
    const safePreferences = userV2.preferences || {};
    
    return {
      id: userV2.id,
      email: userV2.email,
      displayName: userV2.displayName,
      photoURL: userV2.photoURL,
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