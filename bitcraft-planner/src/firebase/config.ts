import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ✅ PRODUCTION VERSION - BitCraft Production Project
// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDyMcx_SnoPo6GuHnOFmxQJilD1pUwSvt8",
  authDomain: "bitcraftcalculator.firebaseapp.com",
  projectId: "bitcraftcalculator",
  storageBucket: "bitcraftcalculator.firebasestorage.app",
  messagingSenderId: "14884107436",
  appId: "1:14884107436:web:23bbe07b08c9f5aceedb09"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app; 