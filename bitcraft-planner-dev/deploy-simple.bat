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

echo Starting deployment...
echo.

:: Use the npm script that we know works
npm run deploy:safe

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   SUCCESS! App deployed to Firebase!
    echo ========================================
    echo.
    echo Your app is live at: https://bitcraftcalculator.web.app
) else (
    echo.
    echo ========================================
    echo   DEPLOYMENT FAILED!
    echo ========================================
    echo.
    echo Please check the error messages above.
)

echo.
echo Press any key to exit...
pause >nul 