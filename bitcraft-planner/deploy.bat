@echo off
echo ========================================
echo   BitCraft Calculator - Firebase Deploy
echo ========================================
echo.

:: Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: package.json not found!
    echo Please run this script from the bitcraft-planner directory
    echo.
    pause
    exit /b 1
)

:: Check if firebase CLI is installed
firebase --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Firebase CLI not found!
    echo Please install it with: npm install -g firebase-tools
    echo.
    pause
    exit /b 1
)

:: Check if user is logged in to Firebase
firebase projects:list >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Not logged in to Firebase!
    echo Please run: firebase login
    echo.
    pause
    exit /b 1
)

echo Building the React app...
echo.
npm run build
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Build failed!
    echo Please check the error messages above.
    echo.
    pause
    exit /b 1
)

echo.
echo Build successful! Deploying to Firebase...
echo.
firebase deploy --only hosting
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Deployment failed!
    echo Please check the error messages above.
    echo.
    pause
    exit /b 1
)

echo.
echo Deploying data...
powershell -File ./deploy-data.ps1

echo.
echo ========================================
echo   SUCCESS! App deployed to Firebase!
echo ========================================
echo.
echo Your app is live at: https://bitcraftcalculator.web.app
echo.
echo Press any key to exit...
pause >nul 