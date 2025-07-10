# 🔥 Firebase Setup Guide

## ✅ Step 1: Firebase Project Created!
Your Firebase project "bitcraftcalculator" has already been created!
- **Project ID**: bitcraftcalculator
- **Console**: https://console.firebase.google.com/project/bitcraftcalculator/overview

## Step 2: Enable Google Authentication
1. In Firebase Console, go to "Authentication"
2. Click "Get started"
3. Go to "Sign-in method" tab
4. **Enable "Google" provider**:
   - Click on "Google" provider
   - Toggle "Enable" switch to ON
   - Enter your project support email: `art.leshchyna@gmail.com`
   - Click "Save"

**Note**: This project uses Google authentication only for a simpler, more secure user experience.

## Step 3: Create Firestore Database
1. In Firebase Console, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (we'll secure it later)
4. Select your preferred location

## Step 4: Set Up Security Rules
1. In Firestore Database, go to "Rules" tab
2. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

## Step 5: Get Firebase Configuration
1. Go to Firebase Console: https://console.firebase.google.com/project/bitcraftcalculator/overview
2. Click "Project Settings" (gear icon)
3. Scroll down to "Your apps" section
4. Click "Web" icon (</>) to add a web app
5. Enter app name: "BitCraft Calculator"
6. Copy the `firebaseConfig` object values
7. Replace the placeholder values in `src/firebase/config.ts`

## Step 6: Update Configuration
Replace the placeholder values in `src/firebase/config.ts` with your actual Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key", // Copy from Firebase Console
  authDomain: "bitcraftcalculator.firebaseapp.com", // ✅ Already set
  projectId: "bitcraftcalculator", // ✅ Already set
  storageBucket: "bitcraftcalculator.appspot.com", // ✅ Already set
  messagingSenderId: "your-messaging-sender-id", // Copy from Firebase Console
  appId: "your-app-id" // Copy from Firebase Console
};
```

## Step 7: Test the Setup
1. Visit your live app: https://bitcraftcalculator.web.app
2. Click "Sign In" and authenticate with Google
3. Check if data persists after refresh
4. Verify data appears in Firestore Console

### 🔑 Authentication Options Available:
- **Google Sign-In**: One-click authentication with Google accounts
- **Note**: Email/password authentication is no longer used in this project for a simpler, more secure user experience.

## 🚀 Firebase Hosting Deployment

### Automatic Deployment (Recommended)
Your app is set up with GitHub Actions for automatic deployment:
1. Push changes to your main branch
2. GitHub Actions will automatically build and deploy to Firebase Hosting
3. Your app will be available at: https://bitcraftcalculator.web.app

### Manual Deployment
You can also deploy manually:
1. Run `npm run deploy` to build and deploy
2. Or run `firebase deploy --only hosting` to deploy only hosting

### Custom Domain (Optional)
To use a custom domain:
1. In Firebase Console, go to Hosting
2. Click "Add custom domain"
3. Follow the DNS configuration instructions

## 🔒 Security Notes

- The security rules only allow authenticated users to access their own data
- Never commit your Firebase config with real values to public repositories
- Consider using environment variables for sensitive data 