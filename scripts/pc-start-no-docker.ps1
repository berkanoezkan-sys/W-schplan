# Woeschplan start WITHOUT Docker (no virtualization required).
# Uses DATABASE_URL from apps/api/.env (Neon cloud or local PostgreSQL).
# Usage: .\scripts\pc-start-no-docker.ps1
$ErrorActionPreference = "Stop"
$Root = Split-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) -Parent
Set-Location $Root

function Get-NpmCmd {
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($npm) { return $npm.Source }
    return "npm.cmd"
}

function Get-LanIp {
    $ip = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
        Where-Object {
            $_.IPAddress -notlike "127.*" -and
            $_.IPAddress -notlike "169.254.*" -and
            $_.PrefixOrigin -ne "WellKnown"
        } |
        Sort-Object InterfaceMetric |
        Select-Object -First 1 -ExpandProperty IPAddress
    if ($ip) { return $ip }
    $line = ipconfig | Select-String -Pattern "IPv4-Adresse|IPv4 Address" | Select-Object -First 1
    if ($line -match ":\s*(\d+\.\d+\.\d+\.\d+)") { return $Matches[1] }
    return $null
}

$Npm = Get-NpmCmd
$env:WOESCHPLAN_NO_DOCKER = "1"

Write-Host ""
Write-Host "=== Woeschplan Start (ohne Docker) ===" -ForegroundColor Cyan
Write-Host ""

$apiEnv = Join-Path $Root "apps\api\.env"
if (-not (Test-Path $apiEnv)) {
    Copy-Item (Join-Path $Root "apps\api\.env.example") $apiEnv
    Write-Host "apps/api/.env erstellt." -ForegroundColor Yellow
    Write-Host "Bitte DATABASE_URL eintragen (Neon oder PostgreSQL), dann erneut starten."
    Write-Host "Anleitung: docs/OHNE-DOCKER.md"
    exit 1
}

$dbUrl = (Get-Content $apiEnv | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=', '' -replace '"', ''
if (-not $dbUrl -or $dbUrl -match 'woeschplan:woeschplan@localhost') {
    Write-Host "DATABASE_URL fehlt oder ist noch der Docker-Default." -ForegroundColor Yellow
    Write-Host "Trage eine Cloud- oder lokale PostgreSQL-URL in apps/api/.env ein."
    Write-Host "Anleitung: docs/OHNE-DOCKER.md"
    exit 1
}

$Marker = Join-Path $Root ".cursor\pc-restore-complete"
if (-not (Test-Path $Marker)) {
    if (-not $env:WOESCHPLAN_BACKUP_DIR) {
        $env:WOESCHPLAN_BACKUP_DIR = "$env:USERPROFILE\iCloudDrive\Berkans Dokumente\Woeschplan-Migration-Backup"
    }
    $env:WOESCHPLAN_NO_DOCKER = "1"
    & (Join-Path $Root "scripts\pc-restore-from-backup.ps1")
} else {
    Write-Host "-> npm install"
    & $Npm install
}

Write-Host "-> Database migrate + seed"
& $Npm run db:migrate
& $Npm run db:seed

$mobileEnv = Join-Path $Root "apps\mobile\.env"
if (-not (Test-Path $mobileEnv)) {
    Copy-Item (Join-Path $Root "apps\mobile\.env.example") $mobileEnv
}
$lanIp = Get-LanIp
$apiUrl = if ($lanIp) { "http://${lanIp}:3001" } else { "http://localhost:3001" }
$content = Get-Content $mobileEnv -Raw
if ($content -match "(?m)^EXPO_PUBLIC_API_URL=.*") {
    $content = $content -replace "(?m)^EXPO_PUBLIC_API_URL=.*", "EXPO_PUBLIC_API_URL=$apiUrl"
} else {
    $content = $content.TrimEnd() + "`nEXPO_PUBLIC_API_URL=$apiUrl`n"
}
Set-Content $mobileEnv $content -NoNewline
Write-Host "-> Mobile API URL: $apiUrl" -ForegroundColor Green

Write-Host ""
Write-Host "-> Starte API und Expo in zwei Fenstern..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root'; Write-Host 'Woeschplan API :3001' -ForegroundColor Cyan; & '$Npm' run dev:api"
Start-Sleep -Seconds 4
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root\apps\mobile'; `$env:EXPO_PUBLIC_API_URL='$apiUrl'; Write-Host 'Woeschplan Expo :8081' -ForegroundColor Cyan; npx.cmd expo start --host lan"

Write-Host ""
Write-Host "[ok] Zwei Fenster geoeffnet: API + Expo (QR-Code im Expo-Fenster)" -ForegroundColor Green
