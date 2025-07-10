# BitCraft Calculator - Quick Deploy from Root Directory
# This script can be run from the root directory

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BitCraft Calculator - Quick Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Get the script directory and navigate to bitcraft-planner
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Definition
$targetPath = Join-Path $scriptPath "bitcraft-planner"

Write-Host "Navigating to bitcraft-planner directory..." -ForegroundColor Yellow
Set-Location $targetPath

# Check if we successfully navigated to the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: Could not find bitcraft-planner directory!" -ForegroundColor Red
    Write-Host "Please ensure this script is in the root of your BitCalculator project." -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host "✓ Found bitcraft-planner directory" -ForegroundColor Green
Write-Host ""

# Execute the deployment script
& ".\deploy.ps1" 