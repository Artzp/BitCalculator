// ============================================================================
// DATABASE BACKUP SCRIPT
// ============================================================================
// Exports current Firestore data to JSON files for backup before migration
// ============================================================================

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('../src/firebase/config.js');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    databaseURL: 'https://bitcraftcalculator-default-rtdb.firebaseio.com'
  });
}

const db = admin.firestore();

async function backupCollection(collectionName) {
  console.log(`📥 Backing up collection: ${collectionName}`);
  
  try {
    const snapshot = await db.collection(collectionName).get();
    const documents = [];
    
    snapshot.forEach(doc => {
      documents.push({
        id: doc.id,
        data: doc.data()
      });
    });
    
    const backupDir = `./database-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`;
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir);
    }
    
    const filePath = path.join(backupDir, `${collectionName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(documents, null, 2));
    
    console.log(`✅ Backed up ${documents.length} documents from ${collectionName}`);
    return documents.length;
    
  } catch (error) {
    console.error(`❌ Error backing up ${collectionName}:`, error);
    return 0;
  }
}

async function backupDatabase() {
  console.log('🚀 Starting database backup...');
  
  const collections = [
    'users',
    'projectCollaborations', 
    'sharedProjects'
  ];
  
  let totalDocuments = 0;
  
  for (const collection of collections) {
    const count = await backupCollection(collection);
    totalDocuments += count;
  }
  
  console.log(`🎉 Backup complete! Total documents backed up: ${totalDocuments}`);
  console.log(`📁 Backup location: ./database-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}`);
}

// Run the backup
backupDatabase()
  .then(() => {
    console.log('✅ Database backup completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database backup failed:', error);
    process.exit(1);
  }); 