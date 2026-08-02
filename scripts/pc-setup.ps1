# Woeschplan - first-time setup on Windows (PowerShell)
# Run from repo root: .\scripts\pc-setup.ps1
$ErrorActionPreference = "Stop"
$Root = Split-Path (Split-Path $MyInvocation.MyCommand.Path -Parent) -Parent
Set-Location $Root

Write-Host "Woeschplan PC setup" -ForegroundColor Cyan
Write-Host "Repo: $Root"
Write-Host ""

function Test-Command($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

$missing = @()
foreach ($cmd in @("git", "node", "npm", "docker")) {
    if (-not (Test-Command $cmd)) { $missing += $cmd }
}

if ($missing.Count -gt 0) {
    Write-Host "Missing tools: $($missing -join ', ')" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Install (run as Admin if needed):"
    Write-Host "  winget install Git.Git OpenJS.NodeJS.LTS Docker.DockerDesktop"
    Write-Host ""
    Write-Host "Recommended: use WSL2 for the same bash scripts as on Mac."
    Write-Host "  wsl --install"
    Write-Host "  See docs/MIGRATION-PC.md"
    exit 1
}

if (-not (Test-Path "apps/api/.env")) {
    Copy-Item "apps/api/.env.example" "apps/api/.env"
    Write-Host "Created apps/api/.env from example"
}
if (-not (Test-Path "apps/mobile/.env")) {
    Copy-Item "apps/mobile/.env.example" "apps/mobile/.env"
    Write-Host "Created apps/mobile/.env from example"
    Write-Host "Update EXPO_PUBLIC_API_URL with your PC LAN IP (ipconfig)"
}

Write-Host "Installing npm dependencies..."
npm install

Write-Host "Starting Postgres..."
docker compose up -d

Write-Host "Waiting for Postgres..."
Start-Sleep -Seconds 5

Write-Host "Running migrations and seed..."
npm run db:migrate
npm run db:seed

Write-Host ""
Write-Host "Setup complete." -ForegroundColor Green
Write-Host "Start dev stack:"
Write-Host "  npm run dev:up          (Git Bash or WSL recommended)"
Write-Host "  npm run dev:status"
Write-Host ""
Write-Host "Restore .env from Mac backup if you have one:"
Write-Host "  backup/env/apps-api.env   -> apps/api/.env"
Write-Host "  backup/env/apps-mobile.env -> apps/mobile/.env"
