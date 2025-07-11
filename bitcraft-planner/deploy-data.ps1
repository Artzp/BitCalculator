try {
    # Using firebase-tools to upload the file
    firebase database:set $databaseNode $dataFile --project bitcraftcalculator -y
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "  DATA DEPLOYED SUCCESSFULLY!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "The file '$dataFile' has been uploaded to the '$databaseNode' node in your Firebase Realtime Database." -ForegroundColor White
        Write-Host ""
    } else {
        throw "Data deployment failed"
    }
} catch {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "  DATA DEPLOYMENT FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check the following:" -ForegroundColor Yellow
    Write-Host "1. You are logged into Firebase (firebase login)" -ForegroundColor White
    Write-Host "2. The project 'bitcraftcalculator' exists and you have access." -ForegroundColor White
    Write-Host "3. The path to the data file is correct." -ForegroundColor White
    Write-Host ""
}

Write-Host ""
Read-Host "Press Enter to exit" 