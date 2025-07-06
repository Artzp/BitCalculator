# 🚀 BitCraft Calculator - Deployment Guide

This guide explains all the different ways to deploy your BitCraft Calculator to Firebase hosting.

## ⚡ Quick Deploy Options

### 1. **Double-Click Deploy (Easiest)**

**From the root directory:**
- **Windows**: Double-click `deploy-bitcraft.bat`
- **PowerShell**: Right-click `deploy-bitcraft.ps1` → "Run with PowerShell"

**From the bitcraft-planner directory:**
- **Windows**: Double-click `deploy.bat`
- **PowerShell**: Right-click `deploy.ps1` → "Run with PowerShell"

### 2. **NPM Scripts (Command Line)**

Navigate to the `bitcraft-planner` directory first:
```bash
cd bitcraft-planner
```

Then use any of these npm scripts:
```bash
# Standard deployment (build + deploy)
npm run deploy:safe

# Deploy with force (overrides any conflicts)
npm run deploy:force

# Deploy everything (not just hosting)
npm run deploy

# Deploy hosting only (faster)
npm run deploy:hosting
```

### 3. **Manual Commands**

```bash
# Navigate to the project directory
cd bitcraft-planner

# Build the app
npm run build

# Deploy to Firebase
firebase deploy --only hosting
```

## 🔧 Script Features

All deployment scripts include:
- ✅ **Directory checking** - Ensures you're in the right folder
- ✅ **Firebase CLI verification** - Checks if Firebase tools are installed
- ✅ **Authentication check** - Verifies you're logged in to Firebase
- ✅ **Build verification** - Confirms the build was successful
- ✅ **Error handling** - Shows helpful error messages
- ✅ **Success confirmation** - Shows your live app URL

## 🛠️ Prerequisites

Before deploying, ensure you have:
1. **Firebase CLI installed**: `npm install -g firebase-tools`
2. **Firebase login**: `firebase login`
3. **Node.js and npm** installed

## 🌐 Your Live App

After successful deployment, your app will be available at:
**https://bitcraftcalculator.web.app**

## 🚨 Troubleshooting

### Common Issues:

1. **"package.json not found"**
   - Make sure you're running the script from the correct directory
   - Use the root directory scripts if you're unsure

2. **"Firebase CLI not found"**
   - Install Firebase CLI: `npm install -g firebase-tools`
   - Restart your terminal/command prompt

3. **"Not logged in to Firebase"**
   - Run: `firebase login`
   - Follow the authentication process

4. **"Build failed"**
   - Check for TypeScript errors in your code
   - Run `npm install` to ensure all dependencies are installed

5. **"Deployment failed"**
   - Check your internet connection
   - Verify your Firebase project permissions
   - Try the `deploy:force` script

### Getting Help:

If you encounter issues:
1. Check the error messages in the terminal
2. Try running `npm install` in the bitcraft-planner directory
3. Verify your Firebase project is set up correctly
4. Check the Firebase Console for any issues

## 📝 Available Scripts Summary

| Script | Location | Purpose |
|--------|----------|---------|
| `deploy-bitcraft.bat` | Root | Quick deploy from anywhere |
| `deploy-bitcraft.ps1` | Root | PowerShell quick deploy |
| `deploy.bat` | bitcraft-planner | Full deployment with checks |
| `deploy.ps1` | bitcraft-planner | PowerShell deployment |
| `npm run deploy:safe` | bitcraft-planner | Safe deployment |
| `npm run deploy:force` | bitcraft-planner | Force deployment |

Choose the method that works best for your workflow! 🎉 