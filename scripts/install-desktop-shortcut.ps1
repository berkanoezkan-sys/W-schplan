# Creates a Woeschplan start shortcut on the Windows Desktop.
# Run once: powershell -ExecutionPolicy Bypass -File .\scripts\install-desktop-shortcut.ps1
$ErrorActionPreference = "Stop"

$Repo = if ($env:WOESCHPLAN_REPO) { $env:WOESCHPLAN_REPO } else { Join-Path $env:USERPROFILE "Woeschplan" }
$Desktop = [Environment]::GetFolderPath("Desktop")
$SourceBat = Join-Path $Repo "desktop\Woeschplan-Start.bat"
$DesktopBat = Join-Path $Desktop "Woeschplan starten.bat"
$ShortcutPath = Join-Path $Desktop "Woeschplan starten.lnk"

if (-not (Test-Path $Repo)) {
    Write-Host "Repo not found: $Repo" -ForegroundColor Red
    Write-Host "Clone first: git clone https://github.com/berkanoezkan-sys/W-schplan.git $Repo"
    exit 1
}

# Write desktop .bat with correct paths for this user
$BackupDir = Join-Path $env:USERPROFILE "iCloudDrive\Berkans Dokumente\Woeschplan-Migration-Backup"
$BatContent = @"
@echo off
title Woeschplan Dev Stack
cd /d "$Repo"
set WOESCHPLAN_BACKUP_DIR=$BackupDir
echo.
echo Starting Woeschplan (Postgres + API + Expo)...
echo Docker Desktop must be running.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "$Repo\scripts\pc-start.ps1"
echo.
pause
"@
Set-Content -Path $DesktopBat -Value $BatContent -Encoding ASCII

# Optional .lnk shortcut (same target, nicer icon in taskbar pin)
$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = $DesktopBat
$Shortcut.WorkingDirectory = $Repo
$Shortcut.WindowStyle = 1
$Shortcut.Description = "Woeschplan dev stack starten"
$Shortcut.Save()

Write-Host ""
Write-Host "[ok] Desktop shortcut installed:" -ForegroundColor Green
Write-Host "  $DesktopBat"
Write-Host "  $ShortcutPath"
Write-Host ""
Write-Host "Doppelklick startet Postgres, API und Expo automatisch."
Write-Host "Docker Desktop vorher starten."
