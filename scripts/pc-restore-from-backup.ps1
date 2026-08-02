# Restore Wöschplan on a new PC from iCloud migration backup.
# Usage: .\scripts\pc-restore-from-backup.ps1
$ErrorActionPreference = "Stop"
$Root = Split-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) -Parent
Set-Location $Root
$Marker = Join-Path $Root ".cursor\pc-restore-complete"

function Test-BackupRoot($Path) {
    return Test-Path (Join-Path $Path "backup\env")
}

function Resolve-BackupRoot($Path) {
    if (-not (Test-Path $Path)) { return $null }
    if (Test-BackupRoot $Path) { return $Path }

    $latest = Join-Path $Path "latest"
    if (Test-Path $latest) {
        $resolved = Resolve-BackupRoot $latest
        if ($resolved) { return $resolved }
    }

    $newest = Get-ChildItem $Path -Directory -ErrorAction SilentlyContinue |
        Where-Object { Test-BackupRoot $_.FullName } |
        Sort-Object Name -Descending |
        Select-Object -First 1
    if ($newest) { return $newest.FullName }

    return $null
}

function Find-Backup {
    if ($env:WOESCHPLAN_BACKUP_DIR) {
        $resolved = Resolve-BackupRoot $env:WOESCHPLAN_BACKUP_DIR
        if ($resolved) { return $resolved }
    }

    $user = $env:USERNAME
    $candidates = @(
        "$env:USERPROFILE\iCloudDrive\Berkans Dokumente\Woeschplan-Migration-Backup",
        "$env:USERPROFILE\iCloudDrive\Berkans Dokumente\Woeschplan-Migration-Backup\latest",
        "C:\Users\$user\iCloudDrive\Berkans Dokumente\Woeschplan-Migration-Backup",
        "C:\Users\$user\iCloudDrive\Berkans Dokumente\Woeschplan-Migration-Backup\latest"
    )
    foreach ($dir in $candidates) {
        $resolved = Resolve-BackupRoot $dir
        if ($resolved) { return $resolved }
    }
    return $null
}

Write-Host "→ Wöschplan PC restore" -ForegroundColor Cyan
$Backup = Find-Backup
if (-not $Backup) {
    Write-Host "Backup not found. Wait for iCloud sync, then run:" -ForegroundColor Yellow
    Write-Host '  $env:WOESCHPLAN_BACKUP_DIR = "C:\Users\moezkan\iCloudDrive\Berkans Dokumente\Woeschplan-Migration-Backup"'
    exit 1
}
Write-Host "  Backup: $Backup"

New-Item -ItemType Directory -Force -Path (Join-Path $Root ".cursor") | Out-Null

$apiEnv = Join-Path $Backup "backup\env\apps-api.env"
$mobileEnv = Join-Path $Backup "backup\env\apps-mobile.env"
$chatExport = Join-Path $Backup "woeschplan-cursor-chats.cursor-chat.json"

if (Test-Path $apiEnv) {
    Copy-Item $apiEnv (Join-Path $Root "apps\api\.env") -Force
    Write-Host "  ✓ apps/api/.env restored"
}
if (Test-Path $mobileEnv) {
    Copy-Item $mobileEnv (Join-Path $Root "apps\mobile\.env") -Force
    Write-Host "  ✓ apps/mobile/.env restored (update LAN IP with ipconfig)"
}
if (Test-Path $chatExport) {
    Copy-Item $chatExport (Join-Path $Root ".cursor\woeschplan-cursor-chats.cursor-chat.json") -Force
    Write-Host "  ✓ Chat export copied to .cursor/"
}

Write-Host "→ npm install"
npm install

Write-Host "→ Docker Postgres"
docker compose up -d
Start-Sleep -Seconds 5

Write-Host "→ Database migrate + seed"
npm run db:migrate
npm run db:seed

@(
    "restoredAt=$(Get-Date -Format o)",
    "backup=$Backup"
) | Set-Content $Marker

Write-Host ""
Write-Host "✓ PC restore complete" -ForegroundColor Green
Write-Host "  Dev start: npm run dev:up"
Write-Host "  Chat import: Cursor Chat Transfer → .cursor\woeschplan-cursor-chats.cursor-chat.json"
