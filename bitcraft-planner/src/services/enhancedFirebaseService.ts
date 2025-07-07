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
  arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Inventory, BuildListItem } from '../state/useItemsStore';
import { SettlementData, Project, ProjectItem } from '../types/Settlement';
import { projectLogger } from '../utils/projectLogger';

export interface UserData {
  inventory: Inventory;
  buildList: BuildListItem[];
  settlement: SettlementData | null;
  lastUpdated: any;
  version: number;
  
  // User profile information (optional for backwards compatibility)
  userProfile?: {
    email: string;
    displayName?: string;
    photoURL?: string;
    emailVerified?: boolean;
    providerId?: string;
    createdAt?: any; // Firestore timestamp
    lastSignIn?: any; // Firestore timestamp
  };
}

export interface SharedBuild {
  id?: string;
  name: string;
  description: string;
  buildList: BuildListItem[];
  authorId: string;
  authorName: string;
  createdAt: any;
  updatedAt?: any;
  isPublic: boolean;
  tags: string[];
  likes: number;
  views: number;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  autoSave: boolean;
  notifications: boolean;
  favoriteItems: string[];
  defaultRecipeIndex: number;
}

export interface SharedProject {
  id?: string;
  name: string;
  description: string;
  items: ProjectItem[];
  authorId: string;
  authorName: string;
  authorEmail: string;
  createdAt: any;
  updatedAt?: any;
  isPublic: boolean;
  tags: string[];
  likes: number;
  views: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string; // e.g., "2 hours", "1 day"
  requiredPlayers: number;
  totalMaterials: { itemId: string; itemName: string; quantity: number }[];
}

export interface ProjectCollaboration {
  id?: string;
  projectId: string;
  projectName: string;
  ownerId: string;
  ownerName: string;
  collaborators: string[]; // User IDs
  collaboratorNames: string[]; // Display names
  permissions: {
    [userId: string]: 'read' | 'write' | 'admin';
  };
  inviteCode?: string;
  createdAt: any;
  updatedAt?: any;
  isActive: boolean;
}

export interface GameData {
  itemPrices: { [itemId: string]: number };
  serverStats: {
    totalUsers: number;
    totalBuilds: number;
    lastUpdated: any;
  };
}

export class EnhancedFirebaseService {
  // User Data Methods
  private getUserDocRef(userId: string) {
    return doc(db, 'users', userId);
  }

  async saveUserData(userId: string, data: Partial<UserData>): Promise<void> {
    const userDocRef = this.getUserDocRef(userId);
    const dataToSave = {
      ...data,
      lastUpdated: serverTimestamp(),
      version: (data.version || 0) + 1
    };
    
    projectLogger.logDataSave(
      'EnhancedFirebaseService.saveUserData',
      'SAVE_USER_DATA_TO_FIRESTORE',
      dataToSave
    );
    
    try {
      await setDoc(userDocRef, dataToSave, { merge: true });
      console.log('✅ User data saved successfully');
      
      projectLogger.logDataSave(
        'EnhancedFirebaseService.saveUserData',
        'SAVE_USER_DATA_SUCCESS',
        dataToSave
      );
    } catch (error) {
      console.error('❌ Error saving user data:', error);
      
      projectLogger.logError(
        'EnhancedFirebaseService.saveUserData',
        'SAVE_USER_DATA_ERROR',
        { error: error instanceof Error ? error.message : String(error), userId, dataKeys: data ? Object.keys(data) : [] }
      );
      
      throw error;
    }
  }

  async loadUserData(userId: string): Promise<UserData | null> {
    const userDocRef = this.getUserDocRef(userId);
    
    projectLogger.logDataLoad(
      'EnhancedFirebaseService.loadUserData',
      'LOAD_USER_DATA_FROM_FIRESTORE',
      { userId }
    );
    
    try {
      const docSnap = await getDoc(userDocRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as UserData;
        const userData = {
          inventory: data.inventory || {},
          buildList: data.buildList || [],
          settlement: data.settlement || null,
          lastUpdated: data.lastUpdated,
          version: data.version || 1,
          userProfile: data.userProfile || undefined
        };
        
        projectLogger.logDataLoad(
          'EnhancedFirebaseService.loadUserData',
          'LOAD_USER_DATA_SUCCESS',
          userData
        );
        
        return userData;
      }
      
      projectLogger.logDataLoad(
        'EnhancedFirebaseService.loadUserData',
        'LOAD_USER_DATA_NO_DOCUMENT',
        { userId }
      );
      
      return null;
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      
      projectLogger.logError(
        'EnhancedFirebaseService.loadUserData',
        'LOAD_USER_DATA_ERROR',
        { error: error instanceof Error ? error.message : String(error), userId }
      );
      
      throw error;
    }
  }

  // Save user profile information
  async saveUserProfile(userId: string, profileData: UserData['userProfile']): Promise<void> {
    console.log('👤 Saving user profile...');
    return this.saveUserData(userId, { userProfile: profileData });
  }

  // Shared Builds Methods
  async createSharedBuild(build: Omit<SharedBuild, 'id' | 'createdAt' | 'likes' | 'views'>): Promise<string> {
    try {
      const buildData = {
        ...build,
        createdAt: serverTimestamp(),
        likes: 0,
        views: 0
      };
      
      const docRef = await addDoc(collection(db, 'sharedBuilds'), buildData);
      console.log('✅ Shared build created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating shared build:', error);
      throw error;
    }
  }

  async getSharedBuilds(filters?: {
    authorId?: string;
    isPublic?: boolean;
    tags?: string[];
    limitCount?: number;
  }): Promise<SharedBuild[]> {
    try {
      let q = query(collection(db, 'sharedBuilds'));
      
      if (filters?.authorId) {
        q = query(q, where('authorId', '==', filters.authorId));
      }
      
      if (filters?.isPublic !== undefined) {
        q = query(q, where('isPublic', '==', filters.isPublic));
      }
      
      if (filters?.tags && filters.tags.length > 0) {
        q = query(q, where('tags', 'array-contains-any', filters.tags));
      }
      
      q = query(q, orderBy('createdAt', 'desc'));
      
      if (filters?.limitCount) {
        q = query(q, limit(filters.limitCount));
      }
      
      const querySnapshot = await getDocs(q);
      const builds: SharedBuild[] = [];
      
      querySnapshot.forEach((doc) => {
        builds.push({
          id: doc.id,
          ...doc.data()
        } as SharedBuild);
      });
      
      return builds;
    } catch (error) {
      console.error('❌ Error getting shared builds:', error);
      throw error;
    }
  }

  async getSharedBuild(buildId: string): Promise<SharedBuild | null> {
    try {
      const docRef = doc(db, 'sharedBuilds', buildId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // Increment view count
        await updateDoc(docRef, {
          views: (docSnap.data().views || 0) + 1
        });
        
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as SharedBuild;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting shared build:', error);
      throw error;
    }
  }

  async updateSharedBuild(buildId: string, updates: Partial<SharedBuild>): Promise<void> {
    try {
      const docRef = doc(db, 'sharedBuilds', buildId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Shared build updated');
    } catch (error) {
      console.error('❌ Error updating shared build:', error);
      throw error;
    }
  }

  async deleteSharedBuild(buildId: string): Promise<void> {
    try {
      const docRef = doc(db, 'sharedBuilds', buildId);
      await deleteDoc(docRef);
      console.log('✅ Shared build deleted');
    } catch (error) {
      console.error('❌ Error deleting shared build:', error);
      throw error;
    }
  }

  async likeSharedBuild(buildId: string): Promise<void> {
    try {
      const docRef = doc(db, 'sharedBuilds', buildId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        await updateDoc(docRef, {
          likes: (docSnap.data().likes || 0) + 1
        });
      }
    } catch (error) {
      console.error('❌ Error liking shared build:', error);
      throw error;
    }
  }

  // User Settings Methods
  async saveUserSettings(userId: string, settings: Partial<UserSettings>): Promise<void> {
    try {
      const docRef = doc(db, 'userSettings', userId);
      await setDoc(docRef, settings, { merge: true });
      console.log('✅ User settings saved');
    } catch (error) {
      console.error('❌ Error saving user settings:', error);
      throw error;
    }
  }

  async getUserSettings(userId: string): Promise<UserSettings | null> {
    try {
      const docRef = doc(db, 'userSettings', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as UserSettings;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting user settings:', error);
      throw error;
    }
  }

  // Game Data Methods
  async getGameData(dataType: string): Promise<any> {
    try {
      const docRef = doc(db, 'gameData', dataType);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting game data:', error);
      throw error;
    }
  }

  // Statistics Methods
  async getStatistics(): Promise<any> {
    try {
      const docRef = doc(db, 'statistics', 'global');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data();
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting statistics:', error);
      throw error;
    }
  }

  // Real-time listeners
  subscribeToUserData(userId: string, callback: (data: UserData | null) => void) {
    const userDocRef = this.getUserDocRef(userId);
    
    return onSnapshot(userDocRef, 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data() as UserData;
          callback({
            inventory: data.inventory || {},
            buildList: data.buildList || [],
            settlement: data.settlement || null,
            lastUpdated: data.lastUpdated,
            version: data.version || 1,
            userProfile: data.userProfile || undefined
          });
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('❌ Error in user data subscription:', error);
      }
    );
  }

  subscribeToSharedBuilds(callback: (builds: SharedBuild[]) => void, filters?: {
    authorId?: string;
    isPublic?: boolean;
    limitCount?: number;
  }) {
    let q = query(collection(db, 'sharedBuilds'));
    
    if (filters?.authorId) {
      q = query(q, where('authorId', '==', filters.authorId));
    }
    
    if (filters?.isPublic !== undefined) {
      q = query(q, where('isPublic', '==', filters.isPublic));
    }
    
    q = query(q, orderBy('createdAt', 'desc'));
    
    if (filters?.limitCount) {
      q = query(q, limit(filters.limitCount));
    }
    
    return onSnapshot(q,
      (snapshot) => {
        const builds: SharedBuild[] = [];
        snapshot.forEach((doc) => {
          builds.push({
            id: doc.id,
            ...doc.data()
          } as SharedBuild);
        });
        callback(builds);
      },
      (error) => {
        console.error('❌ Error in shared builds subscription:', error);
      }
    );
  }

  // Shared Project Methods
  async createSharedProject(project: Omit<SharedProject, 'id' | 'createdAt' | 'likes' | 'views'>): Promise<string> {
    try {
      const projectData = {
        ...project,
        createdAt: serverTimestamp(),
        likes: 0,
        views: 0
      };
      
      const docRef = await addDoc(collection(db, 'sharedProjects'), projectData);
      console.log('✅ Shared project created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating shared project:', error);
      throw error;
    }
  }

  async getSharedProjects(filters?: {
    authorId?: string;
    isPublic?: boolean;
    tags?: string[];
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
    limitCount?: number;
  }): Promise<SharedProject[]> {
    try {
      let q = query(collection(db, 'sharedProjects'));
      
      if (filters?.authorId) {
        q = query(q, where('authorId', '==', filters.authorId));
      }
      
      if (filters?.isPublic !== undefined) {
        q = query(q, where('isPublic', '==', filters.isPublic));
      }
      
      if (filters?.difficulty) {
        q = query(q, where('difficulty', '==', filters.difficulty));
      }
      
      if (filters?.tags && filters.tags.length > 0) {
        q = query(q, where('tags', 'array-contains-any', filters.tags));
      }
      
      q = query(q, orderBy('createdAt', 'desc'));
      
      if (filters?.limitCount) {
        q = query(q, limit(filters.limitCount));
      }
      
      const querySnapshot = await getDocs(q);
      const projects: SharedProject[] = [];
      
      querySnapshot.forEach((doc) => {
        projects.push({
          id: doc.id,
          ...doc.data()
        } as SharedProject);
      });
      
      return projects;
    } catch (error) {
      console.error('❌ Error getting shared projects:', error);
      throw error;
    }
  }

  async getSharedProject(projectId: string): Promise<SharedProject | null> {
    try {
      const docRef = doc(db, 'sharedProjects', projectId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        // Increment view count
        await updateDoc(docRef, {
          views: (docSnap.data().views || 0) + 1
        });
        
        return {
          id: docSnap.id,
          ...docSnap.data()
        } as SharedProject;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error getting shared project:', error);
      throw error;
    }
  }

  async updateSharedProject(projectId: string, updates: Partial<SharedProject>): Promise<void> {
    try {
      const docRef = doc(db, 'sharedProjects', projectId);
      await updateDoc(docRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Shared project updated');
    } catch (error) {
      console.error('❌ Error updating shared project:', error);
      throw error;
    }
  }

  async deleteSharedProject(projectId: string): Promise<void> {
    try {
      const docRef = doc(db, 'sharedProjects', projectId);
      await deleteDoc(docRef);
      console.log('✅ Shared project deleted');
    } catch (error) {
      console.error('❌ Error deleting shared project:', error);
      throw error;
    }
  }

  async likeSharedProject(projectId: string): Promise<void> {
    try {
      const docRef = doc(db, 'sharedProjects', projectId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        await updateDoc(docRef, {
          likes: (docSnap.data().likes || 0) + 1
        });
      }
    } catch (error) {
      console.error('❌ Error liking shared project:', error);
      throw error;
    }
  }

  // Project Collaboration Methods
  async createProjectCollaboration(collaboration: Omit<ProjectCollaboration, 'id' | 'createdAt' | 'inviteCode'>): Promise<string> {
    try {
      const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();
      
      const collaborationData = {
        ...collaboration,
        inviteCode,
        createdAt: serverTimestamp(),
        isActive: true
      };
      
      const docRef = await addDoc(collection(db, 'projectCollaborations'), collaborationData);
      console.log('✅ Project collaboration created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('❌ Error creating project collaboration:', error);
      throw error;
    }
  }

  async joinProjectCollaboration(inviteCode: string, userId: string, userName: string): Promise<string | null> {
    try {
      const q = query(
        collection(db, 'projectCollaborations'),
        where('inviteCode', '==', inviteCode),
        where('isActive', '==', true)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const collaborationData = doc.data() as ProjectCollaboration;
        
        // Check if user is already a collaborator
        if (collaborationData.collaborators.includes(userId)) {
          return doc.id; // Already a collaborator
        }
        
        // Add user to collaboration
        await updateDoc(doc.ref, {
          collaborators: arrayUnion(userId),
          collaboratorNames: arrayUnion(userName),
          [`permissions.${userId}`]: 'write',
          updatedAt: serverTimestamp()
        });
        
        console.log('✅ User joined project collaboration');
        return doc.id;
      }
      
      return null; // Invalid invite code
    } catch (error) {
      console.error('❌ Error joining project collaboration:', error);
      throw error;
    }
  }

  async getProjectCollaborations(userId: string): Promise<ProjectCollaboration[]> {
    try {
      // Get collaborations where user is a collaborator
      const collaboratorQuery = query(
        collection(db, 'projectCollaborations'),
        where('collaborators', 'array-contains', userId),
        where('isActive', '==', true)
      );
      
      // Get collaborations where user is the owner
      const ownerQuery = query(
        collection(db, 'projectCollaborations'),
        where('ownerId', '==', userId),
        where('isActive', '==', true)
      );
      
      const [collaboratorSnapshot, ownerSnapshot] = await Promise.all([
        getDocs(collaboratorQuery),
        getDocs(ownerQuery)
      ]);
      
      const collaborations: ProjectCollaboration[] = [];
      const seenIds = new Set<string>();
      
      // Add collaborations where user is a collaborator
      collaboratorSnapshot.forEach((doc) => {
        if (!seenIds.has(doc.id)) {
          collaborations.push({
            id: doc.id,
            ...doc.data()
          } as ProjectCollaboration);
          seenIds.add(doc.id);
        }
      });
      
      // Add collaborations where user is the owner (avoid duplicates)
      ownerSnapshot.forEach((doc) => {
        if (!seenIds.has(doc.id)) {
          collaborations.push({
            id: doc.id,
            ...doc.data()
          } as ProjectCollaboration);
          seenIds.add(doc.id);
        }
      });
      
      console.log('🔍 Found collaborations:', {
        asCollaborator: collaboratorSnapshot.size,
        asOwner: ownerSnapshot.size,
        total: collaborations.length
      });
      
      return collaborations;
    } catch (error) {
      console.error('❌ Error getting project collaborations:', error);
      throw error;
    }
  }

  async updateCollaboratorPermissions(collaborationId: string, userId: string, permission: 'read' | 'write' | 'admin'): Promise<void> {
    try {
      const docRef = doc(db, 'projectCollaborations', collaborationId);
      await updateDoc(docRef, {
        [`permissions.${userId}`]: permission,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Collaborator permissions updated');
    } catch (error) {
      console.error('❌ Error updating collaborator permissions:', error);
      throw error;
    }
  }

  async removeCollaborator(collaborationId: string, userId: string, userName: string): Promise<void> {
    try {
      const docRef = doc(db, 'projectCollaborations', collaborationId);
      await updateDoc(docRef, {
        collaborators: arrayRemove(userId),
        collaboratorNames: arrayRemove(userName),
        [`permissions.${userId}`]: null,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Collaborator removed');
    } catch (error) {
      console.error('❌ Error removing collaborator:', error);
      throw error;
    }
  }

  async deactivateProjectCollaboration(collaborationId: string): Promise<void> {
    try {
      const docRef = doc(db, 'projectCollaborations', collaborationId);
      await updateDoc(docRef, {
        isActive: false,
        updatedAt: serverTimestamp()
      });
      console.log('✅ Project collaboration deactivated');
    } catch (error) {
      console.error('❌ Error deactivating project collaboration:', error);
      throw error;
    }
  }

  // Load actual project data for collaborative projects
  async loadCollaborativeProjectData(collaboration: ProjectCollaboration): Promise<{ project: any; tasks: any[] } | null> {
    try {
      console.log('🔍 Loading collaborative project data:', {
        collaborationId: collaboration.id,
        projectId: collaboration.projectId,
        ownerId: collaboration.ownerId
      });

      // Load the owner's settlement data to get the actual project
      const ownerData = await this.loadUserData(collaboration.ownerId);
      
      if (!ownerData?.settlement) {
        console.log('❌ Owner settlement not found');
        return null;
      }

      // Find the actual project in the owner's settlement
      const actualProject = ownerData.settlement.projects.find(p => p.id === collaboration.projectId);
      
      if (!actualProject) {
        console.log('❌ Original project not found in owner settlement');
        return null;
      }

      // Find tasks associated with this project
      const projectTasks = ownerData.settlement.tasks.filter(t => t.projectId === collaboration.projectId);

      console.log('✅ Collaborative project data loaded:', {
        projectName: actualProject.name,
        itemCount: actualProject.items.length,
        taskCount: projectTasks.length
      });

      return {
        project: actualProject,
        tasks: projectTasks
      };
    } catch (error) {
      console.error('❌ Error loading collaborative project data:', error);
      return null;
    }
  }
}

export const enhancedFirebaseService = new EnhancedFirebaseService(); 