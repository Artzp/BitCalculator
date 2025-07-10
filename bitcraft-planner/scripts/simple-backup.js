// ============================================================================
// SIMPLE DATABASE BACKUP SCRIPT
// ============================================================================
// Quick backup script to export Firestore data to JSON
// ============================================================================

const fs = require('fs');
const path = require('path');

// Simple JSON export for manual backup
async function createBackupInstructions() {
  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const backupDir = `database-backup-${timestamp}`;
  
  // Create backup directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
  }
  
  // Create instructions file
  const instructions = `
DATABASE BACKUP INSTRUCTIONS
============================

Date: ${new Date().toISOString()}
Project: BitCraft Settlement Management
Database: Firestore (bitcraftcalculator)

COLLECTIONS TO BACKUP:
1. users - Main user data with embedded settlements
2. projectCollaborations - Collaboration data  
3. sharedProjects - Shared project data

BACKUP METHODS:

Method 1: Firebase Console (Recommended)
---------------------------------------
1. Go to: https://console.firebase.google.com/project/bitcraftcalculator/firestore/data
2. Click on each collection (users, projectCollaborations, sharedProjects)
3. Use browser dev tools to extract data, or:
4. Use the Firebase Admin SDK export (requires service account)

Method 2: Manual Export via Code
-------------------------------
You can add this to your app temporarily to export data:

import { collection, getDocs } from 'firebase/firestore';
import { db } from './firebase/config';

async function exportCollection(collectionName) {
  const snapshot = await getDocs(collection(db, collectionName));
  const data = [];
  snapshot.forEach(doc => {
    data.push({ id: doc.id, ...doc.data() });
  });
  console.log(\`\${collectionName}:\`, JSON.stringify(data, null, 2));
}

exportCollection('users');
exportCollection('projectCollaborations'); 
exportCollection('sharedProjects');

Method 3: Firebase CLI Export (if available)
-------------------------------------------
gcloud firestore export gs://[BUCKET_NAME]/exports/[EXPORT_PREFIX]

RESTORATION:
-----------
Save the exported JSON files in this directory for restoration if needed.

Current Status: 
- Legacy embedded database structure 
- Ready to migrate to normalized structure
- New collections will be: users_v2, settlements_v2, projects_v2, tasks_v2, etc.
`;
  
  fs.writeFileSync(path.join(backupDir, 'backup-instructions.txt'), instructions);
  
  console.log('📁 Backup directory created:', backupDir);
  console.log('📋 Backup instructions saved');
  console.log('🚨 IMPORTANT: Please backup your Firestore data before proceeding with migration!');
  
  return backupDir;
}

// Create backup instructions
createBackupInstructions()
  .then((backupDir) => {
    console.log('✅ Backup setup complete');
    console.log('📁 Location:', backupDir);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
  }); 