# BitCraft Calculator - Firebase Deploy Script
# Run this script from the bitcraft-planner directory

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BitCraft Calculator - Firebase Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: package.json not found!" -ForegroundColor Red
    Write-Host "Please run this script from the bitcraft-planner directory" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if firebase CLI is installed
try {
    firebase --version | Out-Null
    Write-Host "✓ Firebase CLI found" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Firebase CLI not found!" -ForegroundColor Red
    Write-Host "Please install it with: npm install -g firebase-tools" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

# Check if user is logged in to Firebase
try {
    firebase projects:list | Out-Null
    Write-Host "✓ Firebase authentication verified" -ForegroundColor Green
} catch {
    Write-Host "ERROR: Not logged in to Firebase!" -ForegroundColor Red
    Write-Host "Please run: firebase login" -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Building the React app..." -ForegroundColor Yellow
Write-Host ""

# Build the app
try {
    npm run build
    if ($LASTEXITCODE -ne 0) {
        throw "Build failed with exit code $LASTEXITCODE"
    }
    Write-Host "✓ Build successful!" -ForegroundColor Green
} catch {
    Write-Host ""
    Write-Host "ERROR: Build failed!" -ForegroundColor Red
    Write-Host "Please check the error messages above." -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Deploying to Firebase..." -ForegroundColor Yellow
Write-Host ""

# Deploy to Firebase
try {
    firebase deploy --only hosting
    if ($LASTEXITCODE -ne 0) {
        throw "Deployment failed with exit code $LASTEXITCODE"
    }
} catch {
    Write-Host ""
    Write-Host "ERROR: Deployment failed!" -ForegroundColor Red
    Write-Host "Please check the error messages above." -ForegroundColor Red
    Write-Host ""
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Green
Write-Host "  SUCCESS! App deployed to Firebase!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Your app is live at: https://bitcraftcalculator.web.app" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to exit"