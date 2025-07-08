import React, { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';

const DataExporter: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportData, setExportData] = useState<any>(null);

  const exportAllData = async () => {
    setIsExporting(true);
    try {
      const data: any = {};
      
      // Export users collection
      console.log('📥 Exporting users...');
      const usersSnapshot = await getDocs(collection(db, 'users'));
      data.users = [];
      usersSnapshot.forEach(doc => {
        data.users.push({ id: doc.id, ...doc.data() });
      });
      
      // Export projectCollaborations
      console.log('📥 Exporting projectCollaborations...');
      const collabsSnapshot = await getDocs(collection(db, 'projectCollaborations'));
      data.projectCollaborations = [];
      collabsSnapshot.forEach(doc => {
        data.projectCollaborations.push({ id: doc.id, ...doc.data() });
      });
      
      // Export sharedProjects
      console.log('📥 Exporting sharedProjects...');
      const sharedSnapshot = await getDocs(collection(db, 'sharedProjects'));
      data.sharedProjects = [];
      sharedSnapshot.forEach(doc => {
        data.sharedProjects.push({ id: doc.id, ...doc.data() });
      });
      
      setExportData(data);
      
      // Download as JSON file
      const dataStr = JSON.stringify(data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `firestore-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
      link.click();
      URL.revokeObjectURL(url);
      
      console.log('✅ Export complete!');
      console.log('📊 Data exported:', {
        users: data.users.length,
        collaborations: data.projectCollaborations.length,
        sharedProjects: data.sharedProjects.length
      });
      
    } catch (error) {
      console.error('❌ Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const createNormalizedDemo = async () => {
    if (!window.confirm('This will create demo normalized collections in your database to show the new structure. Continue?')) {
      return;
    }

    try {
      console.log('🚀 Creating normalized database demo...');
      
      // Get current user from Firebase auth
      const { auth } = await import('../firebase/config');
      const user = auth.currentUser;
      
      if (!user) {
        alert('Please log in first.');
        return;
      }
      
      const { firebaseService } = await import('../services/firebaseService');
      const userData = await firebaseService.loadUserData(user.uid);
      
      if (!userData || !userData.settlement) {
        alert('No user data found. Please log in first.');
        return;
      }

      const db = (await import('../firebase/config')).db;
      const { doc, setDoc, collection, serverTimestamp } = await import('firebase/firestore');
      
      // Create normalized collections as demo
      const userId = user.uid;
      
      // 1. Users_v2 collection - normalized user data
      const normalizedUser = {
        id: userId,
        email: userData.userProfile?.email || 'demo@example.com',
        displayName: userData.userProfile?.displayName || 'Demo User',
        photoURL: userData.userProfile?.photoURL || '',
        emailVerified: userData.userProfile?.emailVerified || false,
        providerId: 'demo',
        createdAt: serverTimestamp(),
        lastSignIn: serverTimestamp(),
        defaultSettlementId: `settlement-${userId}`,
        preferences: {
          theme: 'auto',
          language: 'en',
          timezone: 'UTC',
          notifications: {
            email: true,
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
          totalProjects: userData.settlement.projects?.length || 0,
          totalCollaborations: 0,
          lastActiveAt: serverTimestamp(),
          version: 1
        }
      };
      
      await setDoc(doc(db, 'users_v2', userId), normalizedUser);
      console.log('✅ Created normalized user document');
      
      // 2. Settlements_v2 collection - normalized settlement data
      const normalizedSettlement = {
        id: `settlement-${userId}`,
        name: userData.settlement.name || 'Demo Settlement',
        description: 'Migrated settlement from legacy embedded structure',
        ownerId: userId,
        inventory: userData.inventory || {},
        settings: {
          isPublic: false,
          allowCollaborations: true,
          defaultProjectVisibility: 'private',
          inventoryManagement: {
            enableReservations: true,
            allowOvercommit: false,
            trackingEnabled: true
          }
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        metadata: {
          totalProjects: userData.settlement.projects?.length || 0,
          totalTasks: userData.settlement.tasks?.length || 0,
          totalItems: Object.keys(userData.inventory || {}).length,
          totalCollaborators: 1,
          version: 1
        }
      };
      
      await setDoc(doc(db, 'settlements_v2', `settlement-${userId}`), normalizedSettlement);
      console.log('✅ Created normalized settlement document');
      
      // 3. Projects_v2 collection - independent project documents
      if (userData.settlement.projects?.length > 0) {
        for (const project of userData.settlement.projects) {
          const normalizedProject = {
            id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            name: project.name,
            description: project.description || '',
            status: project.status || 'active',
            ownerId: userId,
            settlementId: `settlement-${userId}`,
            items: project.items || [],
            visibility: 'private',
            permissions: {
              [userId]: 'owner'
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            metadata: {
              totalItems: project.items?.length || 0,
              estimatedCost: 0,
              priority: 'medium',
              tags: ['migrated'],
              version: 1
            }
          };
          
          await setDoc(doc(db, 'projects_v2', normalizedProject.id), normalizedProject);
        }
        console.log(`✅ Created ${userData.settlement.projects.length} normalized project documents`);
      }
      
              // 4. Tasks_v2 collection - independent task documents  
        if (userData.settlement.tasks?.length > 0) {
          for (const task of userData.settlement.tasks) {
            const normalizedTask = {
              id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              title: (task as any).name || (task as any).title || 'Migrated Task',
              description: (task as any).notes || (task as any).description || '',
              type: 'general',
              status: 'pending',
              priority: 'medium',
              projectId: task.projectId || null,
              assignedTo: userId,
              createdBy: userId,
              settlementId: `settlement-${userId}`,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              metadata: {
                tags: ['migrated'],
                estimatedHours: 1,
                version: 1
              }
            };
            
            await setDoc(doc(db, 'tasks_v2', normalizedTask.id), normalizedTask);
          }
          console.log(`✅ Created ${userData.settlement.tasks.length} normalized task documents`);
        }
      
      alert(`🎉 Normalized database demo created successfully!\n\nNew collections:\n• users_v2\n• settlements_v2\n• projects_v2\n• tasks_v2\n\nCheck your Firestore console to see the new normalized structure!`);
      
    } catch (error) {
      console.error('❌ Error creating normalized demo:', error);
      alert(`Error creating normalized demo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h2 className="text-xl font-bold text-yellow-800 mb-4">
          🗄️ Database Backup Exporter
        </h2>
        
        <p className="text-yellow-700 mb-4">
          Export current Firestore data before migration to normalized structure.
        </p>
        
        <button
          onClick={exportAllData}
          disabled={isExporting}
          className={`px-4 py-2 rounded-md font-semibold ${
            isExporting
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-yellow-600 text-white hover:bg-yellow-700'
          }`}
        >
          {isExporting ? (
            <span className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Exporting...
            </span>
          ) : (
            '📥 Export Database to JSON'
          )}
        </button>
        
        {exportData && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
            <h3 className="font-semibold text-green-800">✅ Export Complete!</h3>
            <p className="text-green-700">
              Exported {exportData.users?.length || 0} users, {' '}
              {exportData.projectCollaborations?.length || 0} collaborations, {' '}
              {exportData.sharedProjects?.length || 0} shared projects
            </p>
            <p className="text-sm text-green-600 mt-1">
              JSON file downloaded to your downloads folder.
            </p>
          </div>
        )}
      </div>

      <div className="border-t pt-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          🔄 Database Normalization Demo
        </h3>
        <p className="text-sm text-gray-600 mb-3">
          Create normalized collections to see how the new database structure would look.
          This will not affect your existing data.
        </p>
        <button
          onClick={createNormalizedDemo}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          Create Normalized Demo
        </button>
      </div>
    </div>
  );
};

export default DataExporter; 