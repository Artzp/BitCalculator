import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// ✅ DEVELOPMENT VERSION - BitCraft Dev Project
// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAoxi4c5Y6A4LfqleR9DI5oQghiRC7DEUQ",
  authDomain: "bitcraftcalculator-dev.firebaseapp.com",
  projectId: "bitcraftcalculator-dev",
  storageBucket: "bitcraftcalculator-dev.firebasestorage.app",
  messagingSenderId: "792920262308",
  appId: "1:792920262308:web:94bf8c703a817948220831",
  measurementId: "G-7V7XT9P3P0"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

export default app; 