@echo off
echo ========================================
echo   BitCraft Calculator - Database Deploy
echo ========================================
echo.

echo Attempting to deploy Firestore rules and indexes...
echo.

firebase deploy --only firestore

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   DATABASE CONFIGURATION DEPLOYED!
    echo ========================================
    echo.
    echo Your database is now configured with:
    echo - Security rules
    echo - Performance indexes
    echo - Multiple collections support
    echo.
) else (
    echo.
    echo ========================================
    echo   DATABASE SETUP NEEDED
    echo ========================================
    echo.
    echo Please complete these steps:
    echo 1. Go to Firebase Console: https://console.firebase.google.com/project/bitcraftcalculator/firestore
    echo 2. Click "Create database"
    echo 3. Choose "Start in production mode"
    echo 4. Select your region and click "Enable"
    echo 5. Wait a few minutes, then run this script again
    echo.
)

echo.
echo Press any key to exit...
pause >nul 