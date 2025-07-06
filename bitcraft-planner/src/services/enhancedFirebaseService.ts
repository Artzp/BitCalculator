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
  updateDoc
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Inventory, BuildListItem } from '../state/useItemsStore';

export interface UserData {
  inventory: Inventory;
  buildList: BuildListItem[];
  lastUpdated: any;
  version: number;
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
  defaultRecipeIndex: number;
  favoriteItems: string[];
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
    
    try {
      await setDoc(userDocRef, dataToSave, { merge: true });
      console.log('✅ User data saved successfully');
    } catch (error) {
      console.error('❌ Error saving user data:', error);
      throw error;
    }
  }

  async loadUserData(userId: string): Promise<UserData | null> {
    const userDocRef = this.getUserDocRef(userId);
    
    try {
      const docSnap = await getDoc(userDocRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as UserData;
        return {
          inventory: data.inventory || {},
          buildList: data.buildList || [],
          lastUpdated: data.lastUpdated,
          version: data.version || 1
        };
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error loading user data:', error);
      throw error;
    }
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
            lastUpdated: data.lastUpdated,
            version: data.version || 1
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
}

export const enhancedFirebaseService = new EnhancedFirebaseService(); 