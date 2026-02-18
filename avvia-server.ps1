# Avvia il server Next.js e apre il browser su http://localhost:3000
# Doppio click o da PowerShell: .\avvia-server.ps1

$nodePath = "$env:LOCALAPPDATA\nodejs-portable\node-v22.14.0-win-x64"
$ledgeraPath = "c:\Users\104040\OneDrive\AI\Ledgera\ledgera"

$serverCmd = @"
`$env:Path = '$nodePath;' + `$env:Path
Set-Location '$ledgeraPath'
Write-Host 'Avvio server Next.js...' -ForegroundColor Cyan
npm run dev
"@

# Avvia il server in una nuova finestra (resta aperta con i log)
Start-Process powershell -ArgumentList "-NoExit", "-Command", $serverCmd

# Attendi che Next.js sia pronto
Write-Host "Attendo avvio server (circa 15 secondi)..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Apri il browser
Start-Process "http://localhost:3000"
Write-Host "Browser aperto su http://localhost:3000" -ForegroundColor Green
