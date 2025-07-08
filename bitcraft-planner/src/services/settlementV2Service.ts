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
} 