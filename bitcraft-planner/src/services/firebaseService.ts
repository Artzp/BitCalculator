import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc,
  serverTimestamp,
  onSnapshot,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { Inventory, BuildListItem } from '../state/useItemsStore';
import { SettlementData } from '../types/Settlement';
import { projectLogger } from '../utils/projectLogger';

export interface UserData {
  inventory: Inventory;
  buildList: BuildListItem[];
  settlement: SettlementData | null;
  lastUpdated: any; // Firestore timestamp
  version: number; // For data versioning
  
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

export interface SaveStatus {
  isSaving: boolean;
  isLoading: boolean;
  lastSaved: Date | null;
  error: string | null;
}

// Create a timeout wrapper for Firebase operations
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
};

export class FirebaseService {
  private saveStatusCallbacks: ((status: SaveStatus) => void)[] = [];
  private currentSaveStatus: SaveStatus = {
    isSaving: false,
    isLoading: false,
    lastSaved: null,
    error: null
  };
  private isDatabaseEnabled: boolean | null = null; // Cache database status
  private pendingSaves: Map<string, Promise<void>> = new Map(); // Prevent concurrent saves per user

  // Subscribe to save status changes
  subscribeToSaveStatus(callback: (status: SaveStatus) => void) {
    this.saveStatusCallbacks.push(callback);
    // Immediately call with current status
    callback(this.currentSaveStatus);
    
    // Return unsubscribe function
    return () => {
      this.saveStatusCallbacks = this.saveStatusCallbacks.filter(cb => cb !== callback);
    };
  }

  private updateSaveStatus(update: Partial<SaveStatus>) {
    this.currentSaveStatus = { ...this.currentSaveStatus, ...update };
    this.saveStatusCallbacks.forEach(callback => callback(this.currentSaveStatus));
  }

  private getUserDocRef(userId: string) {
    return doc(db, 'users', userId);
  }

  // Helper method to get all nested keys from an object
  private getAllNestedKeys(obj: any, prefix = ''): string[] {
    const keys: string[] = [];
    
    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        keys.push(fullKey);
        
        if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
          keys.push(...this.getAllNestedKeys(obj[key], fullKey));
        }
      }
    }
    
    return keys;
  }

  private validateUserData(data: Partial<UserData>): boolean {
    // Basic validation
    if (data.inventory && typeof data.inventory !== 'object') {
      return false;
    }
    if (data.buildList && !Array.isArray(data.buildList)) {
      return false;
    }
    if (data.settlement && typeof data.settlement !== 'object') {
      return false;
    }
    return true;
  }

  // Clean data by removing undefined values (Firestore doesn't support undefined)
  private cleanDataForFirestore(data: any): any {
    if (data === null) return data;
    if (data === undefined) return null; // Convert undefined to null for Firestore
    
    if (data instanceof Date) {
      return data; // Firestore handles Date objects automatically
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.cleanDataForFirestore(item));
    }
    
    if (typeof data === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(data)) {
        // Skip undefined values entirely
        if (value === undefined) {
          continue;
        }
        
        // Debug: Log projects array specifically
        if (key === 'projects' && Array.isArray(value)) {
          console.log('🔍 Cleaning projects array:', {
            originalLength: value.length,
            originalProjects: value.map((p: any) => ({ name: p.name, id: p.id }))
          });
        }
        
        // Handle date fields in settlement data
        if ((key === 'dateCreated' || key === 'dateAdded' || key === 'dateCompleted' || key === 'lastUpdated') && value instanceof Date) {
          cleaned[key] = value; // Firestore will convert to Timestamp
        } else {
          const cleanedValue = this.cleanDataForFirestore(value);
          // Only add the key if the cleaned value is not undefined
          if (cleanedValue !== undefined) {
            cleaned[key] = cleanedValue;
            
            // Debug: Log cleaned projects array
            if (key === 'projects' && Array.isArray(cleanedValue)) {
              console.log('🔍 Cleaned projects array:', {
                cleanedLength: cleanedValue.length,
                cleanedProjects: cleanedValue.map((p: any) => ({ name: p.name, id: p.id }))
              });
            }
          }
        }
      }
      return cleaned;
    }
    
    return data;
  }

  // Convert Firestore timestamps back to Date objects
  private convertTimestampsToDate(data: any): any {
    if (data === null || data === undefined) return data;
    
    if (data instanceof Timestamp) {
      return data.toDate();
    }
    
    if (Array.isArray(data)) {
      return data.map(item => this.convertTimestampsToDate(item));
    }
    
    if (typeof data === 'object') {
      const converted: any = {};
      for (const [key, value] of Object.entries(data)) {
        // Handle date fields in settlement data
        if ((key === 'dateCreated' || key === 'dateAdded' || key === 'dateCompleted' || key === 'lastUpdated') && value instanceof Timestamp) {
          converted[key] = value.toDate();
        } else {
          converted[key] = this.convertTimestampsToDate(value);
        }
      }
      return converted;
    }
    
    return data;
  }

  // Check if database is available
  private async checkDatabaseAvailability(): Promise<boolean> {
    if (this.isDatabaseEnabled !== null) {
      return this.isDatabaseEnabled;
    }

    try {
      // Try a simple read operation with timeout
      const testDoc = doc(db, 'test', 'connectivity');
      await withTimeout(getDoc(testDoc), 5000);
      this.isDatabaseEnabled = true;
      console.log('✅ Database connectivity verified');
      return true;
    } catch (error) {
      this.isDatabaseEnabled = false;
      console.warn('⚠️ Database not available:', error);
      
      // Check if it's an authentication error vs database unavailable
      if (error instanceof Error && error.message.includes('Missing or insufficient permissions')) {
        console.log('📝 Database available but user not authenticated yet');
        return false;
      }
      
      return false;
    }
  }

  async saveUserData(userId: string, data: Partial<UserData>): Promise<void> {
    if (!this.validateUserData(data)) {
      throw new Error('Invalid user data format');
    }

    projectLogger.logDataSave(
      'FirebaseService.saveUserData',
      'SAVE_USER_DATA_START',
      data
    );

    // Prevent concurrent saves for the same user
    const existingSave = this.pendingSaves.get(userId);
    if (existingSave) {
      console.log('⏳ Save already in progress for user, waiting for completion...');
      projectLogger.logAutoSave(
        'FirebaseService.saveUserData',
        'CONCURRENT_SAVE_WAIT',
        'Save already in progress, waiting for completion'
      );
      await existingSave;
    }

    // Check database availability first
    const isAvailable = await this.checkDatabaseAvailability();
    if (!isAvailable) {
      console.log('📴 Database not available, skipping save');
      projectLogger.logError(
        'FirebaseService.saveUserData',
        'DATABASE_NOT_AVAILABLE',
        { userId }
      );
      this.updateSaveStatus({ 
        isSaving: false, 
        error: 'Database not available - data saved locally only' 
      });
      return;
    }

    this.updateSaveStatus({ isSaving: true, error: null });

    const userDocRef = this.getUserDocRef(userId);
    const cleanedData = this.cleanDataForFirestore(data);
    
    // Debug: Log what we're about to save
    if (cleanedData.settlement) {
      console.log('🔍 Cleaned settlement data:', {
        hasProjects: !!cleanedData.settlement.projects,
        projectCount: cleanedData.settlement.projects?.length || 0,
        projectNames: cleanedData.settlement.projects?.map((p: any) => p.name) || []
      });
    }
    
    const dataToSave = {
      ...cleanedData,
      lastUpdated: serverTimestamp(),
      version: (data.version || 0) + 1
    };
    
    projectLogger.logDataSave(
      'FirebaseService.saveUserData',
      'SAVE_USER_DATA_FIRESTORE',
      dataToSave
    );
    
    // Create save promise and track it
    const savePromise = (async () => {
      try {
        await withTimeout(setDoc(userDocRef, dataToSave, { merge: true }), 10000);
        this.updateSaveStatus({ 
          isSaving: false, 
          lastSaved: new Date(),
          error: null 
        });
        console.log('✅ User data saved successfully');
        
        projectLogger.logDataSave(
          'FirebaseService.saveUserData',
          'SAVE_USER_DATA_SUCCESS',
          dataToSave
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to save data';
        this.updateSaveStatus({ 
          isSaving: false, 
          error: errorMessage.includes('timeout') ? 'Save timeout - please check connection' : errorMessage
        });
        console.error('❌ Error saving user data:', error);
        
        projectLogger.logError(
          'FirebaseService.saveUserData',
          'SAVE_USER_DATA_ERROR',
          { error: error instanceof Error ? error.message : String(error), userId }
        );
        
        throw error;
      } finally {
        // Remove from pending saves
        this.pendingSaves.delete(userId);
      }
    })();
    
    // Track this save operation
    this.pendingSaves.set(userId, savePromise);
    
    // Wait for completion
    await savePromise;
  }

  async loadUserData(userId: string): Promise<UserData | null> {
    this.updateSaveStatus({ isLoading: true, error: null });

    // Check database availability first
    const isAvailable = await this.checkDatabaseAvailability();
    if (!isAvailable) {
      console.log('📴 Database not available, starting with empty data');
      this.updateSaveStatus({ 
        isLoading: false, 
        error: 'Database not available - please enable Firestore in Firebase Console' 
      });
      return null;
    }

    const userDocRef = this.getUserDocRef(userId);
    
    try {
      const docSnap = await withTimeout(getDoc(userDocRef), 10000);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as UserData;
        
        // Debug: Log what we're loading from Firebase with deep inspection
        console.log('🔍 Raw data from Firebase:', {
          hasSettlement: !!data.settlement,
          settlementProjects: data.settlement?.projects?.length || 0,
          settlementData: data.settlement,
          dataKeys: Object.keys(data),
          settlementKeys: data.settlement ? Object.keys(data.settlement) : 'No settlement'
        });
        
        // Debug: Check for nested settlement.projects field vs settlement object
        const dataAny = data as any;
        if (dataAny['settlement.projects']) {
          console.log('🔍 Found nested settlement.projects field:', dataAny['settlement.projects']);
        }
        
        // Debug: Check all data fields for project-related keys
        const allKeys = this.getAllNestedKeys(data);
        const projectRelatedKeys = allKeys.filter(key => key.includes('project'));
        if (projectRelatedKeys.length > 0) {
          console.log('🔍 Found project-related keys in data:', projectRelatedKeys);
        }
        
        // Debug: Log the actual projects array
        if (data.settlement?.projects) {
          console.log('🔍 Projects in Firebase settlement object:', data.settlement.projects.map((p: any) => ({ name: p.name, id: p.id })));
        } else {
          console.log('❌ No projects array in Firebase settlement object');
        }
        
        const userData = {
          inventory: data.inventory || {},
          buildList: data.buildList || [],
          settlement: data.settlement ? this.convertTimestampsToDate(data.settlement) : null,
          lastUpdated: data.lastUpdated,
          version: data.version || 1,
          userProfile: data.userProfile || undefined
        };
        
        // Debug: Log what we're returning
        console.log('🔍 Processed user data:', {
          hasSettlement: !!userData.settlement,
          settlementProjects: userData.settlement?.projects?.length || 0
        });
        
        this.updateSaveStatus({ 
          isLoading: false, 
          error: null 
        });
        console.log('✅ User data loaded successfully');
        return userData;
      }
      
      this.updateSaveStatus({ 
        isLoading: false, 
        error: null 
      });
      console.log('ℹ️ No user data found, starting fresh');
      return null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load data';
      this.updateSaveStatus({ 
        isLoading: false, 
        error: errorMessage.includes('timeout') ? 'Load timeout - please check connection' : errorMessage
      });
      console.error('❌ Error loading user data:', error);
      // Don't throw error, return null to continue with empty data
      return null;
    }
  }

  async saveInventory(userId: string, inventory: Inventory): Promise<void> {
    console.log('💾 Saving inventory...');
    return this.saveUserData(userId, { inventory });
  }

  async saveBuildList(userId: string, buildList: BuildListItem[]): Promise<void> {
    console.log('💾 Saving build list...');
    return this.saveUserData(userId, { buildList });
  }

  async saveSettlement(userId: string, settlement: SettlementData): Promise<void> {
    console.log('💾 Saving settlement data...', {
      hasData: !!settlement,
      projectCount: settlement.projects?.length || 0,
      projects: settlement.projects?.map(p => ({ name: p.name, id: p.id })) || []
    });
    return this.saveUserData(userId, { settlement });
  }

  async saveComplete(userId: string, inventory: Inventory, buildList: BuildListItem[], settlement?: SettlementData): Promise<void> {
    console.log('💾 Saving complete user data...');
    const dataToSave: Partial<UserData> = { inventory, buildList };
    if (settlement !== undefined) {
      dataToSave.settlement = settlement;
    }
    return this.saveUserData(userId, dataToSave);
  }

  // Save user profile information
  async saveUserProfile(userId: string, profileData: UserData['userProfile']): Promise<void> {
    console.log('👤 Saving user profile...');
    return this.saveUserData(userId, { userProfile: profileData });
  }

  // Real-time listener for user data
  subscribeToUserData(userId: string, callback: (data: UserData | null) => void) {
    const userDocRef = this.getUserDocRef(userId);
    
    return onSnapshot(userDocRef, 
      (doc) => {
        if (doc.exists()) {
          const data = doc.data() as UserData;
          callback({
            inventory: data.inventory || {},
            buildList: data.buildList || [],
            settlement: data.settlement ? this.convertTimestampsToDate(data.settlement) : null,
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
        this.updateSaveStatus({ 
          error: error.message 
        });
        // Call callback with null to prevent hanging
        callback(null);
      }
    );
  }

  async deleteUserData(userId: string): Promise<void> {
    const userDocRef = this.getUserDocRef(userId);
    
    try {
      await withTimeout(deleteDoc(userDocRef), 10000);
      console.log('✅ User data deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting user data:', error);
      throw error;
    }
  }

  // Get formatted last updated time
  getLastUpdatedString(timestamp: any): string {
    if (!timestamp) return 'Never';
    
    try {
      const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return 'Unknown';
    }
  }

  // Force refresh database status
  async refreshDatabaseStatus(): Promise<boolean> {
    this.isDatabaseEnabled = null;
    return this.checkDatabaseAvailability();
  }

  // Test database connectivity for authenticated users
  async testDatabaseConnectivity(userId: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🧪 Testing database connectivity for user:', userId);
      
      // Test 1: Try to read user document
      const userDocRef = this.getUserDocRef(userId);
      await withTimeout(getDoc(userDocRef), 8000);
      console.log('✅ User document read test passed');
      
      // Test 2: Try to write test data
      const testData = {
        inventory: { 'connectivity-test': 1 },
        buildList: [{ itemId: 'test-item', quantity: 1, recipeIndex: 0 }],
        lastUpdated: serverTimestamp(),
        version: 1
      };
      
      await withTimeout(setDoc(userDocRef, testData, { merge: true }), 8000);
      console.log('✅ Database write test passed');
      
      // Test 3: Try to read back the data
      const readBack = await withTimeout(getDoc(userDocRef), 8000);
      console.log('✅ Database read-back test passed');
      
      // Update cached status
      this.isDatabaseEnabled = true;
      
      return { 
        success: true, 
        message: 'Database connectivity test successful!' 
      };
      
    } catch (error) {
      console.error('❌ Database connectivity test failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (errorMessage.includes('Missing or insufficient permissions')) {
        return {
          success: false,
          message: 'Database permissions error - check Firestore rules'
        };
      }
      
      if (errorMessage.includes('timeout')) {
        return {
          success: false,
          message: 'Database connection timeout - check network'
        };
      }
      
      return {
        success: false,
        message: `Database error: ${errorMessage}`
      };
    }
  }
}

export const firebaseService = new FirebaseService(); 