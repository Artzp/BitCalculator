@echo off
echo ========================================
echo   BitCraft Calculator - Quick Deploy
echo ========================================
echo.

:: Navigate to the bitcraft-planner directory
cd /d "%~dp0\bitcraft-planner"

:: Check if we successfully navigated to the right directory
if not exist "package.json" (
    echo ERROR: Could not find bitcraft-planner directory!
    echo Please ensure this script is in the root of your BitCalculator project.
    echo.
    pause
    exit /b 1
)

echo Navigated to bitcraft-planner directory ✓
echo.

:: Call the deployment script
call deploy.bat 