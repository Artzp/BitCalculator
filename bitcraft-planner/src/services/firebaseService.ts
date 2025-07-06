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

export interface UserData {
  inventory: Inventory;
  buildList: BuildListItem[];
  lastUpdated: any; // Firestore timestamp
  version: number; // For data versioning
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

  private validateUserData(data: Partial<UserData>): boolean {
    // Basic validation
    if (data.inventory && typeof data.inventory !== 'object') {
      return false;
    }
    if (data.buildList && !Array.isArray(data.buildList)) {
      return false;
    }
    return true;
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

    // Check database availability first
    const isAvailable = await this.checkDatabaseAvailability();
    if (!isAvailable) {
      console.log('📴 Database not available, skipping save');
      this.updateSaveStatus({ 
        isSaving: false, 
        error: 'Database not available - data saved locally only' 
      });
      return;
    }

    this.updateSaveStatus({ isSaving: true, error: null });

    const userDocRef = this.getUserDocRef(userId);
    const dataToSave = {
      ...data,
      lastUpdated: serverTimestamp(),
      version: (data.version || 0) + 1
    };
    
    try {
      await withTimeout(setDoc(userDocRef, dataToSave, { merge: true }), 10000);
      this.updateSaveStatus({ 
        isSaving: false, 
        lastSaved: new Date(),
        error: null 
      });
      console.log('✅ User data saved successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save data';
      this.updateSaveStatus({ 
        isSaving: false, 
        error: errorMessage.includes('timeout') ? 'Save timeout - please check connection' : errorMessage
      });
      console.error('❌ Error saving user data:', error);
      throw error;
    }
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
        const userData = {
          inventory: data.inventory || {},
          buildList: data.buildList || [],
          lastUpdated: data.lastUpdated,
          version: data.version || 1
        };
        
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

  async saveComplete(userId: string, inventory: Inventory, buildList: BuildListItem[]): Promise<void> {
    console.log('💾 Saving complete user data...');
    return this.saveUserData(userId, { inventory, buildList });
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
            lastUpdated: data.lastUpdated,
            version: data.version || 1
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