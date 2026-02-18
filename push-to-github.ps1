# Script per mandare il codice su GitHub (e far partire il deploy su Vercel)
# Esegui: tasto destro su questo file -> "Esegui con PowerShell"
# oppure da PowerShell: .\push-to-github.ps1

Set-Location $PSScriptRoot

Write-Host "=== Ledgera - Push su GitHub ===" -ForegroundColor Cyan
Write-Host ""

# Verifica git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "ERRORE: Git non trovato. Installa Git da https://git-scm.com/download/win" -ForegroundColor Red
    pause
    exit 1
}

Write-Host "1. Remote configurato:" -ForegroundColor Yellow
git remote -v
Write-Host ""

Write-Host "2. Invio del codice su GitHub (branch main)..." -ForegroundColor Yellow
Write-Host ""
Write-Host "   Se chiede Username: inserisci il tuo nome utente GitHub (es. armtac)" -ForegroundColor Gray
Write-Host "   Se chiede Password: NON usare la password del sito." -ForegroundColor Gray
Write-Host "   Usa un Personal Access Token:" -ForegroundColor Gray
Write-Host "   - Vai su https://github.com/settings/tokens" -ForegroundColor Gray
Write-Host "   - Generate new token (classic), spunta 'repo', genera e copia il token." -ForegroundColor Gray
Write-Host "   - Incolla il token quando chiede la password." -ForegroundColor Gray
Write-Host ""

git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== Fatto. Il codice e' su GitHub." -ForegroundColor Green
    Write-Host "Vercel dovrebbe avviare il deploy da solo in pochi secondi." -ForegroundColor Green
    Write-Host "Controlla su: https://vercel.com -> progetto ledgera -> Deployments" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Push fallito. Controlla username/token e riprova." -ForegroundColor Red
}

Write-Host ""
pause
