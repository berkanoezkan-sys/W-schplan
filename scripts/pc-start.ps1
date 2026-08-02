# One-click PC restore + dev stack for Woeschplan.
# Double-click pc-start.bat or run: .\scripts\pc-start.ps1
$ErrorActionPreference = "Stop"
$Root = Split-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) -Parent
Set-Location $Root

function Get-NpmCmd {
    $npm = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if ($npm) { return $npm.Source }
    return "npm.cmd"
}

$Npm = Get-NpmCmd

if (-not $env:WOESCHPLAN_BACKUP_DIR) {
    $env:WOESCHPLAN_BACKUP_DIR = "$env:USERPROFILE\iCloudDrive\Berkans Dokumente\Woeschplan-Migration-Backup"
}

Write-Host ""
Write-Host "=== Woeschplan PC Start ===" -ForegroundColor Cyan
Write-Host "Repo:   $Root"
Write-Host "Backup: $env:WOESCHPLAN_BACKUP_DIR"
Write-Host ""

$Marker = Join-Path $Root ".cursor\pc-restore-complete"
if (-not (Test-Path $Marker)) {
    & (Join-Path $Root "scripts\pc-restore-from-backup.ps1")
} else {
    Write-Host "-> Restore already done ($Marker) - skipping full restore" -ForegroundColor DarkGray
    Write-Host "-> npm install"
    & $Npm install
    Write-Host "-> Docker Postgres"
    docker compose up -d
    Start-Sleep -Seconds 3
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

$mobileEnv = Join-Path $Root "apps\mobile\.env"
if (-not (Test-Path $mobileEnv)) {
    Copy-Item (Join-Path $Root "apps\mobile\.env.example") $mobileEnv
}
$lanIp = Get-LanIp
if ($lanIp) {
    $expected = "http://${lanIp}:3001"
    $content = Get-Content $mobileEnv -Raw
    if ($content -match "(?m)^EXPO_PUBLIC_API_URL=.*") {
        $content = $content -replace "(?m)^EXPO_PUBLIC_API_URL=.*", "EXPO_PUBLIC_API_URL=$expected"
    } else {
        $content = $content.TrimEnd() + "`nEXPO_PUBLIC_API_URL=$expected`n"
    }
    Set-Content $mobileEnv $content -NoNewline
    Write-Host "-> Updated apps/mobile/.env EXPO_PUBLIC_API_URL=$expected" -ForegroundColor Green
}

$bash = @(
    "$env:ProgramFiles\Git\bin\bash.exe",
    "${env:ProgramFiles(x86)}\Git\bin\bash.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1

Write-Host ""
Write-Host "-> Starting dev stack (Postgres + API :3001 + Expo :8081)..." -ForegroundColor Cyan
Write-Host "  Press Ctrl+C to stop Expo; close this window to end the session."
Write-Host ""

if ($bash) {
    & $bash (Join-Path $Root "scripts\dev-up.sh")
} else {
    Write-Host "Git Bash not found - starting API and Expo manually." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$Root'; & '$Npm' run dev:api"
    Start-Sleep -Seconds 5
    $env:EXPO_PUBLIC_API_URL = if ($lanIp) { "http://${lanIp}:3001" } else { "http://localhost:3001" }
    Set-Location (Join-Path $Root "apps\mobile")
    npx.cmd expo start --host lan
}
