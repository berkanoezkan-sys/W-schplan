@echo off
title Woeschplan Dev Stack
cd /d "C:\Users\moezkan\Woeschplan"
set WOESCHPLAN_BACKUP_DIR=C:\Users\moezkan\iCloudDrive\Berkans Dokumente\Woeschplan-Migration-Backup
echo.
echo Starting Woeschplan (Postgres + API + Expo)...
echo Docker Desktop must be running.
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "C:\Users\moezkan\Woeschplan\scripts\pc-start.ps1"
echo.
pause
