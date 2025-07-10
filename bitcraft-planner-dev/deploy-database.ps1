# BitCraft Calculator - Database Deploy Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  BitCraft Calculator - Database Deploy" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Attempting to deploy Firestore rules and indexes..." -ForegroundColor Yellow
Write-Host ""

try {
    firebase deploy --only firestore
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  DATABASE CONFIGURATION DEPLOYED!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Your database is now configured with:" -ForegroundColor White
        Write-Host "- Security rules" -ForegroundColor White
        Write-Host "- Performance indexes" -ForegroundColor White
        Write-Host "- Multiple collections support" -ForegroundColor White
        Write-Host ""
        Write-Host "Database Features Available:" -ForegroundColor Cyan
        Write-Host "✅ User data persistence" -ForegroundColor Green
        Write-Host "✅ Community build sharing" -ForegroundColor Green
        Write-Host "✅ User settings" -ForegroundColor Green
        Write-Host "✅ Game data integration" -ForegroundColor Green
        Write-Host "✅ Real-time synchronization" -ForegroundColor Green
    } else {
        throw "Deployment failed"
    }
} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  DATABASE SETUP NEEDED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please complete these steps:" -ForegroundColor Yellow
    Write-Host "1. Go to Firebase Console: https://console.firebase.google.com/project/bitcraftcalculator/firestore" -ForegroundColor White
    Write-Host "2. Click 'Create database'" -ForegroundColor White
    Write-Host "3. Choose 'Start in production mode'" -ForegroundColor White
    Write-Host "4. Select your region and click 'Enable'" -ForegroundColor White
    Write-Host "5. Wait a few minutes, then run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "Alternative:" -ForegroundColor Cyan
    Write-Host "- Enable Firestore API at: https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=bitcraftcalculator" -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Read-Host "Press Enter to exit" 