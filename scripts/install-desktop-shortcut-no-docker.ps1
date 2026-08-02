# Desktop shortcut for Woeschplan WITHOUT Docker.
$ErrorActionPreference = "Stop"
$Repo = if ($env:WOESCHPLAN_REPO) { $env:WOESCHPLAN_REPO } else { Join-Path $env:USERPROFILE "Woeschplan" }
$Desktop = [Environment]::GetFolderPath("Desktop")
$DesktopBat = Join-Path $Desktop "Woeschplan starten (ohne Docker).bat"

$BatContent = @"
@echo off
title Woeschplan (ohne Docker)
cd /d "$Repo"
echo.
echo Starte Woeschplan ohne Docker...
echo DATABASE_URL muss in apps\api\.env stehen (Neon).
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "$Repo\scripts\pc-start-no-docker.ps1"
pause
"@
Set-Content -Path $DesktopBat -Value $BatContent -Encoding ASCII

Write-Host ""
Write-Host "[ok] Desktop-Verknuepfung erstellt:" -ForegroundColor Green
Write-Host "  $DesktopBat"
Write-Host ""
Write-Host "Vorher: DATABASE_URL in apps/api/.env setzen (Neon — siehe docs/OHNE-DOCKER.md)"
