import { 
  collection, 
  getDocs, 
  doc, 
  getDoc,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { auth } from '../firebase/config';
import { isAdmin } from './adminCheck';

export interface DatabaseIssue {
  collection: string;
  documentId: string;
  issue: string;
  severity: 'error' | 'warning' | 'info';
  data?: any;
}

export class DatabaseDebugger {
  private issues: DatabaseIssue[] = [];

  async debugAllData(): Promise<{
    issues: DatabaseIssue[];
    collections: { [key: string]: any[] };
    summary: string;
  }> {
    console.log('🔍 Starting client-side database debugging...');
    this.issues = [];
    const collections: { [key: string]: any[] } = {};
    
    const user = auth.currentUser;
    if (!user) {
      this.addIssue('auth', 'current-user', 'No authenticated user found', 'error');
      return { issues: this.issues, collections, summary: 'Not authenticated' };
    }

    const adminMode = isAdmin();
    console.log(`👤 Debugging for user: ${user.uid} (${user.email}) ${adminMode ? '🔑 ADMIN MODE' : ''}`);

    if (adminMode) {
      // Admin mode: Debug ALL data
      await this.debugAllUsers(collections);
      await this.debugAllCollections(collections);
    } else {
      // Regular user: Debug only their data
      await this.debugUserData(user.uid, collections);
      await this.debugPublicCollections(collections);
    }

    const summary = this.generateSummary();
    console.log('🏁 Database debugging complete!');
    console.log('📊 Summary:', summary);
    
    return { issues: this.issues, collections, summary };
  }

  private async debugUserData(userId: string, collections: { [key: string]: any[] }) {
    try {
      console.log('📋 Debugging user data...');
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        this.addIssue('users', userId, 'User document does not exist', 'error');
        return;
      }

      const userData = userDoc.data();
      collections['users'] = [{ id: userId, ...userData }];
      
      // Validate user data structure
      this.validateUserData(userId, userData);
      
      // Check user settings
      await this.debugUserSettings(userId, collections);
      
    } catch (error) {
      this.addIssue('users', userId, `Error reading user data: ${error}`, 'error');
    }
  }

  private validateUserData(userId: string, data: any) {
    console.log('🔍 Validating user data structure...');
    
    // Check required fields
    if (!data.lastUpdated) {
      this.addIssue('users', userId, 'Missing lastUpdated field', 'warning');
    }
    
    if (!data.version) {
      this.addIssue('users', userId, 'Missing version field', 'warning');
    }
    
    if (!data.inventory) {
      this.addIssue('users', userId, 'Missing inventory object', 'error');
    }
    
    if (!data.buildList) {
      this.addIssue('users', userId, 'Missing buildList array', 'error');
    }
    
    // Validate settlement data if present
    if (data.settlement) {
      this.validateSettlementData(userId, data.settlement);
    } else {
      this.addIssue('users', userId, 'No settlement data found', 'info');
    }
  }

  private validateSettlementData(userId: string, settlement: any) {
    console.log('🏘️ Validating settlement data...');
    
    const requiredFields = ['id', 'name', 'players', 'projects', 'tasks', 'inventory'];
    for (const field of requiredFields) {
      if (settlement[field] === undefined) {
        this.addIssue('users', userId, `Settlement missing ${field}`, 'error');
      }
    }
    
    // Validate arrays
    if (settlement.players && !Array.isArray(settlement.players)) {
      this.addIssue('users', userId, 'Settlement players is not an array', 'error');
    }
    
    if (settlement.projects && !Array.isArray(settlement.projects)) {
      this.addIssue('users', userId, 'Settlement projects is not an array', 'error');
    }
    
    if (settlement.tasks && !Array.isArray(settlement.tasks)) {
      this.addIssue('users', userId, 'Settlement tasks is not an array', 'error');
    }
    
    // Check for orphaned tasks
    if (settlement.projects && settlement.tasks) {
      this.validateProjectTaskCorrelation(userId, settlement.projects, settlement.tasks);
    }
    
    // Check for duplicate IDs
    this.validateUniqueIds(userId, settlement);
  }

  private validateProjectTaskCorrelation(userId: string, projects: any[], tasks: any[]) {
    console.log('🔗 Validating project-task correlation...');
    
    const projectIds = new Set(projects.map(p => p.id));
    const orphanedTasks = tasks.filter(task => task.projectId && !projectIds.has(task.projectId));
    
    if (orphanedTasks.length > 0) {
      this.addIssue('users', userId, 
        `Found ${orphanedTasks.length} orphaned tasks with invalid projectIds: ${orphanedTasks.map(t => `${t.id} -> ${t.projectId}`).join(', ')}`, 
        'error', 
        { orphanedTasks }
      );
    }
  }

  private validateUniqueIds(userId: string, settlement: any) {
    console.log('🆔 Validating unique IDs...');
    
    const allIds = new Set();
    const duplicates = [];
    
    // Check project IDs
    if (settlement.projects) {
      for (const project of settlement.projects) {
        if (project.id) {
          if (allIds.has(project.id)) {
            duplicates.push(`Project ID: ${project.id}`);
          }
          allIds.add(project.id);
        }
      }
    }
    
    // Check task IDs
    if (settlement.tasks) {
      for (const task of settlement.tasks) {
        if (task.id) {
          if (allIds.has(task.id)) {
            duplicates.push(`Task ID: ${task.id}`);
          }
          allIds.add(task.id);
        }
      }
    }
    
    if (duplicates.length > 0) {
      this.addIssue('users', userId, `Duplicate IDs found: ${duplicates.join(', ')}`, 'error');
    }
  }

  private async debugUserSettings(userId: string, collections: { [key: string]: any[] }) {
    try {
      const settingsDoc = await getDoc(doc(db, 'userSettings', userId));
      if (settingsDoc.exists()) {
        collections['userSettings'] = [{ id: userId, ...settingsDoc.data() }];
      } else {
        this.addIssue('userSettings', userId, 'No user settings found', 'info');
      }
    } catch (error) {
      this.addIssue('userSettings', userId, `Error reading user settings: ${error}`, 'warning');
    }
  }

  private async debugAllUsers(collections: { [key: string]: any[] }) {
    console.log('👥 ADMIN: Debugging ALL user data...');
    
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      
      if (!usersSnapshot.empty) {
        collections['users'] = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`👤 Found ${usersSnapshot.size} users`);
        
        // Validate each user's data
        usersSnapshot.docs.forEach(userDoc => {
          this.validateUserData(userDoc.id, userDoc.data());
        });
        
        // Check for global issues across all users
        this.validateGlobalUserIssues(collections['users']);
      } else {
        this.addIssue('users', 'collection', 'No users found', 'warning');
      }
      
      // Also get user settings for all users
      const settingsSnapshot = await getDocs(collection(db, 'userSettings'));
      if (!settingsSnapshot.empty) {
        collections['userSettings'] = settingsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        console.log(`⚙️ Found ${settingsSnapshot.size} user settings`);
      }
    } catch (error) {
      this.addIssue('users', 'collection', `Error reading all users: ${error}`, 'error');
    }
  }

  private async debugAllCollections(collections: { [key: string]: any[] }) {
    console.log('📂 ADMIN: Debugging ALL collections...');
    
    const allCollections = [
      'sharedBuilds', 
      'sharedProjects', 
      'projectCollaborations', 
      'gameData', 
      'statistics',
      'test'
    ];
    
    for (const collectionName of allCollections) {
      try {
        const snapshot = await getDocs(collection(db, collectionName));
        
        if (!snapshot.empty) {
          collections[collectionName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log(`📁 ${collectionName}: ${snapshot.size} documents`);
          
          // Validate collection-specific data
          this.validateCollectionData(collectionName, collections[collectionName]);
        } else {
          this.addIssue(collectionName, 'collection', 'No documents found', 'info');
        }
      } catch (error) {
        this.addIssue(collectionName, 'collection', `Error reading collection: ${error}`, 'warning');
      }
    }
  }

  private validateGlobalUserIssues(users: any[]) {
    console.log('🔍 ADMIN: Validating global user issues...');
    
    // Check for duplicate settlement names
    const settlementNames = new Map<string, string[]>();
    
    users.forEach(user => {
      if (user.settlement && user.settlement.name) {
        const name = user.settlement.name.toLowerCase();
        if (!settlementNames.has(name)) {
          settlementNames.set(name, []);
        }
        settlementNames.get(name)!.push(user.id);
      }
    });
    
    // Report duplicate settlement names
    settlementNames.forEach((userIds, settlementName) => {
      if (userIds.length > 1) {
        this.addIssue('users', 'global', 
          `Duplicate settlement name "${settlementName}" used by users: ${userIds.join(', ')}`, 
          'warning'
        );
      }
    });
    
    // Check for orphaned collaborations
    this.validateOrphanedCollaborations(users);
  }

  private validateOrphanedCollaborations(users: any[]) {
    console.log('🔗 ADMIN: Checking for orphaned collaborations...');
    
    const userIds = new Set(users.map(u => u.id));
    
    // Store user IDs and user data for later validation
    (this as any).validUserIds = userIds;
    (this as any).allUsers = users;
  }

  private validateCollectionData(collectionName: string, documents: any[]) {
    console.log(`🔍 ADMIN: Validating ${collectionName} collection...`);
    
    switch (collectionName) {
      case 'projectCollaborations':
        this.validateProjectCollaborations(documents);
        break;
      case 'sharedProjects':
        this.validateSharedProjects(documents);
        break;
      case 'sharedBuilds':
        this.validateSharedBuilds(documents);
        break;
    }
  }

  private validateProjectCollaborations(collaborations: any[]) {
    const validUserIds = (this as any).validUserIds as Set<string>;
    const allUsers = (this as any).allUsers as any[];
    
    collaborations.forEach(collab => {
      // Check if owner exists
      if (validUserIds && !validUserIds.has(collab.ownerId)) {
        this.addIssue('projectCollaborations', collab.id, 
          `Orphaned collaboration: owner ${collab.ownerId} does not exist`, 
          'error'
        );
        return;
      }
      
      // Check if the actual project exists in the owner's settlement
      if (allUsers && collab.projectId && collab.ownerId) {
        const ownerUser = allUsers.find(u => u.id === collab.ownerId);
        if (ownerUser && ownerUser.settlement && ownerUser.settlement.projects) {
          const projectExists = ownerUser.settlement.projects.some((p: any) => p.id === collab.projectId);
          if (!projectExists) {
            this.addIssue('projectCollaborations', collab.id, 
              `Orphaned collaboration: project ${collab.projectId} (${collab.projectName}) does not exist in owner's settlement`, 
              'error',
              { 
                projectId: collab.projectId, 
                projectName: collab.projectName,
                ownerId: collab.ownerId,
                ownerName: collab.ownerName
              }
            );
          }
        }
      }
      
      // Check if collaborators exist
      if (collab.collaborators && validUserIds) {
        collab.collaborators.forEach((collaboratorId: string) => {
          if (!validUserIds.has(collaboratorId)) {
            this.addIssue('projectCollaborations', collab.id, 
              `Invalid collaborator: user ${collaboratorId} does not exist`, 
              'warning'
            );
          }
        });
      }
    });
  }

  private validateSharedProjects(projects: any[]) {
    projects.forEach(project => {
      if (!project.authorId) {
        this.addIssue('sharedProjects', project.id, 'Missing authorId', 'error');
      }
      if (!project.items || !Array.isArray(project.items)) {
        this.addIssue('sharedProjects', project.id, 'Missing or invalid items array', 'error');
      }
    });
  }

  private validateSharedBuilds(builds: any[]) {
    builds.forEach(build => {
      if (!build.authorId) {
        this.addIssue('sharedBuilds', build.id, 'Missing authorId', 'error');
      }
      if (!build.buildList || !Array.isArray(build.buildList)) {
        this.addIssue('sharedBuilds', build.id, 'Missing or invalid buildList array', 'error');
      }
    });
  }

  private async debugPublicCollections(collections: { [key: string]: any[] }) {
    console.log('🌐 Debugging public collections...');
    
    const publicCollections = ['sharedBuilds', 'sharedProjects', 'projectCollaborations', 'gameData'];
    
    for (const collectionName of publicCollections) {
      try {
        const q = query(collection(db, collectionName), limit(50)); // Limit to avoid excessive reads
        const snapshot = await getDocs(q);
        
        if (!snapshot.empty) {
          collections[collectionName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          console.log(`📁 ${collectionName}: ${snapshot.size} documents`);
        } else {
          this.addIssue(collectionName, 'collection', 'No documents found', 'info');
        }
      } catch (error) {
        this.addIssue(collectionName, 'collection', `Error reading collection: ${error}`, 'warning');
      }
    }
  }

  private addIssue(collection: string, documentId: string, issue: string, severity: 'error' | 'warning' | 'info', data?: any) {
    this.issues.push({ collection, documentId, issue, severity, data });
    const emoji = severity === 'error' ? '❌' : severity === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${emoji} [${collection}/${documentId}] ${issue}`);
  }

  private generateSummary(): string {
    const errors = this.issues.filter(i => i.severity === 'error').length;
    const warnings = this.issues.filter(i => i.severity === 'warning').length;
    const infos = this.issues.filter(i => i.severity === 'info').length;
    
    return `Found ${errors} errors, ${warnings} warnings, ${infos} info messages`;
  }

  // Method to fix common issues for a specific user
  async fixCommonIssues(userId: string): Promise<void> {
    console.log(`🔧 Attempting to fix common issues for user ${userId}...`);
    
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.log(`❌ Cannot fix: User document ${userId} does not exist`);
      return;
    }
    
    const userData = userDoc.data();
    let needsUpdate = false;
    const updates: any = {};
    
    // Fix missing version
    if (!userData.version) {
      updates.version = 1;
      needsUpdate = true;
      console.log(`✅ Fixed: Added version field for user ${userId}`);
    }
    
    // Fix missing or incorrect arrays in settlement
    if (userData.settlement) {
      // Fix players field - convert object to array or add if missing
      if (!userData.settlement.players || !Array.isArray(userData.settlement.players)) {
        updates['settlement.players'] = [];
        needsUpdate = true;
        console.log(`✅ Fixed: Added/corrected players array for user ${userId}`);
      }
      
      // Fix projects field - convert object to array or add if missing
      if (!userData.settlement.projects || !Array.isArray(userData.settlement.projects)) {
        // If it's an object, try to convert it to an array
        const existingProjects = userData.settlement.projects;
        if (existingProjects && typeof existingProjects === 'object' && !Array.isArray(existingProjects)) {
          const projectArray = Object.values(existingProjects);
          if (projectArray.length > 0) {
            updates['settlement.projects'] = projectArray;
            console.log(`✅ Fixed: Converted projects object to array for user ${userId} (preserved ${projectArray.length} projects)`);
          } else {
            // Only set empty array if object was truly empty
            updates['settlement.projects'] = [];
            console.log(`✅ Fixed: Added projects array for user ${userId} (object was empty)`);
          }
        } else if (!existingProjects) {
          // Only set empty array if projects field is null/undefined
          updates['settlement.projects'] = [];
          console.log(`✅ Fixed: Added projects array for user ${userId} (field was missing)`);
        } else {
          // Don't modify if we can't understand the data structure
          console.log(`⚠️ WARNING: Skipping projects fix for user ${userId} - unknown data structure:`, existingProjects);
        }
        needsUpdate = true;
      }
      
      // Fix tasks field - convert object to array or add if missing
      if (!userData.settlement.tasks || !Array.isArray(userData.settlement.tasks)) {
        // If it's an object, try to convert it to an array
        const existingTasks = userData.settlement.tasks;
        if (existingTasks && typeof existingTasks === 'object' && !Array.isArray(existingTasks)) {
          updates['settlement.tasks'] = Object.values(existingTasks);
          console.log(`✅ Fixed: Converted tasks object to array for user ${userId}`);
        } else {
          updates['settlement.tasks'] = [];
          console.log(`✅ Fixed: Added tasks array for user ${userId}`);
        }
        needsUpdate = true;
      }
      
      // Fix inventory field
      if (!userData.settlement.inventory) {
        updates['settlement.inventory'] = {};
        needsUpdate = true;
        console.log(`✅ Fixed: Added inventory object for user ${userId}`);
      }
    }
    
    if (needsUpdate) {
      try {
        await setDoc(userDocRef, updates, { merge: true });
        console.log(`✅ Successfully applied fixes to database for user ${userId}`);
      } catch (error) {
        console.error(`❌ Failed to apply fixes for user ${userId}:`, error);
        throw error;
      }
    } else {
      console.log(`ℹ️ No fixes needed for user ${userId}`);
    }
  }

  // Method to fix all users (admin only)
  async fixAllUsers(): Promise<void> {
    console.log('🔧 ADMIN: Attempting to fix issues for ALL users...');
    
    try {
      console.log('🔍 ADMIN: Testing permissions by reading users collection...');
      const usersSnapshot = await getDocs(collection(db, 'users'));
      console.log(`✅ ADMIN: Successfully read ${usersSnapshot.size} users`);
      
      let fixedCount = 0;
      let errorCount = 0;
      
      // Fix user data issues
      for (const userDoc of usersSnapshot.docs) {
        try {
          console.log(`🔧 ADMIN: Attempting to fix user ${userDoc.id}...`);
          await this.fixCommonIssues(userDoc.id);
          console.log(`✅ ADMIN: Successfully fixed user ${userDoc.id}`);
          fixedCount++;
        } catch (error) {
          console.error(`❌ ADMIN: Failed to fix user ${userDoc.id}:`, error);
          console.error(`❌ ADMIN: Error details:`, {
            code: (error as any)?.code,
            message: (error as any)?.message,
            stack: (error as any)?.stack
          });
          errorCount++;
        }
      }
      
      // Fix orphaned collaborations
      console.log('🔧 ADMIN: Attempting to fix orphaned collaborations...');
      try {
        await this.fixOrphanedCollaborations();
        console.log('✅ ADMIN: Successfully fixed orphaned collaborations');
      } catch (error) {
        console.error('❌ ADMIN: Failed to fix orphaned collaborations:', error);
        console.error(`❌ ADMIN: Collaboration fix error details:`, {
          code: (error as any)?.code,
          message: (error as any)?.message,
          stack: (error as any)?.stack
        });
      }
      
      console.log(`✅ ADMIN: Fixed ${fixedCount} users, ${errorCount} errors`);
    } catch (error) {
      console.error('❌ ADMIN: Failed to fix all users:', error);
      console.error(`❌ ADMIN: Top-level error details:`, {
        code: (error as any)?.code,
        message: (error as any)?.message,
        stack: (error as any)?.stack
      });
      throw error;
    }
  }

  // Method to fix orphaned collaborations (admin only)
  async fixOrphanedCollaborations(): Promise<void> {
    console.log('🔧 ADMIN: Fixing orphaned collaborations...');
    
    try {
      // Get all collaborations
      const collaborationsSnapshot = await getDocs(collection(db, 'projectCollaborations'));
      
      // Get all users to check project existence
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      let deletedCount = 0;
      
      for (const collabDoc of collaborationsSnapshot.docs) {
        const collab = collabDoc.data();
        
        // Check if the project exists in the owner's settlement
        const ownerUser = allUsers.find(u => u.id === collab.ownerId) as any;
        if (ownerUser && ownerUser.settlement && ownerUser.settlement.projects) {
          const projectExists = ownerUser.settlement.projects.some((p: any) => p.id === collab.projectId);
          
          if (!projectExists) {
            // Delete the orphaned collaboration
            await deleteDoc(doc(db, 'projectCollaborations', collabDoc.id));
            console.log(`✅ Deleted orphaned collaboration: ${collab.projectName} (${collabDoc.id})`);
            deletedCount++;
          }
        } else {
          // Owner doesn't exist or has no settlement - delete collaboration
          await deleteDoc(doc(db, 'projectCollaborations', collabDoc.id));
          console.log(`✅ Deleted collaboration with missing owner: ${collab.projectName} (${collabDoc.id})`);
          deletedCount++;
        }
      }
      
      console.log(`✅ ADMIN: Deleted ${deletedCount} orphaned collaborations`);
    } catch (error) {
      console.error('❌ ADMIN: Failed to fix orphaned collaborations:', error);
      throw error;
    }
  }

  // Method to get all projects across all users (admin only)
  async getAllProjectsData(): Promise<{
    allProjects: any[];
    projectsByUser: { [userId: string]: any[] };
    orphanedCollaborations: any[];
    totalStats: {
      totalUsers: number;
      totalProjects: number;
      totalCollaborations: number;
      activeCollaborations: number;
    };
  }> {
    console.log('📊 ADMIN: Collecting all projects data...');
    
    try {
      // Get all users
      console.log('📊 ADMIN: Fetching all users...');
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      console.log(`📊 ADMIN: Loaded ${allUsers.length} users`);
      
      // Get all collaborations
      console.log('📊 ADMIN: Fetching all collaborations...');
      const collaborationsSnapshot = await getDocs(collection(db, 'projectCollaborations'));
      const allCollaborations = collaborationsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      console.log(`📊 ADMIN: Loaded ${allCollaborations.length} collaborations`);
      
      // Extract all projects from users
      const allProjects: any[] = [];
      const projectsByUser: { [userId: string]: any[] } = {};
      
      allUsers.forEach(user => {
        let userProjects = user.settlement?.projects || [];
        
        // Fix data structure issues - ensure projects is an array
        if (!Array.isArray(userProjects)) {
          console.warn(`⚠️ ADMIN: User ${user.id} has non-array projects:`, typeof userProjects);
          if (userProjects && typeof userProjects === 'object') {
            // Convert object to array
            userProjects = Object.values(userProjects);
            console.log(`✅ ADMIN: Converted projects object to array for user ${user.id}`);
          } else {
            // Set empty array if not convertible
            userProjects = [];
            console.log(`✅ ADMIN: Set empty projects array for user ${user.id}`);
          }
        }
        
        projectsByUser[user.id] = userProjects.map((project: any) => ({
          ...project,
          ownerId: user.id,
          ownerName: user.userProfile?.displayName || user.userProfile?.email || 'Unknown',
          ownerEmail: user.userProfile?.email || 'Unknown'
        }));
        allProjects.push(...projectsByUser[user.id]);
      });
      
      // Find orphaned collaborations
      const orphanedCollaborations = allCollaborations.filter(collab => {
        const ownerUser = allUsers.find(u => u.id === collab.ownerId);
        if (!ownerUser || !ownerUser.settlement?.projects) return true;
        
        // Ensure projects is an array before using .some()
        let ownerProjects = ownerUser.settlement.projects;
        if (!Array.isArray(ownerProjects)) {
          console.warn(`⚠️ ADMIN: Owner ${collab.ownerId} has non-array projects when checking collaboration ${collab.id}`);
          if (ownerProjects && typeof ownerProjects === 'object') {
            ownerProjects = Object.values(ownerProjects);
          } else {
            ownerProjects = [];
          }
        }
        
        const projectExists = ownerProjects.some((p: any) => p.id === collab.projectId);
        return !projectExists;
      });
      
      const totalStats = {
        totalUsers: allUsers.length,
        totalProjects: allProjects.length,
        totalCollaborations: allCollaborations.length,
        activeCollaborations: allCollaborations.filter(c => c.isActive).length
      };
      
      console.log('📊 ADMIN: Projects data collected:', totalStats);
      
      return {
        allProjects,
        projectsByUser,
        orphanedCollaborations,
        totalStats
      };
    } catch (error) {
      console.error('❌ ADMIN: Failed to collect projects data:', error);
      throw error;
    }
  }

  // Method to restore a project to a user (admin only)
  async restoreProjectToUser(userId: string, projectData: any): Promise<void> {
    console.log(`🔧 ADMIN: Restoring project ${projectData.name} to user ${userId}...`);
    
    try {
      const userDocRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error(`User ${userId} does not exist`);
      }
      
      const userData = userDoc.data();
      let currentProjects = userData.settlement?.projects || [];
      
      // Ensure projects is an array
      if (!Array.isArray(currentProjects)) {
        console.warn(`⚠️ ADMIN: Converting non-array projects to array for user ${userId}`);
        currentProjects = [];
      }
      
      // Check if project already exists
      const projectExists = currentProjects.some((p: any) => p.id === projectData.id);
      if (projectExists) {
        console.log(`⚠️ Project ${projectData.id} already exists for user ${userId}`);
        return;
      }
      
      // Add the project to the user's settlement - CRITICAL FIX: Update entire settlement object
      const updatedProjects = [...currentProjects, projectData];
      const updatedSettlement = {
        ...userData.settlement,
        projects: updatedProjects,
        lastUpdated: new Date()
      };
      
      console.log('🔧 ADMIN: Restoring project with settlement update:', {
        projectName: projectData.name,
        totalProjects: updatedProjects.length,
        settlementStructure: Object.keys(updatedSettlement)
      });
      
      await setDoc(userDocRef, {
        settlement: updatedSettlement,  // Update entire settlement object, not nested field
        lastUpdated: serverTimestamp(),
        version: (userData.version || 0) + 1
      }, { merge: true });
      
      console.log(`✅ ADMIN: Successfully restored project ${projectData.name} to user ${userId}`);
    } catch (error) {
      console.error(`❌ ADMIN: Failed to restore project to user ${userId}:`, error);
      throw error;
    }
  }

  // Method to immediately restore current user's lost projects from collaborations 
  async restoreCurrentUserProjectsFromCollaborations(): Promise<void> {
    console.log('🚨 ADMIN: Emergency restoration of current user projects from collaborations...');
    
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('No authenticated user');
      }

      // Get all collaborations for the current user
      const collaborationsSnapshot = await getDocs(collection(db, 'projectCollaborations'));
      const userCollaborations = collaborationsSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter((collab: any) => collab.ownerId === user.uid && collab.isActive);

      console.log(`🔍 ADMIN: Found ${userCollaborations.length} active collaborations for current user`);

      if (userCollaborations.length === 0) {
        console.log('ℹ️ ADMIN: No collaborations found to restore from');
        return;
      }

      // Get current user data
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('Current user document does not exist');
      }

      const userData = userDoc.data();
      let currentProjects = userData.settlement?.projects || [];
      
      // Ensure projects is an array
      if (!Array.isArray(currentProjects)) {
        currentProjects = [];
      }

      let restoredCount = 0;

      // Restore each missing project from collaboration data
      for (const collab of userCollaborations as any[]) {
        const projectExists = currentProjects.some((p: any) => p.id === collab.projectId);
        
        if (!projectExists) {
          // Create a basic project structure from collaboration data
          const restoredProject = {
            id: collab.projectId,
            name: collab.projectName,
            description: `🔧 Restored from collaboration ${collab.id} after data loss`,
            status: 'not_started',
            priority: 'medium',
            assignedPlayers: [],
            items: [],
            progressPercentage: 0,
            dateCreated: collab.createdAt,
            notes: `Emergency restoration from collaboration. Original data may be incomplete. Collaboration ID: ${collab.id}`
          };

          currentProjects.push(restoredProject);
          restoredCount++;
          console.log(`✅ ADMIN: Restored project "${collab.projectName}" (${collab.projectId})`);
        }
      }

      if (restoredCount > 0) {
              // Save the restored projects - CRITICAL FIX: Update entire settlement object
      const updatedSettlement = {
        ...userData.settlement,
        projects: currentProjects,
        lastUpdated: new Date()
      };
      
      console.log('🔧 ADMIN: Saving updated settlement with projects:', {
        projectCount: currentProjects.length,
        projectNames: currentProjects.map((p: any) => p.name),
        settlementStructure: Object.keys(updatedSettlement)
      });
      
      await setDoc(userDocRef, {
        settlement: updatedSettlement,  // Update entire settlement object, not nested field
        lastUpdated: serverTimestamp(),
        version: (userData.version || 0) + 1
      }, { merge: true });

        console.log(`✅ ADMIN: Successfully restored ${restoredCount} projects from collaborations`);
      } else {
        console.log('ℹ️ ADMIN: No projects needed restoration');
      }
    } catch (error) {
      console.error('❌ ADMIN: Failed to restore projects from collaborations:', error);
      throw error;
    }
  }
}

// Export convenience function
export const debugDatabase = async () => {
  const dbDebugger = new DatabaseDebugger();
  return await dbDebugger.debugAllData();
};

export const fixDatabaseIssues = async () => {
  const user = auth.currentUser;
  if (!user) {
    console.error('❌ No authenticated user');
    return;
  }
  
  // Detailed authentication state logging
  console.log('🔍 Authentication State Check:', {
    userExists: !!user,
    userEmail: user.email,
    userUID: user.uid,
    emailVerified: user.emailVerified,
    isAdmin: isAdmin(),
    timestamp: new Date().toISOString(),
    providerData: user.providerData
  });
  
  const dbDebugger = new DatabaseDebugger();
  
  // If user is admin, fix all users; otherwise just fix current user
  if (isAdmin()) {
    console.log('🔑 ADMIN: Fixing issues for ALL users');
    console.log('🔑 ADMIN: Verifying Firebase auth token is valid...');
    try {
      const token = await user.getIdToken(true); // Force refresh
      console.log('✅ ADMIN: Firebase auth token refreshed successfully');
      await dbDebugger.fixAllUsers();
    } catch (tokenError) {
      console.error('❌ ADMIN: Failed to refresh auth token:', tokenError);
      throw tokenError;
    }
  } else {
    console.log('👤 Fixing issues for current user only');
    await dbDebugger.fixCommonIssues(user.uid);
  }
};

// Export convenience function for quick project recovery
export const quickProjectRecovery = async () => {
  const user = auth.currentUser;
  if (!user) {
    console.error('❌ No authenticated user for recovery');
    return { success: false, message: 'No authenticated user' };
  }
  
  console.log('🚨 EMERGENCY: Attempting quick project recovery...');
  
  try {
    const dbDebugger = new DatabaseDebugger();
    
    // Try to restore from collaborations first (fastest method)
    console.log('🔧 Trying to restore from collaboration records...');
    await dbDebugger.restoreCurrentUserProjectsFromCollaborations();
    
    console.log('✅ Quick recovery attempt completed');
    return { 
      success: true, 
      message: 'Recovery completed. Please refresh the page to see restored projects.' 
    };
  } catch (error) {
    console.error('❌ Quick recovery failed:', error);
    return { 
      success: false, 
      message: `Recovery failed: ${error}. Try refreshing the page or contact support.` 
    };
  }
};

// Export admin recovery function  
export const adminProjectRecovery = async () => {
  if (!isAdmin()) {
    console.error('❌ Admin access required');
    return { success: false, message: 'Admin access required' };
  }
  
  console.log('🔑 ADMIN: Starting comprehensive project recovery...');
  
  try {
    const dbDebugger = new DatabaseDebugger();
    
    // Get all projects data for analysis
    const projectsData = await dbDebugger.getAllProjectsData();
    
    console.log('📊 Recovery analysis:', {
      totalUsers: projectsData.totalStats.totalUsers,
      totalProjects: projectsData.totalStats.totalProjects,
      orphanedCollaborations: projectsData.orphanedCollaborations.length
    });
    
    return {
      success: true,
      message: 'Admin recovery analysis completed',
      data: projectsData
    };
  } catch (error) {
    console.error('❌ Admin recovery failed:', error);
    return { 
      success: false, 
      message: `Admin recovery failed: ${error}` 
    };
  }
};

// IMMEDIATE EMERGENCY RECOVERY - Bypasses normal loading and forces project restoration
export const immediateEmergencyRecovery = async () => {
  console.log('🚨 IMMEDIATE EMERGENCY RECOVERY INITIATED');
  
  const user = auth.currentUser;
  if (!user) {
    console.error('❌ No authenticated user for emergency recovery');
    alert('❌ You must be logged in to recover projects');
    return { success: false, message: 'Not logged in' };
  }
  
  try {
    console.log('🔧 Step 1: Attempting to restore from collaboration records...');
    const dbDebugger = new DatabaseDebugger();
    
    // Get all collaborations for this user
    const collaborationsSnapshot = await getDocs(collection(db, 'projectCollaborations'));
    const userCollaborations = collaborationsSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter((collab: any) => collab.ownerId === user.uid && collab.isActive);

    console.log(`🔍 Found ${userCollaborations.length} collaborations to potentially restore from`);

    if (userCollaborations.length === 0) {
      console.log('⚠️ No collaboration records found to restore from');
      alert('⚠️ No backup data found in collaboration records. Try checking Debug tab for other recovery options.');
      return { success: false, message: 'No collaboration backups found' };
    }

    // Get current user document
    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      console.error('❌ User document does not exist');
      alert('❌ User account data not found in database');
      return { success: false, message: 'User document missing' };
    }

    const userData = userDoc.data();
    
    // Create projects from collaboration data
    const restoredProjects = userCollaborations.map((collab: any) => ({
      id: collab.projectId,
      name: collab.projectName,
      description: `🔧 Emergency restore from collaboration backup on ${new Date().toLocaleString()}`,
      status: 'not_started' as const,
      priority: 'medium' as const,
      assignedPlayers: [],
      items: [],
      progressPercentage: 0,
      dateCreated: collab.createdAt || new Date(),
      notes: `EMERGENCY RECOVERY: Restored from collaboration backup. Original data may be incomplete. Collaboration ID: ${collab.id}`
    }));

    console.log(`🔧 Step 2: Creating settlement with ${restoredProjects.length} restored projects...`);

    // Create a complete settlement structure
    const restoredSettlement = {
      id: userData.settlement?.id || `settlement-${user.uid}`,
      name: userData.settlement?.name || 'My Settlement',
      dateCreated: userData.settlement?.dateCreated || new Date(),
      players: userData.settlement?.players || [],
      projects: restoredProjects,
      tasks: userData.settlement?.tasks || [],
      inventory: userData.settlement?.inventory || {},
      settings: userData.settlement?.settings || {}
    };

    console.log('🔧 Step 3: Saving restored settlement to Firebase...');
    
    // Force save the restored settlement to Firebase
    await setDoc(userDocRef, {
      ...userData,
      settlement: restoredSettlement,
      lastUpdated: serverTimestamp(),
      version: (userData.version || 0) + 1
    }, { merge: false }); // Use merge: false to ensure complete overwrite

    console.log('✅ Step 4: Settlement saved to Firebase successfully');

    // Now force update the local state
    console.log('🔧 Step 5: Updating local application state...');
    
    // Dynamically import to avoid circular dependencies
    const { useSettlementStore } = await import('../state/useSettlementStore');
    
    // Force set the settlement in the store
    useSettlementStore.getState().setSettlement(restoredSettlement, { force: true });
    
    console.log('✅ Step 6: Local state updated successfully');

    // Show success message
    const message = `✅ EMERGENCY RECOVERY SUCCESSFUL!\n\nRestored ${restoredProjects.length} projects:\n${restoredProjects.map(p => `• ${p.name}`).join('\n')}\n\nPlease refresh the page to see your recovered projects.`;
    
    alert(message);
    console.log('🎉 EMERGENCY RECOVERY COMPLETED SUCCESSFULLY');
    
    return { 
      success: true, 
      message: `Successfully restored ${restoredProjects.length} projects`,
      restoredProjects: restoredProjects.length
    };
    
  } catch (error) {
    console.error('❌ Emergency recovery failed:', error);
    const errorMessage = `Emergency recovery failed: ${error}`;
    alert(`❌ ${errorMessage}\n\nTry refreshing the page and checking the Debug tab for other recovery options.`);
    return { 
      success: false, 
      message: errorMessage 
    };
  }
};

// Make emergency recovery globally available
if (typeof window !== 'undefined') {
  (window as any).emergencyProjectRecovery = quickProjectRecovery;
  (window as any).adminProjectRecovery = adminProjectRecovery;
  (window as any).immediateEmergencyRecovery = immediateEmergencyRecovery;
  
  // Only log availability in development
  if (process.env.NODE_ENV === 'development') {
    console.log('🚨 Emergency Recovery Functions Available:');
    console.log('📱 For regular users: emergencyProjectRecovery()');
    console.log('⚡ For immediate recovery: immediateEmergencyRecovery()');
    console.log('🔑 For admins: adminProjectRecovery()');
    console.log('💡 These functions can be called directly from browser console if needed');
  }
} 