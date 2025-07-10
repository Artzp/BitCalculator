# 🚨 DEVELOPMENT VERSION - SETUP REQUIRED 🚨

This is a **DEVELOPMENT COPY** of the BitCraft Calculator. It has been made safe to prevent accidental overwrites to production.

## ⚠️ IMPORTANT SAFETY MEASURES APPLIED ⚠️

1. **Firebase Config Removed**: Production Firebase keys have been removed from `src/firebase/config.ts`
2. **Deployment Target Changed**: `.firebaserc` points to a non-existent project name
3. **Dependencies Missing**: `node_modules` folder was not copied

## 🔧 SETUP STEPS REQUIRED

### 1. Install Dependencies
```powershell
npm install
```

### 2. Create Development Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project: `bitcraftcalculator-dev` (or similar)
3. Enable Authentication (Google, Email/Password)
4. Enable Firestore Database
5. Copy the config from Project Settings > General > Your apps

### 3. Update Firebase Configuration
Replace the placeholder values in `src/firebase/config.ts` with your **development** project config:
```typescript
const firebaseConfig = {
  apiKey: "your-dev-api-key",
  authDomain: "your-dev-project.firebaseapp.com", 
  projectId: "your-dev-project-id",
  // ... other config values
};
```

### 4. Update Deployment Target
In `.firebaserc`, change the project name to your development project:
```json
{
  "projects": {
    "default": "your-dev-project-id"
  }
}
```

### 5. Set Up Firestore Security Rules
Copy the security rules from the production version or start with basic development rules.

## 🎯 DEVELOPMENT GOALS

This development environment is set up to build:
- **Task Assignment System**: Assign specific tasks to settlement members
- **Contribution Tracking**: Track who contributed what materials 
- **Admin Dashboard**: View contributions, approve submissions, leaderboards
- **Player Interface**: Submit contributions, view assigned tasks

## 🔒 SAFETY NOTES

- This version CANNOT accidentally connect to production
- This version CANNOT accidentally deploy to production
- Always test features here before moving to production
- Keep production Firebase keys separate and secure

---
**Start Development**: After setup, run `npm start` to begin development! 