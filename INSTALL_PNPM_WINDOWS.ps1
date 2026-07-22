$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

Write-Host "=== CNTT Award Review System - PNPM Setup ===" -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw "Khong tim thay Node.js. Hay cai Node.js 22 hoac 24 truoc."
}

if (-not (Get-Command corepack -ErrorAction SilentlyContinue)) {
  throw "Khong tim thay Corepack. Hay cai Node.js 22/24 ban day du."
}

Write-Host "Node: $(node --version)" -ForegroundColor Green

Write-Host "Dang kich hoat pnpm 10.34.5 bang Corepack..." -ForegroundColor Yellow
corepack enable
corepack prepare pnpm@10.34.5 --activate

Write-Host "pnpm: $(pnpm --version)" -ForegroundColor Green

Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

Write-Host "Dang cai dependencies bang pnpm..." -ForegroundColor Yellow
pnpm install --no-frozen-lockfile

Write-Host "Dang kiem tra TypeScript..." -ForegroundColor Yellow
pnpm typecheck

Write-Host ""
Write-Host "CAI DAT THANH CONG" -ForegroundColor Green
Write-Host "Chay he thong bang: pnpm dev" -ForegroundColor Cyan
